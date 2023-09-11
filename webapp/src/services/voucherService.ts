import { Voucher } from "@gib-ens/sol/typechain-types";
import VoucherABI from "@gib-ens/sol/artifacts/contracts/Voucher.sol/Voucher.json";
import { BigNumberish, Contract, Provider, ethers, solidityPackedKeccak256 } from "ethers";
import { ENSService } from "./ensService";
import { Wallet } from "ethers";
import { IService, TxForUserOperation, VoucherAvailabilityResult, VoucherAvailable } from "@/base/types";
import { PolicyConfig } from "./policyService";


interface GetDomainAvailabilityParams {
    owner: string;
    domain: string;
    policyId: string;
}

export class VoucherService implements IService {

    private readonly voucher: Voucher;
    private readonly $authority: Wallet;
    constructor(
        private readonly ens: ENSService,
    ) {
        const config = ens.getConfig();
        const provider = ens.getProvider();
        this.voucher = new Contract(config.voucherContractAddress, VoucherABI.abi, provider) as any as Voucher;
        this.$authority = new Wallet(config.sponsorshipContractAuthorityPk, provider);
    }

    getConfig(): PolicyConfig {
        return this.ens.getConfig();
    }
    getProvider(): Provider {
        return this.ens.getProvider();
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
        params: VoucherAvailable,
        ensParamsStruct: Voucher.ENSParamsStruct
    ): Promise<TxForUserOperation> {
        const commitmentHash = await this.ens.getCommitmentHash(ensParamsStruct);
        const policyHash = Buffer.from(this.getPolicyHash(params.voucher.policyId).split('0x')[1], 'hex');

        const maxPrice = params.ens.purchaseInfo.price;

        const expirationWindow = await this.getCurrentBlockTimestamp() + this.getConfig().voucherValiditySeconds;
        const payloadBuffer = this.generatePayload(await this.voucher.getAddress(), commitmentHash, policyHash, maxPrice, expirationWindow);
        const signature = await this.$authority.signMessage(payloadBuffer);

        const tx = await this.voucher.completeENSRegistration.populateTransaction(
            policyHash, maxPrice, expirationWindow, ensParamsStruct, signature,
            { gasLimit: 800_000 }
        );
        
        const { to, data, value, gasLimit } = tx;
        return { to, data, value, gasLimit };
    }

    public async createTransactions(params: VoucherAvailable): Promise<TxForUserOperation[]> {
        const ensParamsStruct = this.ens.getEnsParamsStruct({
            _owner: params.voucher.owner,
            name: params.ens.purchaseInfo.normalizedDomainName,
            duration: params.ens.purchaseInfo.duration,
        });
        const commitTransaction = await this.ens.getCommitTransaction(ensParamsStruct);
        const completeENSRegistrationTransaction = await this.getCompleteENSRegistrationTransaction(params, ensParamsStruct);

        const allTransactions = [commitTransaction, completeENSRegistrationTransaction];
        return allTransactions;
    }

    async getDomainAvailability(params: GetDomainAvailabilityParams): Promise<VoucherAvailabilityResult> {
        const availability = await this.ens.getDomainAvailability(params.domain);
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
        return {
            isAvailable: true,
            ens: availability,
            voucher: {
                policyId: params.policyId,
                owner: params.owner,
            }
        };
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