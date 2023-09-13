import { AlchemyGasManagerService } from "./alchemyService";
import { ENSService } from "./ensService";
import { PolicyConfig, getPolicySetting } from "./policyService";
import { getEthersProvider } from "./providerService";
import { RedeemService } from "./redeemService";
import { VoucherService } from "./voucherService";
import { UserOperationService } from "./userOperationService";
import { AlchemyProvider } from "ethers";

export class ServiceFactory {
    private readonly config: PolicyConfig;
    private provider: AlchemyProvider;
    private ens: ENSService | undefined;

    constructor(private readonly event: string) {
        this.config = getPolicySetting(event);
        this.provider = getEthersProvider(this.config);
    }

    async getEns(): Promise<ENSService> {
        if (!this.ens) {
            this.ens = await ENSService.fromProvider(this.provider, this.config);
        }
        return this.ens;
    }

    async getUserOperationService() {
        // const ens = await this.getEns();
        const alchemy = await this.getAlchemyGasManagerService();
        return new UserOperationService(this.provider, alchemy)
    }

    async getAlchemyGasManagerService() {
        return new AlchemyGasManagerService(this.config, this.provider);
    }

    async getVoucherService() {
        const ens = await this.getEns();
        return new VoucherService(ens);
    }

    async getRedeemService() {
        const ens = await this.getEns();
        const voucher = await this.getVoucherService();
        return RedeemService.fromVoucherAndENS(voucher, ens);
    }
}