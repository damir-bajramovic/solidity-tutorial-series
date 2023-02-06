import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-solhint";

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  gasReporter: {
    currency: 'USD',
    gasPrice: 25,
    enabled: (process.env.REPORT_GAS) ? true : false
  }
};

export default config;
