import { redirect } from "next/navigation"
import { PolicyConfig } from "./policyService"

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


export class AlchemyGasManagerService {
    private readonly rpcUrl: string
    constructor(private readonly config: PolicyConfig) {
        this.rpcUrl = `https://manage.g.alchemy.com/api/gasManager/policy/${config.alchemyGasPolicy}`;
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