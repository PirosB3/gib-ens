import { ENSParamsZod, ENSService } from "@/services/ensService";
import { DomainRedeemOperation, Operation, Operator } from "./base";
import { z } from 'zod';
import { EthereumAddress, UserOperationZod } from "../types";
import { UserOperationService } from "@/services/userOperationService";
import { VoucherService } from "@/services/voucherService";
import { kv } from "@vercel/kv";



export class RedeemOperation implements Operator {
    constructor(
        private readonly userOp: UserOperationService,
        private readonly ens: ENSService,
        private readonly voucher: VoucherService,
    ) { }

    async getStatus(redeem: DomainRedeemOperation): Promise<Operation> {
        const commitment = await this.ens.getCommitmentHash(redeem.ens);
        const isSettled = await this.ens.isCommitmentSettled(commitment);
        if (!isSettled) {
            return { status: 'pending', message: 'ENS commitment not settled' };
        }

        const alreadyRedeemed = await this.voucher.isAlreadyRedeemed(redeem.params.owner, redeem.params.policyId);
        if (alreadyRedeemed) {
            return { status: 'complete' };
        }

        const domainAvailability = await this.voucher.getDomainAvailability({
            domain: redeem.ens.name,
            owner: redeem.params.owner,
            policyId: redeem.params.policyId,
        });
        if (!domainAvailability.isAvailable) {
            throw new Error(`Domain ${redeem.ens.name} is not available`);
        }

        const redeemUserOp = await kv.get(`redeem:${commitment}`);
        if (redeemUserOp) {
            const parsed = UserOperationZod.parse(redeemUserOp);
            return {
                status: 'ready',
                userOps: parsed,
            }
        }
        const { tx } = await this.voucher.getCompleteENSRegistrationTransaction(domainAvailability, redeem.ens);
        const userOps = await this.userOp.getUserOperation(redeem.params.owner, tx);
        const isSuccessful = await kv.setnx(`redeem:${commitment}`, JSON.stringify(userOps));
        if (isSuccessful === 0) {
            throw new Error('Could not set redeem in KV');
        }
        return {
            status: 'ready',
            userOps,
        }

    }
}