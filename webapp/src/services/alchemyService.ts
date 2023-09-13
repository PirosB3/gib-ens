import { redirect } from "next/navigation"
import { PolicyConfig } from "./policyService"
import { UserOperationStruct, UserOperationZod } from "@/base/types"
import { ENTRYPOINT_ADDRESS } from "./userOperationService"
import { AlchemyProvider, Network } from "ethers"

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

interface AlchemySponsorTransactionResponse {
    jsonrpc: string;
    id: number;
    result: {
        maxPriorityFeePerGas: string;
        maxFeePerGas: string;
        paymasterAndData: string;
        verificationGasLimit: string;
        callGasLimit: string;
        preVerificationGas: string;
    };
}

// sleep function
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export class AlchemyGasManagerService {
    private readonly rpcUrl: string
    constructor(private readonly config: PolicyConfig) {
        this.rpcUrl = `https://manage.g.alchemy.com/api/gasManager/policy/${config.alchemyGasPolicy}`;
    }

    public async requestGasAndPaymasterAndData(
        userOp: Pick<UserOperationStruct, "callData" | "nonce" | "initCode" | "sender">
    ): Promise<UserOperationStruct> {
        await sleep(5000);
        const { callData, nonce, initCode, sender } = userOp;
        const options = {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({
                id: 1,
                jsonrpc: '2.0',
                method: 'alchemy_requestGasAndPaymasterAndData',
                params: [
                    {
                        policyId: this.config.alchemyGasPolicy,
                        entryPoint: ENTRYPOINT_ADDRESS,
                        dummySignature: '0xe8fe34b166b64d118dccf44c7198648127bf8a76a48a042862321af6058026d276ca6abb4ed4b60ea265d1e57e33840d7466de75e13f072bbd3b7e64387eebfe1b',
                        userOperation: {
                            sender,
                            nonce,
                            initCode,
                            callData,
                        }
                    }
                ]
            })
        };
        const network = Network.from(this.config.networkId);
        const req = AlchemyProvider.getRequest(network, this.config.alchemyApiKey);
        const response = await fetch(req.url, options);
        const json: AlchemySponsorTransactionResponse = await response.json();
        console.log('json', json);
        const { maxFeePerGas, maxPriorityFeePerGas, paymasterAndData, verificationGasLimit, callGasLimit, preVerificationGas } = json.result;
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

    public async getWhitelist(): Promise<Set<string>> {
        const result = await fetch(this.rpcUrl, {
            next: { revalidate: 3600 },
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                "authorization": `Bearer ${this.config.alchemyGasBearerToken}`
            },
        })
        const { data } = await result.json() as PolicyRoot;
        if (data.policy.status !== 'active') {
            return new Set();
        }
        return new Set(data.policy.rules.senderAllowlist.map((address: string) => address.toLowerCase()));
    }
}

export async function enforceWhitelist(config: PolicyConfig, address: string, redirectTo='/') {
    const service = new AlchemyGasManagerService(config);
    const whitelist = await service.getWhitelist();
    if (!whitelist.has(address.toLowerCase())) {
        redirect(redirectTo)
    };
}