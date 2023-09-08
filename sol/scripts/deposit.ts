import { parseEther } from "ethers";
import { deployments, getNamedAccounts } from "hardhat";
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

  console.log("Current deployer account:", deployer);

  // Get deposit amount input from the user
  const depositAmount = await getInput("Enter the amount to deposit (in Ether): ");

  if (!depositAmount) {
    console.error("Invalid deposit amount. Exiting.");
    process.exit(1);
  }

  console.log(`Attempting to deposit ${depositAmount} Ether...`);

  try {
    const result = await execute(
      'Voucher',
      { from: deployer, log: true, value: parseEther(depositAmount) },
      'deposit'
    );

    console.log(`Transaction completed successfully. Details: ${result.transactionHash}`);
  } catch (error) {
    console.error("Failed to deposit. Error:", error.message);
  }
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});
