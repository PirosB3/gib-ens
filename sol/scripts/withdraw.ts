import { parseEther, formatEther } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";
const { execute } = deployments;
const readline = require('readline');

async function getInput(prompt: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise<string>((resolve) => {
        rl.question(prompt, (input) => {
            rl.close();
            resolve(input);
        });
    });
}

async function main() {
    const { deployer } = await getNamedAccounts();
    const voucherDeployment = await deployments.get("Voucher");
    const voucherAddress = voucherDeployment.address;
    const balance = await ethers.provider.getBalance(voucherAddress);

    console.log("Current balance of Voucher contract:", formatEther(balance), "Ether");

    // Get withdrawal amount input from the user
    const withdrawalAmount = await getInput("Enter the amount to withdraw (in Ether): ");

    if (!withdrawalAmount) {
        console.error("Invalid withdrawal amount. Exiting.");
        process.exit(1);
    }

    const withdrawalAmountInWei = parseEther(withdrawalAmount);

    if (withdrawalAmountInWei > balance) {
        console.error("Requested withdrawal amount exceeds the contract's balance. Exiting.");
        process.exit(1);
    }

    console.log(`Attempting to withdraw ${withdrawalAmount} Ether...`);

    try {
        const result = await execute(
            'Voucher',
            { from: deployer, log: true },
            'withdraw',
            withdrawalAmountInWei
        );
        console.log(`Transaction completed successfully. Details: ${result.transactionHash}`);
    } catch (error: any) {
        console.error("Failed to withdraw. Error:", error.message);
    }
}

main().catch((error) => {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
});
