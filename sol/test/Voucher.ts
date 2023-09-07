import { expect } from "chai";
import { ethers } from "hardhat";
import { MockRegistrarController, MockRegistrarController__factory } from "../typechain-types";
import { Voucher } from "../typechain-types/contracts/Voucher.sol";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { AddressLike, BigNumberish, BytesLike, parseEther, solidityPackedKeccak256 } from "ethers";
import { randomBytes } from "crypto";
import { NumberLike } from "@nomicfoundation/hardhat-network-helpers/dist/src/types";

// 1. Define the interface
// interface DomainParams {
//     name: string;
//     owner: AddressLike;
//     duration: BigNumberish;
//     secret: Uint8Array;
//     resolver: AddressLike;
//     data: BytesLike[]; 
//     reverseRecord: boolean;
//     ownerControlledFuses: BigNumberish;
// }

// 3. Create the constant for default parameters
const DEFAULT_DOMAIN_PARAMS: Omit<Voucher.ENSParamsStruct, "_owner" | "resolver"> = {
    name: "example.eth",
    duration: 31556952,
    secret: randomBytes(32),
    data: [],
    reverseRecord: false,
    ownerControlledFuses: 0
};

describe("Voucher", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    let deployer: HardhatEthersSigner;
    let authority: HardhatEthersSigner;
    async function deployEnsAndVoucher() {
        // Fetch all the signers. The first signer/account will deploy MockRegistrarController, 
        // the second signer/account will be used as the _authority for Voucher
        const [_deployer, _authority, ...otherAccounts] = await ethers.getSigners();
        deployer = _deployer;
        authority = _authority;

        // Deploy the MockRegistrarController using the first signer
        const MockRegistrarControllerFactory = await ethers.getContractFactory("MockRegistrarController", deployer);
        const mockRegistrarController = await MockRegistrarControllerFactory.deploy();

        // Deploy the Voucher contract using the second signer as the _authority
        const VoucherFactory = await ethers.getContractFactory("Voucher");
        const voucherContract = await VoucherFactory.deploy(authority.address, mockRegistrarController.getAddress());

        return { mockRegistrarController, voucherContract, authority, deployer, otherAccounts };
    }

    let mockController: MockRegistrarController;
    let voucher: Voucher;

    describe("ETH Controls", function () {
        this.beforeEach(async function () {
            const { mockRegistrarController, voucherContract } = await deployEnsAndVoucher();
            mockController = mockRegistrarController;
            voucher = voucherContract;
        });

        it("Should set the right authority", async function () {
            const authority = await voucher.authority();
            expect(authority).to.equal(authority);
        });

        it("Should allow the owner to deposit ETH", async function () {
            const depositAmount = parseEther("1");
            await voucher.connect(deployer).deposit({ value: depositAmount });

            const contractBalance = await ethers.provider.getBalance(voucher);
            expect(contractBalance).to.equal(depositAmount);
        });

        it("Should allow the owner to withdraw ETH", async function () {
            const depositAmount = parseEther("2");
            await voucher.connect(deployer).deposit({ value: depositAmount });

            const withdrawAmount = parseEther("1");
            await voucher.connect(deployer).withdraw(withdrawAmount);

            const contractBalance = await ethers.provider.getBalance(voucher);
            expect(contractBalance).to.equal(depositAmount - withdrawAmount);
        });

        it("Should not allow non-owners to deposit or withdraw ETH", async function () {
            const otherAccount = (await ethers.getSigners())[4];
            await expect(voucher.connect(otherAccount).deposit({ value: parseEther("1") })).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(voucher.connect(otherAccount).withdraw(parseEther("1"))).to.be.revertedWith("Ownable: caller is not the owner");
        });


        // 2. Modify the function to accept Partial<DomainParams>
        const generateDomainParams = (overrides: Partial<Voucher.ENSParamsStruct>): Voucher.ENSParamsStruct => {
            // 4. Merge defaults with passed-in values
            if (overrides.resolver === undefined || overrides._owner === undefined) {
                throw new Error("Must provide a name and owner");
            }
            const { resolver, _owner, ...otherOverrides } = overrides;
            return {
                resolver,
                _owner,
                ...DEFAULT_DOMAIN_PARAMS,
                ...otherOverrides
            };
        }


        it("Should create an offchain signature from 'authority' account and call 'completeENSRegistration'", async function () {
            const [acct1, acct2, ..._] = (await ethers.getSigners()).slice(5);
            const params = generateDomainParams({
                name: 'foo.eth',
                _owner: acct1.address,
                resolver: acct2.address
            });

            const commitment = await mockController.makeCommitment(
                params.name,
                params._owner,
                params.duration,
                params.secret,
                params.resolver,
                params.data,
                params.reverseRecord,
                params.ownerControlledFuses
            );
            expect(commitment).to.not.be.eq('0x0000000000000000000000000000000000000000000000000000000000000000')
        });

        it("Should create an offchain signature from 'authority' account and call 'completeENSRegistration'", async function () {
            // Fund with 1 ETH
            await voucher.connect(deployer).deposit({ value: parseEther("1") });

            const [acct1, acct2, ..._] = (await ethers.getSigners()).slice(5);
            const params = generateDomainParams({
                name: 'foo.eth',
                _owner: acct1.address,
                resolver: acct2.address
            });

            const commitment = await mockController.makeCommitment(
                params.name,
                params._owner,
                params.duration,
                params.secret,
                params.resolver,
                params.data,
                params.reverseRecord,
                params.ownerControlledFuses
            );

            // UNIX epoch = now + 1h
            const latestBlock = await ethers.provider.getBlock("latest");
            const currentBlockTimestamp = latestBlock?.timestamp;
            if (currentBlockTimestamp === undefined) {
                throw new Error("Unable to fetch current block timestamp");
            }
            const expiry = (currentBlockTimestamp + 3600).toString();
            const purchasePrice = parseEther("0.6115");
            const payload = solidityPackedKeccak256(
                ['address', 'bytes32', 'uint256', 'uint256'],
                [await voucher.getAddress(), commitment, purchasePrice, expiry]
            );
            const payloadBuffer = Buffer.from(payload.slice(2), 'hex');
            const signature = await authority.signMessage(payloadBuffer);

            
            const tx = await voucher.completeENSRegistration(
                commitment,  // Assuming that this is the policyHash for your contract method
                purchasePrice,  // The maxPrice value
                expiry,
                params,
                signature
            );
            const receipt = await tx.wait();
            const MockRegistrarControllerFactory = await ethers.getContractFactory("MockRegistrarController", deployer);

            const decoded = MockRegistrarControllerFactory.interface.decodeEventLog("DomainRegistered", receipt!.logs[0].data, receipt!.logs[0].topics);
            expect(decoded[0]).to.eq(params.name);
            expect(decoded[1]).to.eq(params._owner);
            expect(decoded[2]).to.eq(params.duration);
            expect(decoded[3]).to.eq(ethers.hexlify(params.secret));
            expect(decoded[4]).to.eq(params.resolver);
            expect(decoded[5].length).to.eq(params.data.length).to.eq(0);
            expect(decoded[6]).to.eq(params.reverseRecord);
            expect(decoded[7]).to.eq(params.ownerControlledFuses);
        });

    });
});