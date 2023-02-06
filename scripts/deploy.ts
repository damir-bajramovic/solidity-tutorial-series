import { ethers } from "hardhat";

async function main() {
  const TOKEN_NAME = "EMB Token";
  const TOKEN_SYMBOL = "EMB"

  const EmbToken = await ethers.getContractFactory("EMBToken");
  const embToken = await EmbToken.deploy(TOKEN_NAME, TOKEN_SYMBOL);

  await embToken.deployed();
  
  console.log(`EMBToken deployed to ${embToken.address}`);

  const Protocol = await ethers.getContractFactory("Protocol");
  const protocol = await Protocol.deploy(embToken.address, embToken.address);

  await protocol.deployed();

  console.log(`Protocol deployed to ${protocol.address}`);

  await embToken.setProtocol(protocol.address);

  console.log(`EMBToken protocol set to ${protocol.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
