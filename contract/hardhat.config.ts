import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { vars } from "hardhat/config";

const PRIVATE_KEY = vars.get("BRAKIDCHAIN_PRIVATE_KEY");
const ENDPOINT = vars.get("BRAKIDCHAIN_ENDPOINT");
const CHAIN_ID = parseInt(vars.get("BRAKIDCHAIN_CHAINID"));

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    brakidchain: {
      url: ENDPOINT,
      chainId: CHAIN_ID,
      accounts: [PRIVATE_KEY],
      gas: "auto"
    },
  }
};

export default config;