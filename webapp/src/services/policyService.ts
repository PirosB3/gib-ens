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
  voucherContractAddress: z.string().startsWith('0x'),
  ensControllerContractAddress: z.string().startsWith('0x'),
  ensResolverContractAddress: z.string().startsWith('0x'),
  voucherValiditySeconds: z.number().int().positive(),
});

export type PolicyConfig = z.infer<typeof PolicySchema>;

const defaultPolicy: Partial<PolicyConfig> = {
    voucherValiditySeconds: 10 * 60,
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
        "voucherContractAddress": process.env.ETHNY2023_VOUCHER_CONTRACT_ADDRESS,
        "ensControllerContractAddress": process.env.ETHNY2023_ENS_CONTROLLER_CONTRACT_ADDRESS,
        "ensResolverContractAddress": process.env.ETHNY2023_ENS_RESOLVER_CONTRACT_ADDRESS,
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