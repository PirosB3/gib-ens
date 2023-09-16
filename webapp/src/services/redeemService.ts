import { Provider, uuidV4 } from "ethers";
import { hexlify } from "ethers/utils";
import { ENSService } from "./ensService";
import { PolicyConfig } from "./policyService";
import { VoucherService } from "./voucherService";
import { IService, VoucherAvailable } from "@/base/types";
import { v1 } from "uuid";
import { kv } from "@vercel/kv";
import { DomainRedeemOperation, DomainRedeemOperationSchema } from "@/base/userOps/base";
import BigNumber from "bignumber.js";

// 30 minutes
const EXPIRE_SECONDS = 30 * 60;

export class RedeemService implements IService {
    public static fromVoucherAndENS(voucher: VoucherService, ens: ENSService): RedeemService {
        return new RedeemService(ens, ens.getProvider(), ens.getConfig());
    }

    constructor(
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

    public makeCurrentRedeemForUserAndEventKey(owner: string, policyId: string): string {
        return `currentRedeem:${owner}:${policyId}`;
    }

    public makeJobIdKey(jobId: string): string {
        return `redeem:${jobId}`;
    }

    private makeKeys(operation: DomainRedeemOperation): { currentRedeemForUserAndEvent: string, redeemUidKey: string } {
        const { owner, policyId } = operation.params;
        const { id } = operation;
        const currentRedeemKey = this.makeCurrentRedeemForUserAndEventKey(owner, policyId);
        const redeemUidKey = this.makeJobIdKey(id)
        return { currentRedeemForUserAndEvent: currentRedeemKey, redeemUidKey };
    }

    public async getRedeemById(jobId: string): Promise<DomainRedeemOperation | null> {
        const redeemUidKey = this.makeJobIdKey(jobId)
        const key = await kv.get<string>(redeemUidKey);
        if (!key) {
            return null;
        }
        const value = await kv.get<object>(key);
        if (!value) {
            return null;
        }
        return DomainRedeemOperationSchema.parse(value);
    }

    public async getCurrentRedeemForUser(owner: string): Promise<DomainRedeemOperation | null> {
        const key = this.makeCurrentRedeemForUserAndEventKey(owner, this.config.policyId);
        const value = await kv.get<object>(key);
        if (!value) {
            return null;
        }
        return DomainRedeemOperationSchema.parse(value);
    }

    public async startRedeemProcess(availability: VoucherAvailable): Promise<DomainRedeemOperation> {
        const ensDomain = this.ens.getEnsParamsStruct({
            _owner: availability.voucher.owner,
            name: availability.ens.purchaseInfo.normalizedDomainName,
            duration: availability.ens.purchaseInfo.duration,
        });
        const domainRedeemOperation: DomainRedeemOperation = DomainRedeemOperationSchema.parse({
            id: v1(),
            params: {
                owner: availability.voucher.owner,
                policyId: availability.voucher.policyId,
                normalizedDomainName: availability.ens.purchaseInfo.normalizedDomainName,
            },
            ens: {
                name: ensDomain.name,
                _owner: ensDomain._owner.toString(),
                duration: new BigNumber(ensDomain.duration.toString()).toNumber(),
                secret: hexlify(ensDomain.secret),
                resolver: ensDomain.resolver.toString(),
                data: ensDomain.data.map(data => data.toString()),
                reverseRecord: ensDomain.reverseRecord,
                ownerControlledFuses: new BigNumber(ensDomain.ownerControlledFuses.toString()).toNumber(),
            },
            userOps: [
                { id: v1(), type: 'ensCommitment' },
                { id: v1(), type: 'completeENSRegistration' },
            ],
        });

        const {currentRedeemForUserAndEvent, redeemUidKey } = this.makeKeys(domainRedeemOperation);
        const isSuccessful = await kv.setnx(currentRedeemForUserAndEvent, JSON.stringify(domainRedeemOperation));
        if (isSuccessful === 0) {
            throw new Error('Redeem process already started. Wait for it to expire');
        }
        await kv.expire(currentRedeemForUserAndEvent, EXPIRE_SECONDS);
        await kv.set(redeemUidKey, currentRedeemForUserAndEvent);
        return domainRedeemOperation;
    }

}