import { TxForUserOperation, UserOperationAndHash, UserOperationAndHashBundle, UserOperationStruct } from "@/base/types";
import BigNumber from "bignumber.js";
import { Contract, keccak256, AbiCoder, Provider } from "ethers";
import { EntryPoint, EntryPoint__factory } from "userop/dist/typechain";
import { concatHex } from "viem";
import { AlchemyGasManagerService } from "./alchemyService";

export const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const SIMPLE_ACCOUNT_FACTORY_ADDRESS = '0x9406cc6185a346906296840746125a0e44976454';
const GET_ADDRESS_FUNCTION_PREFIX = keccak256(Buffer.from("getAddress(address,uint256)")).slice(0, 10) as any;
const CREATE_ACCOUNT_FUNCTION_PREFIX = keccak256(Buffer.from("createAccount(address,uint256)")).slice(0, 10) as any;
const EXECUTE_FUNCTION_PREFIX = keccak256(Buffer.from("execute(address,uint256,bytes)")).slice(0, 10) as any;

export class UserOperationService {
    private readonly coder: AbiCoder;
    private readonly entrypoint: EntryPoint;

    constructor(
        private readonly provider: Provider,
        private readonly alchemy: AlchemyGasManagerService,
        private readonly simpleAccountIndex = 0,
    ) {
        this.coder = new AbiCoder();
        this.entrypoint = new Contract(ENTRYPOINT_ADDRESS, EntryPoint__factory.abi, this.provider) as any;
    }

    public async getAccountNonce(owner: string): Promise<BigNumber> {
        const nonceIndex = await this.entrypoint.getNonce(owner, this.simpleAccountIndex);
        return new BigNumber(nonceIndex.toString())
    }

    async getHash(userOp: UserOperationStruct): Promise<string> {
        const hash = await this.entrypoint.getUserOpHash(userOp);
        return hash;
    }

    public async getInitCode(owner: string, sender: string): Promise<string> {
        const code = await this.provider.getCode(sender);
        if (code.length > 2) {
            return '0x';
        }

        const params = this.coder.encode(['address', 'uint256'], [owner, this.simpleAccountIndex]);
        const concatenated = concatHex([CREATE_ACCOUNT_FUNCTION_PREFIX, params]);
        return concatHex([SIMPLE_ACCOUNT_FACTORY_ADDRESS, concatenated]);
    }

    public async getUserOperation(address: string, tx: TxForUserOperation): Promise<UserOperationAndHash> {
        const params = this.coder.encode(['address', 'uint256', 'bytes'], [tx.to, 0, tx.data]);
        const concatenated = concatHex([EXECUTE_FUNCTION_PREFIX, params]);
        const sender = await this.getSimpleAccountAddress(address);
        const accountNonce = await this.getAccountNonce(sender);
        const initCode = await this.getInitCode(address, sender);
        console.log({
            sender,
            initCode,
            nonce: `0x${accountNonce.toString(16)}`,
            callData: concatenated,
        });

        const userOp = await this.alchemy.requestGasAndPaymasterAndData({
            sender,
            initCode,
            nonce: `0x${accountNonce.toString(16)}`,
            callData: concatenated,
        });
        const hash = await this.getHash(userOp);
        return UserOperationAndHashBundle.parse({ userOp, hash });
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