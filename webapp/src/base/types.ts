import { PolicyConfig } from "@/services/policyService";
import { Provider, ethers } from "ethers";

import { z } from 'zod';

export const EthereumAddress = z.string().refine(
    address => /^0x[0-9a-fA-F]{40}$/.test(address),
    {
        message: "Invalid Ethereum address: must start with '0x', have a length of 42, and contain only hex chars",
    }
);

export const EthereumBytes = z.string().refine(
    value => /^0x[0-9a-fA-F]*$/.test(value),
    {
        message: "Invalid bytes format: must start with '0x' and contain only hex chars",
    }
);

export const EthereumBytes32 = z.string().refine(
    value => /^0x[0-9a-fA-F]{64}$/.test(value),
    {
        message: "Invalid EthereumBytes32 format: must start with '0x' and contain exactly 64 hex chars",
    }
);

export const UserOperationZod = z.object({
    sender: EthereumAddress,
    nonce: EthereumBytes,
    initCode: EthereumBytes,
    callData: EthereumBytes,
    callGasLimit: EthereumBytes,
    verificationGasLimit: EthereumBytes,
    preVerificationGas: EthereumBytes,
    maxFeePerGas: EthereumBytes,
    maxPriorityFeePerGas: EthereumBytes,
    paymasterAndData: EthereumBytes,
    signature: EthereumBytes,
});

export const UserOperationAndHashBundle = z.object({
    userOp: UserOperationZod,
    hash: EthereumBytes32,
});

export type UserOperationStruct = z.infer<typeof UserOperationZod>;
export type UserOperationAndHash = z.infer<typeof UserOperationAndHashBundle>;



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