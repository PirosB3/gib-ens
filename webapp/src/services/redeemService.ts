import { Provider, uuidV4 } from "ethers";
import { ENSService } from "./ensService";
import { PolicyConfig } from "./policyService";
import { VoucherService } from "./voucherService";
import { IService, VoucherAvailable } from "@/base/types";
import { v1 } from "uuid";
import { kv } from "@vercel/kv";

import { z } from 'zod';

const jobSchema = z.object({
  type: z.enum(['ensCommitment', 'completeEnsRegistration']),
  id: z.string().uuid(),
  tx: z.object({
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    gasLimit: z.string().optional(),
    value: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
    data: z.string().regex(/^0x[a-fA-F0-9]+$/),
  }),
});

const redeemJobSchema = z.object({
  id: z.string().uuid(),
  voucher: z.object({
    policyId: z.string(),
    owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    normalizedDomainName: z.string(),
  }),
  jobs: z.array(jobSchema),
});

// 30 minutes
const EXPIRE_SECONDS = 30 * 60;

export type JobSchema = z.infer<typeof jobSchema>;
export type RedeemJobSchema = z.infer<typeof redeemJobSchema>;

export class RedeemService implements IService {
    public static fromVoucherAndENS(voucher: VoucherService, ens: ENSService): RedeemService {
        return new RedeemService(voucher, ens, ens.getProvider(), ens.getConfig());
    }

    constructor(
        private readonly voucher: VoucherService,
        private readonly ens: ENSService,
        private readonly provider: Provider,
        private readonly config: PolicyConfig,
    ){}

    getConfig(): PolicyConfig {
        return this.config;
    }

    getProvider(): Provider {
        return this.provider;
    }

    private makeKey(owner: string, policyId: string): string {
        return `currentRedeem:${owner}:${policyId}`;
    }

    public async getCurrentRedeemForUser(owner: string, policyId: string): Promise<RedeemJobSchema | null> {
        const key = this.makeKey(owner, policyId);
        const value = await kv.get<object>(key);
        if (!value) {
            return null;
        }
        return redeemJobSchema.parse(value);
    }


    public async startRedeemProcess(availability: VoucherAvailable): Promise<RedeemJobSchema> {
        const transactions = await this.voucher.createTransactions(availability);
        const jobs: JobSchema[] = transactions.map(txAndType => {
            const { tx, type } = txAndType;
            return jobSchema.parse({
                id: v1(),
                type,
                tx: {
                    to: tx.to,
                    gasLimit: tx.gasLimit?.toString(),
                    value: tx.value?.toString(16),
                    data: tx.data,
                },
            });
        });
        const redeemJob: RedeemJobSchema = redeemJobSchema.parse({
            id: v1(),
            voucher: {
                policyId: availability.voucher.policyId,
                owner: availability.voucher.owner,
                normalizedDomainName: availability.ens.purchaseInfo.normalizedDomainName,
            },
            jobs,
        });

        const key = this.makeKey(availability.voucher.owner, availability.voucher.policyId);
        const isSuccessful = await kv.setnx(key, JSON.stringify(redeemJob));
        if (isSuccessful === 0) {
            throw new Error('Redeem process already started');
        }
        await kv.expire(key, EXPIRE_SECONDS);
        return redeemJob;
    }

}