import { PolicyConfig } from "./policyService"
import { EthereumAddress, EthereumBytes, UserOperationStruct, UserOperationZod } from "@/base/types"
import { ENTRYPOINT_ADDRESS } from "./userOperationService"
import { AlchemyProvider, Network } from "ethers"
import { z } from "zod"

export interface PolicyRoot {
    data: Data
}

interface Data {
    policy: Policy
}

interface Policy {
    policyId: string
    appId: string
    status: string
    rules: Rules
}

interface Rules {
    maxSpendUsd: string
    maxSpendPerSenderUsd: string
    maxCount: string
    maxCountPerSender: string
    senderAllowlist: string[]
    senderBlocklist: string[]
    startTimeUnix: string
    endTimeUnix: string
    maxSpendPerUoUsd: string
    sponsorshipExpiryMs: string
}

const UserOperationReceiptSchema = z.object({
    userOpHash: EthereumBytes,
    entryPoint: EthereumAddress,
    sender: EthereumAddress,
    nonce: EthereumBytes,
    paymaster: EthereumAddress,
    actualGasCost: EthereumBytes,
    actualGasUsed: EthereumBytes,
    success: z.boolean(),
    reason: z.string(),
});

export type UserOperationReceipt = z.infer<typeof UserOperationReceiptSchema>;

const DUMMY_SIGNATURE = '0xe8fe34b166b64d118dccf44c7198648127bf8a76a48a042862321af6058026d276ca6abb4ed4b60ea265d1e57e33840d7466de75e13f072bbd3b7e64387eebfe1b';

export class AlchemyGasManagerService {
    private readonly rpcUrl: string
    constructor(private readonly config: PolicyConfig, private readonly provider: AlchemyProvider) {
        this.rpcUrl = `https://manage.g.alchemy.com/api/gasManager/policy/${config.alchemyGasPolicy}`;
    }

    public async getUserOperationReceipt(userOperationHash: string): Promise<UserOperationReceipt | undefined> {
        console.log("BEFORE!");
        const response = await this.provider.send(
            'eth_getUserOperationReceipt', [ userOperationHash ]
        );
        if (response === null) return undefined;

        const parsed = UserOperationReceiptSchema.parse(response);
        return parsed;
    }

    public async requestGasAndPaymasterAndData(
        userOp: Pick<UserOperationStruct, "callData" | "nonce" | "initCode" | "sender">
    ): Promise<UserOperationStruct> {
        const { callData, nonce, initCode, sender } = userOp;
        const response = await this.provider.send('alchemy_requestGasAndPaymasterAndData', [
            {
                policyId: this.config.alchemyGasPolicy,
                entryPoint: ENTRYPOINT_ADDRESS,
                dummySignature: DUMMY_SIGNATURE,
                userOperation: {
                    sender,
                    nonce,
                    initCode,
                    callData,
                }
            }
        ])
        const { maxFeePerGas, maxPriorityFeePerGas, paymasterAndData, verificationGasLimit, callGasLimit, preVerificationGas } = response;
        return UserOperationZod.parse({
            sender,
            nonce,
            initCode,
            callData,
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
            paymasterAndData,
            signature: '0x',
        })
    }
}