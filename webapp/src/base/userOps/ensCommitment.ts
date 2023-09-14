import { ENSService } from "@/services/ensService";
import { UserOperationService } from "@/services/userOperationService";
import { kv } from "@vercel/kv";
import { UserOperationAndHashBundle } from "../types";
import { DomainRedeemOperation, Operation, Operator } from "./base";

export class EnsCommitmentOperation implements Operator {
    constructor(
        private readonly userOp: UserOperationService,
        private readonly ens: ENSService,
    ) { }

    async getStatus(redeem: DomainRedeemOperation): Promise<Operation> {
        const { ens, params } = redeem;
        const commitment = await this.ens.getCommitmentHash(ens);
        const isSettled = await this.ens.isCommitmentSettled(commitment);
        if (isSettled) {
            return { status: 'complete' };
        }

        const commitUserOp = await kv.get(`ensCommitment:${commitment}`);
        if (commitUserOp) {
            const { hash, userOp } = UserOperationAndHashBundle.parse(commitUserOp);
            return {
                status: 'ready',
                userOp,
                hash,
            }
        }

        // If not from cache, create now
        const { tx } = await this.ens.getCommitTransaction(ens);
        const userOps = await this.userOp.getUserOperation(params.owner, tx);
        const isSuccessful = await kv.setnx(`ensCommitment:${commitment}`, JSON.stringify(userOps));
        if (isSuccessful === 0) {
            throw new Error('Could not set ensCommitment in KV');
        }
        const { hash, userOp } = userOps;
        return {
            status: 'ready',
            userOp,
            hash,
        }
    }

}