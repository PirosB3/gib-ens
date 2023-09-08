import { BigNumberish, Wallet, parseEther, randomBytes, solidityPackedKeccak256 } from "ethers";
import { deployments, ethers, getNamedSigners, network } from "hardhat";
import { Voucher, MockRegistrarController } from "../typechain-types";
import { CHAIN_ID_TO_CONFIG } from "../hardhat.config";
const { execute } = deployments;



async function getCurrentBlockTimestamp(): Promise<number> {
    const latestBlock = await ethers.provider.getBlock("latest");
    if (latestBlock === null) {
        throw new Error("Unable to fetch current block timestamp");
    }
    return latestBlock.timestamp;
}

async function generatePayload(voucherAddress: string, commitment: string, policyHash: Buffer, purchasePrice: BigNumberish, expiry: BigNumberish): Promise<Buffer> {
    const hexBytes = solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256'],
        [voucherAddress, policyHash, commitment, purchasePrice, expiry]
    );
    return Buffer.from(hexBytes.slice(2), 'hex');
}



// Function to sleep
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


async function main() {
    const { deployer, authority } = await ethers.getNamedSigners();
    const voucherDeployment = await deployments.get("Voucher");
    const voucherAddress = voucherDeployment.address;
    const balance = await ethers.provider.getBalance(voucherAddress);

    // Make a new commitment
    const policyHash = Buffer.from(randomBytes(32));

    const owner = Wallet.createRandom();
    const params: Voucher.ENSParamsStruct = {
        name: "testraaa",
        duration: 31536000,
        resolver: '0xd7a4F6473f32aC2Af804B3686AE8F1932bC35750',
        _owner: '0x729170d38dd5449604f35f349fdfcc9ad08257cd',
        secret: randomBytes(32),
        data: [],
        reverseRecord: false,
        ownerControlledFuses: 0,
    };
    

    const config = CHAIN_ID_TO_CONFIG.get(network.config.chainId?.toString() ?? '');
    if (!config) throw new Error("No config for chainId " + network.config.chainId);

    const MockRegistrarControllerFactory = await ethers.getContractFactory("MockRegistrarController");
    const mockRegistrarController = MockRegistrarControllerFactory.attach(config.ensController) as MockRegistrarController;

    const commitment = await mockRegistrarController.makeCommitment(
        params.name,
        params._owner,
        params.duration,
        params.secret,
        params.resolver,
        params.data,
        params.reverseRecord,
        params.ownerControlledFuses
    )
    console.log("deployer", commitment)

    const result = await mockRegistrarController.commit(commitment);
    console.log(`Submitted commitment: ${commitment}`);
    await result.wait();

    // Wait for the commitment to be mined
    await sleep(75 * 1000);


    const currentBlockTimestamp = await getCurrentBlockTimestamp();
    const expiry = (currentBlockTimestamp + 3600)
    const purchasePrice = parseEther("0.01");
    const payloadBuffer = await generatePayload(voucherAddress, commitment, policyHash, purchasePrice, expiry);
    const signature = await authority.signMessage(payloadBuffer);

    const redeem = await execute(
        'Voucher',
        { from: deployer.address, log: true, gasLimit: 800_000 },
        'completeENSRegistration',
        policyHash,
        purchasePrice,
        expiry,
        params,
        signature
    );
    console.log(`[TX Hash] ${redeem.transactionHash}`);
    // const tx = await voucherDeployment.completeENSRegistration(
    // );
    // // wait for tx to be mined
    // console.log(tx);


    // console.log(result);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
