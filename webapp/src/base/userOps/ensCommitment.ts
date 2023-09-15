import { ENSService } from "@/services/ensService";
import { UserOperationService } from "@/services/userOperationService";
import { kv } from "@vercel/kv";
import { UserOperationAndHash, UserOperationAndHashBundle } from "../types";
import { DomainRedeemOperation, Operation, Operator } from "./base";

export class EnsCommitmentOperation implements Operator {
    constructor(
        private readonly userOp: UserOperationService,
        private readonly ens: ENSService,
    ) { }

    makeKey(commitment: string) {
        return `ensCommitment:${commitment}`;
    }

    async getUserOpFromCache(commitment: string): Promise<UserOperationAndHash | undefined> {
        const commitUserOp = await kv.get(this.makeKey(commitment));
        if (!commitUserOp) {
            return undefined;
        }
        return UserOperationAndHashBundle.parse(commitUserOp);
    }

    async getUserOperation(redeem: DomainRedeemOperation): Promise<UserOperationAndHash> {
        const commitment = await this.ens.getCommitmentHash(redeem.ens);
        const userOperation = await this.getUserOpFromCache(commitment);
        if (userOperation) {
            return userOperation;
        }
        const { tx } = await this.ens.getCommitTransaction(redeem.ens);
        const userOps = await this.userOp.getUserOperation(redeem.params.owner, tx);
        const isSuccessful = await kv.setnx(this.makeKey(commitment), JSON.stringify(userOps));
        if (isSuccessful === 0) {
            throw new Error('Could not set ensCommitment in KV');
        }
        return userOps;
    }

    async getStatus(redeem: DomainRedeemOperation, jobId: string): Promise<Operation> {
        const userOps = await this.getUserOperation(redeem);
        const receipt = await this.userOp.getUserOperationReceipt(userOps.hash);
        if (receipt?.success) {
            return {
                id: jobId,
                type: 'ensCommitment',
                status: 'complete',
                userOpHash: userOps.hash,
                reason: 'userOpSuccessful',
            }
        }

        // If not from cache, create now
        const { hash, userOp } = userOps;
        return {
            id: jobId,
            type: 'ensCommitment',
            status: 'ready',
            userOp,
            hash,
        }
    }

}