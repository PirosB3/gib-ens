import { expect } from "chai";
import { ethers } from "hardhat";
import { MockRegistrarController, Voucher } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { BigNumberish, ContractTransactionReceipt, Result, Wallet, parseEther, solidityPackedKeccak256 } from "ethers";
import { randomBytes } from "crypto";

const DEFAULT_DOMAIN_PARAMS: Omit<Voucher.ENSParamsStruct, "_owner" | "resolver"> = {
    name: "example.eth",
    duration: 31556952,
    secret: randomBytes(32),
    data: [],
    reverseRecord: false,
    ownerControlledFuses: 0
};

interface Balances {
    voucher: BigNumberish,
    mockController: BigNumberish
}

describe("Voucher", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    let deployer: HardhatEthersSigner;
    let authority: HardhatEthersSigner;
    let mockController: MockRegistrarController;
    let voucher: Voucher;
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

    async function fundVoucher(amount: BigNumberish) {
        return await voucher.connect(deployer).deposit({ value: amount });
    }

    async function generateCommitmentWithParams(params: Voucher.ENSParamsStruct) {
        return await mockController.makeCommitment(
            params.name,
            params._owner,
            params.duration,
            params.secret,
            params.resolver,
            params.data,
            params.reverseRecord,
            params.ownerControlledFuses
        );
    }

    async function getCurrentBlockTimestamp(): Promise<number> {
        const latestBlock = await ethers.provider.getBlock("latest");
        if (latestBlock === null) {
            throw new Error("Unable to fetch current block timestamp");
        }
        return latestBlock.timestamp;
    }

    async function generatePayload(commitment: string, policyHash: Buffer, purchasePrice: BigNumberish, expiry: BigNumberish): Promise<Buffer> {
        const hexBytes = solidityPackedKeccak256(
            ['address', 'bytes32', 'bytes32', 'uint256', 'uint256'],
            [await voucher.getAddress(), policyHash, commitment, purchasePrice, expiry]
        );
        return Buffer.from(hexBytes.slice(2), 'hex');
    }

    async function decodeEventFromReceipt(event: string, receipt: ContractTransactionReceipt): Promise<Result> {
        const MockRegistrarControllerFactory = await ethers.getContractFactory("MockRegistrarController", deployer);
        return MockRegistrarControllerFactory.interface.decodeEventLog(event, receipt.logs[0].data, receipt.logs[0].topics);
    }

    async function getContractBalances(): Promise<{ voucher: BigNumberish, mockController: BigNumberish }> {
        return {
            voucher: await ethers.provider.getBalance(voucher.getAddress()),
            mockController: await ethers.provider.getBalance(mockController.getAddress())
        };
    }

    function assertDomainRegisteredEvent(decoded: Result, params: Voucher.ENSParamsStruct) {
        expect(decoded[0]).to.eq(params.name);
        expect(decoded[1]).to.eq(params._owner);
        expect(decoded[2]).to.eq(params.duration);
        expect(decoded[3]).to.eq(ethers.hexlify(params.secret));
        expect(decoded[4]).to.eq(params.resolver);
        expect(decoded[5].length).to.eq(params.data.length).to.eq(0);
        expect(decoded[6]).to.eq(params.reverseRecord);
        expect(decoded[7]).to.eq(params.ownerControlledFuses);
    }

    function assertBalancesAfterTransaction(initialBalances: Balances, finalBalances: Balances, purchasePrice: BigNumberish, refundAmount: BigNumberish) {
        expect(finalBalances.voucher).to.equal(BigInt(initialBalances.voucher) - BigInt(purchasePrice) + BigInt(refundAmount));
        expect(finalBalances.mockController).to.equal(BigInt(purchasePrice) - BigInt(refundAmount));
    }

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


    it("Should create an offchain commitment", async function () {
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
        await fundVoucher(parseEther("1"));
        const policyHash = randomBytes(32);
        const initialVoucherBalance = await getContractBalances();


        const [acct1, acct2, ...otherAccounts] = (await ethers.getSigners()).slice(5);
        const params = generateDomainParams({
            name: 'foo.eth',
            _owner: acct1.address,
            resolver: acct2.address
        });

        const commitment = await generateCommitmentWithParams(params);

        const currentBlockTimestamp = await getCurrentBlockTimestamp();
        const expiry = (currentBlockTimestamp + 3600)
        const purchasePrice = parseEther("0.6115");
        const payloadBuffer = await generatePayload(commitment, policyHash, purchasePrice, expiry);
        const signature = await authority.signMessage(payloadBuffer);


        const [preIsRegistered,] = await voucher.getRedeemResult22(acct1.address, policyHash);
        expect(preIsRegistered).to.be.false;
        const tx = await voucher.completeENSRegistration(
            policyHash,
            purchasePrice,
            expiry,
            params,
            signature
        );

        const receipt = await tx.wait();
        if (!receipt) throw new Error("No receipt returned");
        const decoded = await decodeEventFromReceipt("DomainRegistered", receipt);
        assertDomainRegisteredEvent(decoded, params);

        const finalBalances = await getContractBalances();
        const refundAmount = parseEther("0.000000005");
        assertBalancesAfterTransaction(initialVoucherBalance, finalBalances, purchasePrice, refundAmount);

        const [postIsRegistered, postDomainHash] = await voucher.getRedeemResult22(acct1.address, policyHash);
        expect(postIsRegistered).to.be.true;
        const domainHash = solidityPackedKeccak256(['string'], [params.name]);
        expect(postDomainHash).to.be.eq(domainHash);
    });

    it("Should fail for an invalid signature", async function () {
        await fundVoucher(parseEther("1"));
        const policyHash = randomBytes(32);

        const [acct1, acct2,] = (await ethers.getSigners()).slice(5);
        const params = generateDomainParams({
            name: 'foo.eth',
            _owner: acct1.address,
            resolver: acct2.address
        });

        const commitment = await generateCommitmentWithParams(params);
        const currentBlockTimestamp = await getCurrentBlockTimestamp();
        const expiry = (currentBlockTimestamp + 3600);
        const purchasePrice = parseEther("0.6115");
        const payloadBuffer = await generatePayload(commitment, policyHash, purchasePrice, expiry);

        const randoe = Wallet.createRandom();
        const signature = await randoe.signMessage(payloadBuffer);

        await expect(
            voucher.completeENSRegistration(
                policyHash,
                purchasePrice,
                expiry,
                params,
                signature
            )
        ).to.be.revertedWith("Invalid signature");
    });

    it("Should fail for an expired voucher", async function () {
        const policyHash = randomBytes(32);
        await fundVoucher(parseEther("1"));

        const [acct1, acct2, ...otherAccounts] = (await ethers.getSigners()).slice(5);
        const params = generateDomainParams({
            name: 'foo.eth',
            _owner: acct1.address,
            resolver: acct2.address
        });

        const commitment = await generateCommitmentWithParams(params);
        const currentBlockTimestamp = await getCurrentBlockTimestamp();

        // Setting expiry to a past timestamp
        const expiry = (currentBlockTimestamp - 3600);
        const purchasePrice = parseEther("0.6115");
        const payloadBuffer = await generatePayload(commitment, policyHash, purchasePrice, expiry);
        const signature = await authority.signMessage(payloadBuffer);

        await expect(
            voucher.completeENSRegistration(
                policyHash,
                purchasePrice,
                expiry,
                params,
                signature
            )
        ).to.be.revertedWith("The expiration window has passed.");
    });

    it("Should fail for insufficient funds", async function () {
        await fundVoucher(parseEther("0.1")); // Intentionally funding with insufficient amount
        const policyHash = randomBytes(32);

        const [acct1, acct2,] = (await ethers.getSigners()).slice(5);
        const params = generateDomainParams({
            name: 'foo.eth',
            _owner: acct1.address,
            resolver: acct2.address
        });

        const commitment = await generateCommitmentWithParams(params);
        const currentBlockTimestamp = await getCurrentBlockTimestamp();
        const expiry = (currentBlockTimestamp + 3600);
        const purchasePrice = parseEther("0.6115");
        const payloadBuffer = await generatePayload(commitment, policyHash, purchasePrice, expiry);
        const signature = await authority.signMessage(payloadBuffer);

        await expect(
            voucher.completeENSRegistration(
                policyHash,
                purchasePrice,
                expiry,
                params,
                signature
            )
        ).to.be.revertedWith("Insufficient contract balance for registration");
    });

    it("Should fail if user tries to reuse the signature for distinct events", async function () {
        await fundVoucher(parseEther("2")); // Funding enough for two registrations
        const policyHash = randomBytes(32);
        const [acct1, acct2,] = (await ethers.getSigners()).slice(5);

        // First domain params
        const params1 = generateDomainParams({
            name: 'foo1.eth',
            _owner: acct1.address,
            resolver: acct2.address
        });
        const commitment1 = await generateCommitmentWithParams(params1);
        const currentBlockTimestamp = await getCurrentBlockTimestamp();
        const expiry = (currentBlockTimestamp + 3600);
        const purchasePrice1 = parseEther("0.6115");
        const payloadBuffer1 = await generatePayload(commitment1, policyHash, purchasePrice1, expiry);
        const signature1 = await authority.signMessage(payloadBuffer1);

        // Assuming batchCompleteENSRegistration exists and can register multiple domains
        const firstTx = await voucher.completeENSRegistration(
            policyHash,
            purchasePrice1,
            expiry,
            params1,
            signature1
        );

        const receipt = await firstTx.wait();

        await expect(
            voucher.completeENSRegistration(
                randomBytes(32),
                purchasePrice1,
                expiry,
                params1,
                signature1
            )
        ).to.be.revertedWith("Invalid signature");
    });

    it("Should fail if user manages to get 2 valid vouchers for the same policy", async function () {
        await fundVoucher(parseEther("2")); // Funding enough for two registrations
        const policyHash = randomBytes(32);
        const [acct1, acct2, ...otherAccounts] = (await ethers.getSigners()).slice(5);

        // First domain params
        const params1 = generateDomainParams({
            name: 'foo1.eth',
            _owner: acct1.address,
            resolver: acct2.address
        });

        // Second domain params
        const params2 = generateDomainParams({
            name: 'foo2.eth',
            _owner: acct1.address,
            resolver: acct2.address
        });

        const commitment1 = await generateCommitmentWithParams(params1);
        const commitment2 = await generateCommitmentWithParams(params2);

        const currentBlockTimestamp = await getCurrentBlockTimestamp();
        const expiry = (currentBlockTimestamp + 3600);
        const purchasePrice1 = parseEther("0.6115");
        const purchasePrice2 = parseEther("0.6115"); // Assuming same price for both

        const payloadBuffer1 = await generatePayload(commitment1, policyHash, purchasePrice1, expiry);
        const payloadBuffer2 = await generatePayload(commitment2, policyHash, purchasePrice2, expiry);

        const signature1 = await authority.signMessage(payloadBuffer1);
        const signature2 = await authority.signMessage(payloadBuffer2);

        // Assuming batchCompleteENSRegistration exists and can register multiple domains
        const firstTx = await voucher.completeENSRegistration(
            policyHash,
            purchasePrice1,
            expiry,
            params1,
            signature1
        );

        const receipt = await firstTx.wait();
        if (!receipt) throw new Error("No receipt returned");
        const decoded1 = await decodeEventFromReceipt("DomainRegistered", receipt); // 0: index of the first event
        assertDomainRegisteredEvent(decoded1, params1);

        await expect(
            voucher.completeENSRegistration(
                policyHash,
                purchasePrice1,
                expiry,
                params1,
                signature1
            )
        ).to.be.revertedWith("User has already redeemed for this event.");

        await expect(
            voucher.completeENSRegistration(
                policyHash,
                purchasePrice2,
                expiry,
                params2,
                signature2
            )
        ).to.be.revertedWith("User has already redeemed for this event.");
    });
});