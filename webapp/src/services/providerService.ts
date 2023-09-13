import { Network } from "ethers";
import { ethers } from "ethers";
import { PolicyConfig } from "./policyService";
import { AlchemyProvider } from "ethers";

export function getEthersProvider(config: PolicyConfig): AlchemyProvider {
    const network = Network.from(config.networkId)
    return new ethers.AlchemyProvider(network, config.alchemyApiKey);
}