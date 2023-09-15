import { ENSParamsZod } from "@/services/ensService";
import { EthereumAddress, UserOperationAndHash, UserOperationStruct } from "../types";
import { z } from 'zod';
import { ServiceFactory } from "@/services/serviceFactory";
import { RedeemOperation } from "./redeem";
import { EnsCommitmentOperation } from "./ensCommitment";

export const OperationTypeSchema = z.enum(["ensCommitment", "completeENSRegistration"]);
export type OperationType = z.infer<typeof OperationTypeSchema>;
export type OperationStatus = 'ready' | 'complete' | 'pending';

interface BaseOperation {
    id: string;
    type: OperationType;
    status: OperationStatus;
}

export interface ReadyOperation extends BaseOperation {
    status: 'ready',
    userOp: UserOperationStruct,
    hash: string,
}

export interface PendingOperation extends BaseOperation {
    status: 'pending',
    reason: 'ensCommitmentNotOnchainYet' | 'ensCommitmentNotSettled'
    pctComplete?: number,
}

export interface CompleteOperation extends BaseOperation {
    status: 'complete',
    userOpHash?: string,
    reason: 'userOpSuccessful' | 'alreadyRedeemedAnotherDomain'
}

export type Operation = ReadyOperation | PendingOperation | CompleteOperation;

export const DomainRedeemOperationSchema = z.object({
    id: z.string().uuid(),
    params : z.object({
        policyId: z.string(),
        owner: EthereumAddress,
        normalizedDomainName: z.string(),
    }),
    ens: ENSParamsZod,
    userOps: z.array(z.object({
        id: z.string().uuid(),
        type: OperationTypeSchema,
    }))
});

export type DomainRedeemOperation = z.infer<typeof DomainRedeemOperationSchema>;

export interface Operator {
    getStatus(redeemOperation: DomainRedeemOperation, jobId: string): Promise<Operation>;
}


export async function getOperatorFromJobId(services: ServiceFactory, domainRedeemOptions: DomainRedeemOperation, jobId: string): Promise<Operator> {
    const job = domainRedeemOptions.userOps.find((job) => job.id === jobId);
    if (!job) {
        throw new Error(`Unknown job ID ${jobId}`);
    }

    const userOpService = await services.getUserOperationService();
    const ensService = await services.getEns();
    let operator: Operator;
    switch (job?.type) {
        case 'completeENSRegistration':
            const voucherService = await services.getVoucherService();
            operator = new RedeemOperation(userOpService, ensService, voucherService);
            break;
        case 'ensCommitment':
            operator = new EnsCommitmentOperation(userOpService, ensService);
            break;
        default:
            throw new Error(`Unknown job type ${job?.type}`);
    }
    return operator;
}

