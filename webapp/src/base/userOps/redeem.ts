import { ENSParamsZod, ENSService } from "@/services/ensService";
import { DomainRedeemOperation, Operation, Operator } from "./base";
import { z } from 'zod';
import { EthereumAddress, UserOperationAndHash, UserOperationAndHashBundle } from "../types";
import { UserOperationService } from "@/services/userOperationService";
import { VoucherService } from "@/services/voucherService";
import { kv } from "@vercel/kv";



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
        // Check if finalized states have been reached
        const userOpFromCache = await this.getUserOpFromCache(jobId);
        if (userOpFromCache) {
            const receipt = await this.userOp.getUserOperationReceipt(userOpFromCache.hash);
            if (receipt?.success) {
                return {
                    status: 'complete',
                    userOpHash: userOpFromCache.hash,
                    message: 'Domain registration process completed',
                }
            }
        }

        // Simply check if the voucher has been redeemed already before proceeding
        const alreadyRedeemed = await this.voucher.isAlreadyRedeemed(redeem.params.owner, redeem.params.policyId);
        if (alreadyRedeemed) {
            return { status: 'complete', message: 'You already redeemed a domain' };
        }

        // Generating User Op is expensive, try to defer this as much as possible by checking pending states
        const commitment = await this.ens.getCommitmentHash(redeem.ens);
        const finalizationInformation = await this.ens.getFinalizationInformation(commitment);
        if (finalizationInformation.status === "notFound") {
            return { status: 'pending', message: 'ENS commitment has not yet been seen on-chain' };
        }
        if (finalizationInformation.status === "pending") {
            return { status: 'pending', message: `ENS commitment will be settled at ${new Date(finalizationInformation.settlesAt * 1000).toLocaleString()}` };
        }

        // Generate User op
        const userOps = userOpFromCache ?? await this.generateUserOperation(redeem, jobId);
        const { hash, userOp } = userOps;
        return {
            status: 'ready',
            userOp,
            hash,
        }
    }
}
