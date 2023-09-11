import { ContractTransaction, Provider, ensNormalize, parseEther, randomBytes } from "ethers";
import IETHRegistrarControllerABI from "@gib-ens/sol/artifacts/contracts/interfaces/IETHRegistrarController.sol/IETHRegistrarController.json";
import { IETHRegistrarController, Voucher } from "@gib-ens/sol/typechain-types";
import { Contract } from "ethers";
import { PolicyConfig } from "./policyService";
import { ens_tokenize } from "@adraffy/ens-normalize";
import { ENSAvailabilityResult, IService, TxForUserOperation } from "@/base/types";

export class ENSService implements IService {
    public static async fromProvider(provider: Provider, config: PolicyConfig): Promise<ENSService> {
        return new ENSService(provider, config);
    }

    private readonly controller: IETHRegistrarController;
    constructor(private readonly provider: Provider, private readonly config: PolicyConfig) {
        this.controller = new Contract(config.ensControllerContractAddress, IETHRegistrarControllerABI.abi, provider) as any as IETHRegistrarController;
    }

    getProvider(): Provider {
        return this.provider;
    }

    getConfig(): PolicyConfig {
        return this.config;
    }

    async getCommitmentHash(domain: Voucher.ENSParamsStruct): Promise<string> {
        const commitment = this.controller.makeCommitment(
            domain.name,
            domain._owner,
            domain.duration,
            domain.secret,
            domain.resolver,
            domain.data,
            domain.reverseRecord,
            domain.ownerControlledFuses,
        );
        return commitment;
    }

    async getCommitTransaction(domain: Voucher.ENSParamsStruct): Promise<TxForUserOperation> {
        const commitmentHash = await this.getCommitmentHash(domain);
        const tx = await this.controller.commit.populateTransaction(commitmentHash, { gasLimit: 100_000 });
        const { to, data, value, gasLimit } = tx;
        return { to, data, value, gasLimit };
    }

    public getEnsParamsStruct(params: Pick<Voucher.ENSParamsStruct, "name" | "_owner" | "duration">): Voucher.ENSParamsStruct {
        const { name, _owner, duration } = params;
        const result: Voucher.ENSParamsStruct = {
            name,
            _owner,
            duration,
            resolver: '0xd7a4F6473f32aC2Af804B3686AE8F1932bC35750',
            secret: randomBytes(32),
            data: [],
            reverseRecord: false,
            ownerControlledFuses: 0,
        };
        return result;
    }

    getNormalizedDomain(domain: string): { isValid: false } | { isValid: true, normalized: string } {
        let normalized: string;
        try {
            normalized = ensNormalize(domain)
        } catch (e) {
            return { isValid: false };
        }

        // Split into tokens. We only support 1 single token for now - only text.
        const tokens = ens_tokenize(normalized)
        if (tokens.length !== 1) {
            return { isValid: false }
        }
        const firstToken = tokens[0];
        if (firstToken.type !== 'valid') {
            return { isValid: false }
        }
        const numChars = firstToken.cps.length;
        if (numChars < 3 || numChars > 26) return { isValid: false };
        return { isValid: true, normalized };
    }

    async getDomainAvailability(domain: string): Promise<ENSAvailabilityResult> {
        const normalizedResult = this.getNormalizedDomain(domain);
        if (!normalizedResult.isValid) return { isAvailable: false, reason: "invalid" };

        const { normalized } = normalizedResult;
        const availability = await this.controller.available(normalized);
        if (!availability) return { isAvailable: false, reason: "unavailable" };

        const prices = await this.controller.rentPrice(normalized, this.config.registerDomainForSeconds);
        const price = prices.base + prices.premium;
        
        const ethToWei = parseEther(this.config.maxPurchasePriceEth.toString());
        if (price > ethToWei) return { isAvailable: false, reason: "expensive" };

        return {
            isAvailable: true,
            purchaseInfo: {
                normalizedDomainName: normalized,
                duration: this.config.registerDomainForSeconds,
                price: price.toString(),
            }
        };
    }
}