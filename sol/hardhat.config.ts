require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-ethers")
require('hardhat-deploy');
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const hardhatPrivateKey = process.env.HARDHAT_PRIVATE_KEY;
if (hardhatPrivateKey === undefined) {
  throw new Error("HARDHAT_PRIVATE_KEY env variable not set");
}

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
