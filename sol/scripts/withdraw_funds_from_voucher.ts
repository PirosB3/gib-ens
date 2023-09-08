import { parseEther } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";
const { execute } = deployments;


async function main() {
    const { deployer } = await getNamedAccounts();
    const voucherDeployment = await deployments.get("Voucher");
    const voucherAddress = voucherDeployment.address;
    const balance = await ethers.provider.getBalance(voucherAddress);
    console.log("balance", balance.toString());

    const result = await execute(
        'Voucher',
        { from: deployer, log: true },
        'withdraw',
        balance
    );
    console.log(result);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
