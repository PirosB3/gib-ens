import { redirect } from 'next/navigation'
import { z } from 'zod';

const PolicySchema = z.object({
  policyId: z.string(),
  alchemyGasPolicy: z.string(),
  alchemyGasBearerToken: z.string(),
  networkId: z.enum(['goerli', 'mainnet']),
  alchemyApiKey: z.string(),
  registerDomainForSeconds: z.number().int().positive(),
  maxPurchasePriceEth: z.number().positive(),
  sponsorshipContractAuthorityPk: z.string().startsWith('0x'),
});

export type PolicyConfig = z.infer<typeof PolicySchema>;

const defaultPolicy: Partial<PolicyConfig> = {
    registerDomainForSeconds: 60 * 60 * 24 * 365,
    maxPurchasePriceEth: 0.004,
}


const POLICIES: { [key: string]: any } = {
    "ETHNewYork2023": {
        "alchemyGasPolicy": process.env.ETHNY2023_ALCHEMY_POLICY_ID,
        "networkId": process.env.ETHNY2023_NETWORK_NAME,
        "alchemyApiKey": process.env.ETHNY2023_ALCHEMY_API_KEY,
        "alchemyGasBearerToken": process.env.ETHNY2023_ALCHEMY_BEARER_TOKEN,
        "sponsorshipContractAuthorityPk": process.env.ETHNY2023_SPONSORSHIP_CONTRACT_AUTHORITY_PK,
    }
}

export function getPolicySetting(policyId: string): PolicyConfig {
    const policy = POLICIES[policyId];
    if (!policy) {
        throw new Error(`Policy ${policyId} not found`);
    }
    const parsedConfig = PolicySchema.parse({
        policyId,
        ...defaultPolicy,
        ...policy,
    });
    return parsedConfig;
}

export function getPolicySettingOrRedirect(policyId: string, redirectUrl='/'): PolicyConfig {
    try {
        return getPolicySetting(policyId);
    } catch (e) {
        redirect(redirectUrl);
    }
}