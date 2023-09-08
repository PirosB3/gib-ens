import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getAccountPath, parseEther } from 'ethers';
import { CHAIN_ID_TO_CONFIG } from '../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const controller = CHAIN_ID_TO_CONFIG.get(hre.network.config.chainId?.toString() ?? '');
    if (!controller) throw new Error("No controller for chainId " + hre.network.config.chainId);
    const { ensController } = controller;

    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
	const { deployer, authority } = await getNamedAccounts();
    console.log("deployer", deployer)
    console.log("authority", authority)

	await deploy('Voucher', {
		from: deployer,
		args: [authority, ensController],
		log: true,
		autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
	});
};
export default func;
func.tags = ['Voucher'];