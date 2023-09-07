import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getAccountPath, parseEther } from 'ethers';

interface Config {
    ensController: string;
}

const CHAIN_ID_TO_CONFIG = new Map<string, Config>();
CHAIN_ID_TO_CONFIG.set('5', { ensController: "0xcc5e7db10e65eed1bbd105359e7268aa660f6734", });


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    console.error("HERE!!!")
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