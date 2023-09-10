import { Voucher } from "@gib-ens/sol/typechain-types";
import VoucherABI from "@gib-ens/sol/artifacts/contracts/Voucher.sol/Voucher.json";
import { BigNumberish, Contract, Provider, ethers, solidityPackedKeccak256 } from "ethers";
import { DOMAIN_DURATION, DomainAvailabilityResult, DomainAvailable, ENSService } from "./ensService";
import { Wallet } from "ethers";

export const CHAIN_TO_VOUCHER_ADDRESS: Map<string, string> = new Map();
CHAIN_TO_VOUCHER_ADDRESS.set('5', '0xc1366CcB4190267720EEBf7ccb0064C91284cad6');

const TRANSACTION_EXPIRATION_TTL = 10 * 60;

interface GetDomainAvailabilityParams {
    owner: string;
    domain: string;
    policyId: string;
}

export class VoucherService {
    public static async fromEnsService(service: ENSService): Promise<VoucherService> {
        const provider = service.getProvider();
        const network = await provider.getNetwork();
        const controllerAddress = CHAIN_TO_VOUCHER_ADDRESS.get(network.chainId.toString());
        if (!controllerAddress) {
            throw new Error(`No controller address for chain ${network.chainId}`);
        }
        return new VoucherService(controllerAddress, service);
    }

    private readonly voucher: Voucher;
    private readonly $authority: Wallet;
    constructor(
        controllerAddress: string,
        private readonly ens: ENSService,
        private readonly duration: number = DOMAIN_DURATION,
        private readonly transactionExpirationTtl: number = TRANSACTION_EXPIRATION_TTL,
    ) {
        this.voucher = new Contract(controllerAddress, VoucherABI.abi, ens.getProvider()) as any as Voucher;
        this.$authority = new Wallet(ens.getConfig().sponsorshipContractAuthorityPk, ens.getProvider());
    }

    public getPolicyHash(policy: string): string {
        return solidityPackedKeccak256(['string'], [policy]);
    }

    public async isAlreadyRedeemed(owner: string, voucher: string): Promise<boolean> {
        const hashedVoucher = this.getPolicyHash(voucher);
        const [isRegistered, _] = await this.voucher.getRedeemResult(owner, hashedVoucher);
        return isRegistered
    }

    async getCompleteENSRegistrationTransaction(
        params: GetDomainAvailabilityParams,
        domainAvailabilityResult: DomainAvailable,
        ensParamsStruct: Voucher.ENSParamsStruct
    ): Promise<Pick<ethers.ContractTransaction, "data" | "value" | "to" | "gasLimit">> {
        const commitmentHash = await this.ens.getCommitmentHash(ensParamsStruct);
        const policyHash = Buffer.from(this.getPolicyHash(params.policyId).split('0x')[1], 'hex');

        const maxPrice = domainAvailabilityResult.purchaseInfo.price;

        const expirationWindow = await this.getCurrentBlockTimestamp() + this.transactionExpirationTtl;
        const payloadBuffer = this.generatePayload(await this.voucher.getAddress(), commitmentHash, policyHash, maxPrice, expirationWindow);
        const signature = await this.$authority.signMessage(payloadBuffer);

        const tx = await this.voucher.completeENSRegistration.populateTransaction(
            policyHash, maxPrice, expirationWindow, ensParamsStruct, signature,
            { gasLimit: 800_000 }
        );
        
        const { to, data, value, gasLimit } = tx;
        return { to, data, value, gasLimit };
    }

    public async createTransactions(params: GetDomainAvailabilityParams, domainAvailabilityResult: DomainAvailable): Promise<void> {
        const ensParamsStruct = this.ens.getEnsParamsStruct({
            _owner: params.owner,
            name: domainAvailabilityResult.purchaseInfo.normalizedDomainName,
            duration: domainAvailabilityResult.purchaseInfo.duration,
        });
        const commitTransaction = await this.ens.getCommitTransaction(ensParamsStruct);
        const completeENSRegistrationTransaction = await this.getCompleteENSRegistrationTransaction(params, domainAvailabilityResult, ensParamsStruct);

        const allTransactions = [commitTransaction, completeENSRegistrationTransaction];
        console.log(allTransactions);
    }

    async getDomainAvailability(params: GetDomainAvailabilityParams): Promise<DomainAvailabilityResult> {
        const availability = await this.ens.getDomainAvailability(params.domain, this.duration);
        if (!availability.isAvailable) {
            return availability;
        }

        const isAlreadyRedeemed = await this.isAlreadyRedeemed(params.owner, params.policyId);
        if (isAlreadyRedeemed) {
            return {
                isAvailable: false,
                reason: "alreadyRegistered",
            }
        }
        return availability;
    }

    async getCurrentBlockTimestamp(): Promise<number> {
        const latestBlock = await this.ens.getProvider().getBlock("latest");
        if (latestBlock === null) {
            throw new Error("Unable to fetch current block timestamp");
        }
        return latestBlock.timestamp;
    }

    generatePayload(voucherAddress: string, commitment: string, policyHash: Buffer, purchasePrice: BigNumberish, expiry: BigNumberish): Buffer {
        const hexBytes = solidityPackedKeccak256(
            ['address', 'bytes32', 'bytes32', 'uint256', 'uint256'],
            [voucherAddress, policyHash, commitment, purchasePrice, expiry]
        );
        return Buffer.from(hexBytes.slice(2), 'hex');
    }
}