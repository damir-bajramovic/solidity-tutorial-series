import { ethers } from "hardhat";

async function main() {
  const TOKEN_NAME = "Random Token";
  const TOKEN_SYMBOL = "RND"

  const SignatureMintErc20 = await ethers.getContractFactory("");
  const signatureMintErc20 = await SignatureMintErc20.deploy(TOKEN_NAME, TOKEN_SYMBOL);

  await signatureMintErc20.deployed();
  
  console.log(`${TOKEN_NAME} deployed to ${signatureMintErc20.address}`);

  const Protocol = await ethers.getContractFactory("Protocol");
  const protocol = await Protocol.deploy(signatureMintErc20.address, signatureMintErc20.address);

  await protocol.deployed();

  console.log(`Protocol deployed to ${protocol.address}`);

  await signatureMintErc20.setProtocol(protocol.address);

  console.log(`${TOKEN_NAME} protocol set to ${protocol.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
