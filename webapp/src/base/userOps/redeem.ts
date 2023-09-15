import { ENSService } from "@/services/ensService";
import { DomainRedeemOperation, Operation, Operator } from "./base";
import { UserOperationAndHash, UserOperationAndHashBundle } from "../types";
import { UserOperationService } from "@/services/userOperationService";
import { VoucherService } from "@/services/voucherService";
import { kv } from "@vercel/kv";
import { floor, now } from "lodash";



export class RedeemOperation implements Operator {
    constructor(
        private readonly userOp: UserOperationService,
        private readonly ens: ENSService,
        private readonly voucher: VoucherService,
    ) { }

    makeKey(jobId: string) {
        return `redeem:${jobId}`;
    }

    async getUserOpFromCache(jobId: string): Promise<UserOperationAndHash | undefined> {
        const redeemUserOp = await kv.get(this.makeKey(jobId));
        if (!redeemUserOp) {
            return undefined;
        }
        return UserOperationAndHashBundle.parse(redeemUserOp);
    }

    async generateUserOperation(redeem: DomainRedeemOperation, jobId: string): Promise<UserOperationAndHash> {
        const domainAvailability = await this.voucher.getDomainAvailability({
            domain: redeem.ens.name,
            owner: redeem.params.owner,
            policyId: redeem.params.policyId,
        });
        if (!domainAvailability.isAvailable) {
            throw new Error(`Domain ${redeem.ens.name} is not available`);
        }
        const { tx } = await this.voucher.getCompleteENSRegistrationTransaction(domainAvailability, redeem.ens);
        const userOps = await this.userOp.getUserOperation(redeem.params.owner, tx);
        const isSuccessful = await kv.setnx(this.makeKey(jobId), JSON.stringify(userOps));
        if (isSuccessful === 0) {
            throw new Error('Could not set redeem in KV');
        }
        return userOps;
    }

    async getStatus(redeem: DomainRedeemOperation, jobId: string): Promise<Operation> {
        const partial: Pick<Operation, "id" | "type"> = {
            id: jobId,
            type: 'completeENSRegistration',
        }

        // Check if finalized states have been reached
        const userOpFromCache = await this.getUserOpFromCache(jobId);
        if (userOpFromCache) {
            const receipt = await this.userOp.getUserOperationReceipt(userOpFromCache.hash);
            if (receipt?.success) {
                return {
                    ...partial,
                    status: 'complete',
                    userOpHash: userOpFromCache.hash,
                    reason: 'userOpSuccessful',
                }
            }
        }

        // Simply check if the voucher has been redeemed already before proceeding
        const alreadyRedeemed = await this.voucher.isAlreadyRedeemed(redeem.params.owner, redeem.params.policyId);
        if (alreadyRedeemed) {
            return {
                ...partial,
                status: 'complete',
                reason: 'alreadyRedeemedAnotherDomain',
            }
        }

        // Generating User Op is expensive, try to defer this as much as possible by checking pending states
        const commitment = await this.ens.getCommitmentHash(redeem.ens);
        const finalizationInformation = await this.ens.getFinalizationInformation(commitment);
        if (finalizationInformation.status === "notFound") {
            return {
                ...partial,
                status: 'pending',
                reason: 'ensCommitmentNotOnchainYet',
            }
        }
        if (finalizationInformation.status === "pending") {
            const { settlesAt, startedProcessAt } = finalizationInformation;
            
            const nowSeconds = now() / 1000;
            const elapsed = nowSeconds - startedProcessAt;
            const remaining = settlesAt - startedProcessAt;
            const pctComplete = floor((elapsed / remaining) * 100);
            return {
                ...partial,
                status: 'pending',
                reason: 'ensCommitmentNotSettled',
                pctComplete,
            }
        }

        // Generate User op
        const userOps = userOpFromCache ?? await this.generateUserOperation(redeem, jobId);
        const { hash, userOp } = userOps;
        return {
            ...partial,
            status: 'ready',
            userOp,
            hash,
        }
    }
}
