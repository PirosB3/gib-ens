require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-ethers")
require('hardhat-deploy');
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";


interface Config {
  ensController: string;
}

export const CHAIN_ID_TO_CONFIG = new Map<string, Config>();
CHAIN_ID_TO_CONFIG.set('5', { ensController: "0xcc5e7db10e65eed1bbd105359e7268aa660f6734", });



export function getMnemonic(networkName?: string): string {
  if (networkName) {
    const mnemonic = process.env['MNEMONIC_' + networkName.toUpperCase()];
    if (mnemonic && mnemonic !== '') {
      return mnemonic;
    }
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic || mnemonic === '') {
    return 'test test test test test test test test test test test junk';
  }
  return mnemonic;
}

export function accounts(networkName?: string): { mnemonic: string } {
  return { mnemonic: getMnemonic(networkName) };
}

const config: HardhatUserConfig = {
	solidity: {
		compilers: [
			{
				version: "0.8.19",
				settings: {
					optimizer: {
						enabled: true,
						runs: 2000,
					},
				},
			},
		],
	},
	namedAccounts: {
		deployer: 0,
		authority: 1,
	},
  networks: {
    goerli: {
      chainId: 5,
      url: "https://eth-goerli.g.alchemy.com/v2/fKPfYcgRT3Jpuv6rTPujFUXYXb4nC5kb",
      accounts: accounts('goerli'),
    }
  }
};

export default config;
