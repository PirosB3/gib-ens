import BigNumber from "bignumber.js";
import { Contract, keccak256, AbiCoder, Provider } from "ethers";
import { EntryPoint, EntryPoint__factory, SimpleAccountFactory, SimpleAccountFactory__factory } from "userop/dist/typechain";
import { concatHex, encodeFunctionData } from "viem";

export const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const SIMPLE_ACCOUNT_FACTORY_ADDRESS = '0x9406cc6185a346906296840746125a0e44976454';
const GET_ADDRESS_FUNCTION_PREFIX = keccak256(Buffer.from("getAddress(address,uint256)")).slice(0, 10) as any;
const CREATE_ACCOUNT_FUNCTION_PREFIX = keccak256(Buffer.from("createAccount(address,uint256)")).slice(0, 10) as any;

export class UserOperationService {
    private coder: AbiCoder;

    constructor(
        private readonly provider: Provider,
        private readonly simpleAccountIndex = 0,
    ) {
        this.coder = new AbiCoder();
    }

    public async getAccountNonce(owner: string): Promise<BigNumber> {
        const entrypoint: EntryPoint = new Contract(ENTRYPOINT_ADDRESS, EntryPoint__factory.abi, this.provider) as any;
        const nonceIndex = await entrypoint.getNonce(owner, this.simpleAccountIndex);
        return new BigNumber(nonceIndex.toString())
    }

    public async getInitCode(owner: string): Promise<string> {
        const params = this.coder.encode(['address', 'uint256'], [owner, this.simpleAccountIndex]);
        const concatenated = concatHex([CREATE_ACCOUNT_FUNCTION_PREFIX, params]);
        return concatHex([SIMPLE_ACCOUNT_FACTORY_ADDRESS, concatenated]);
    }

    public async getSimpleAccountAddress(owner: string): Promise<string> {
        const params = this.coder.encode(['address', 'uint256'], [owner, this.simpleAccountIndex]);
        const concatenated = concatHex([GET_ADDRESS_FUNCTION_PREFIX, params]);
        const response = await this.provider.call({
            to: SIMPLE_ACCOUNT_FACTORY_ADDRESS,
            data: concatenated
        });
        const [newAddress] = this.coder.decode(['address'], response);
        return newAddress;
    }
}