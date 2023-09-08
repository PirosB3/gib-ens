import { parseEther } from "ethers";
import { deployments, getNamedAccounts } from "hardhat";
const { execute } = deployments;


async function main() {
	const { deployer } = await getNamedAccounts();
  const result = await execute(
    'Voucher',
    {from: deployer, log: true, value: parseEther('0.02')},
    'deposit',
  );
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
