import { PolicyConfig } from "@/services/policyService";
import { Provider, ethers } from "ethers";

export interface IService {
    getConfig(): PolicyConfig;
    getProvider(): Provider;
}

type ENSUnavailableReason = "unavailable" | "expensive" | "invalid";

export interface ENSAvailable {
    isAvailable: true;
    purchaseInfo: {
        normalizedDomainName: string;
        price: string;
        duration: number;
    };
}

export interface ENSUnavailable {
    isAvailable: false;
    reason: ENSUnavailableReason;
}

export type ENSAvailabilityResult = ENSAvailable | ENSUnavailable;

type VoucherUnavailableReason = ENSUnavailableReason | "alreadyRegistered";

export interface VoucherAvailable {
    isAvailable: true;
    ens: ENSAvailable;
    voucher: {
        policyId: string;
        owner: string;
    };
}

export interface VoucherUnavailable {
    isAvailable: false;
    reason: VoucherUnavailableReason;
}

export type VoucherAvailabilityResult = VoucherAvailable | VoucherUnavailable;

export type TxForUserOperation = Pick<ethers.ContractTransaction, "data" | "value" | "to" | "gasLimit">;

export interface TxAndType {
    type: 'ensCommitment' | 'completeEnsRegistration';
    tx: TxForUserOperation;
}