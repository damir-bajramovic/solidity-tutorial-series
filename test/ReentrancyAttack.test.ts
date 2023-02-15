import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, constants, TypedDataDomain } from "ethers";
import { _TypedDataEncoder } from "ethers/lib/utils";
import { calculateDeploymentAddresses } from "../helpers/calculateDeploymentAddress";
import { MintDataType } from "../helpers/types/eip712";
import { MintArgs } from "../helpers/types";

describe("Protocol reentrancy attack", () =>{
  async function reentrancyAttackPreparationFixture() {
    const tokenName = "EMB Token";
    const tokenSymbol = "EMB";

    const [owner, mintSigner, attacker] = await ethers.getSigners();

    const EmbToken = await ethers.getContractFactory("EMBToken");
    const embToken = await EmbToken.deploy(tokenName, tokenSymbol);

    const Protocol = await ethers.getContractFactory("Protocol");
    const protocol = await Protocol.deploy(mintSigner.address, embToken.address);

    await embToken.setProtocol(protocol.address);

    const PROTOCOL_DOMAIN: TypedDataDomain = {
      name: "Protocol",
      version: "v1",
      chainId: 31337, // 31337 by default for hardhat localhost
      verifyingContract: protocol.address
    }

    const attackerTransactionCount = BigNumber.from(await attacker.getTransactionCount());

    // NOTE: Address is not checksummed
    const attackerContractAddress = calculateDeploymentAddresses(attacker.address, attackerTransactionCount);

    
    const TO_ADDRESS = attackerContractAddress;
    const MINT_AMOUNT = constants.WeiPerEther;
    
    const mintArgs: MintArgs = {
      minter: TO_ADDRESS,
      amount: MINT_AMOUNT
    }
    
    const VALID_SIGNATURE = await mintSigner._signTypedData(PROTOCOL_DOMAIN, MintDataType, mintArgs);
    
    const AttackerContract = await ethers.getContractFactory("Attacker")
    const attackerContract = await AttackerContract.connect(attacker).deploy(protocol.address, VALID_SIGNATURE, MINT_AMOUNT);

    expect(attackerContract.address).to.be.equal(ethers.utils.getAddress(attackerContractAddress));

    return {
      embToken,
      tokenName,
      tokenSymbol,
      protocol,
      attackerContract,
      owner,
      mintSigner,
      attacker,
      PROTOCOL_DOMAIN,
      TO_ADDRESS,
      MINT_AMOUNT,
      mintArgs,
      VALID_SIGNATURE
    };
  }

  describe("Reentrancy attack", () => {
    it("Should fail to do a reentrancy attack", async () => {
      const {
        attackerContract,
        embToken,
        MINT_AMOUNT
      } = await loadFixture(reentrancyAttackPreparationFixture);

      await expect(attackerContract.attack()).to.changeTokenBalance(embToken, attackerContract, MINT_AMOUNT);
      await expect(attackerContract.attack()).to.be.reverted;
    });
  });
});