import { Network } from "ethers";
import { Provider, ethers } from "ethers";
import { PolicyConfig } from "./policyService";

export function getEthersProvider(config: PolicyConfig): Provider {
    const network = Network.from(config.networkId)
    return new ethers.AlchemyProvider(network, config.alchemyApiKey);
}