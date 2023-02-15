import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { constants, TypedDataDomain } from "ethers";
import { _TypedDataEncoder } from "ethers/lib/utils";
import { MintDataType } from "../helpers/types/eip712";
import { MintArgs } from "../helpers/types";

const OWNABLE_ERROR_MESSAGE = "Ownable: caller is not the owner";
const PROTOCOL_ERROR_MESSAGE = "Only protocol";

describe("Protocol", function () {
  async function prepareContractsFixture() {
    const tokenName = "EMB Token";
    const tokenSymbol = "EMB";

    const [owner, mintSigner, recipient] = await ethers.getSigners();

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

    const TO_ADDRESS = recipient.address;
    const MINT_AMOUNT = constants.WeiPerEther;

    const mintArgs: MintArgs = {
      minter: TO_ADDRESS,
      amount: MINT_AMOUNT
    }

    const VALID_SIGNATURE = await mintSigner._signTypedData(PROTOCOL_DOMAIN, MintDataType, mintArgs);

    return {
      embToken,
      tokenName,
      tokenSymbol,
      protocol,
      owner,
      mintSigner,
      recipient,
      PROTOCOL_DOMAIN,
      TO_ADDRESS,
      MINT_AMOUNT,
      mintArgs,
      VALID_SIGNATURE
    };
  }

  async function deployIncompatibleTokensFixture() {
    const tokenName = "Incompatible Token";
    const tokenSymbol = "INC";

    const [owner, mintSigner, recipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ERC20");
    const token = await Token.deploy(tokenName, tokenSymbol);

    const Protocol = await ethers.getContractFactory("Protocol");
    const protocol = await Protocol.deploy(mintSigner.address, token.address);

    const PROTOCOL_DOMAIN: TypedDataDomain = {
      name: "Protocol",
      version: "v1",
      chainId: 31337, // 31337 by default for hardhat localhost
      verifyingContract: protocol.address
    }

    const TO_ADDRESS = recipient.address;
    const MINT_AMOUNT = constants.WeiPerEther;

    const mintArgs: MintArgs = {
      minter: TO_ADDRESS,
      amount: MINT_AMOUNT
    }

    const VALID_SIGNATURE = await mintSigner._signTypedData(PROTOCOL_DOMAIN, MintDataType, mintArgs);

    return { 
      token, 
      tokenName, 
      tokenSymbol, 
      protocol, 
      owner, 
      mintSigner, 
      recipient, 
      PROTOCOL_DOMAIN, 
      TO_ADDRESS, 
      MINT_AMOUNT, 
      VALID_SIGNATURE
    };
  }

  describe("Deployment", () => {
    describe("EMBToken", () => {
      it("Should set the name and symbol correctly", async () => {
        const { embToken, tokenName, tokenSymbol } = await loadFixture(prepareContractsFixture);

        expect(await embToken.name()).to.equal(tokenName);
        expect(await embToken.symbol()).to.equal(tokenSymbol)
      });

      it("Should set the owner correctly", async () => {
        const { embToken, owner } = await loadFixture(prepareContractsFixture);

        expect(await embToken.owner()).to.equal(owner.address);
      });
    });

    describe("Protocol", () => {
      it("Should set the signer and the token address correctly", async () => {
        const { protocol, embToken, mintSigner } = await loadFixture(prepareContractsFixture);

        expect(await protocol.mintSigner()).to.equal(mintSigner.address);
        expect(await protocol.embToken()).to.equal(embToken.address);
      });

      it("Should set the domain separator properly", async () => {
        const { protocol, PROTOCOL_DOMAIN } = await loadFixture(prepareContractsFixture);

        const domainHash = ethers.utils._TypedDataEncoder.hashDomain(PROTOCOL_DOMAIN);

        expect(await protocol.eip712DomainSeparator()).to.equal(domainHash);
      });

      it("Should fail to deploy if the mintSigner address is zero", async () => {
        const { embToken } = await loadFixture(prepareContractsFixture);

        const Protocol = await ethers.getContractFactory("Protocol");
        await expect(Protocol.deploy(constants.AddressZero, embToken.address)).to.be.revertedWith("Signer address zero");
      });

      it("Should fail to deploy if the token address is zero", async () => {
        const [, account] = await ethers.getSigners();
        const Protocol = await ethers.getContractFactory("Protocol");
        await expect(Protocol.deploy(account.address, constants.AddressZero)).to.be.revertedWith("Token address zero");
      });

      it("Should fail to deploy if the token address is not a contract", async () => {
        const [, account] = await ethers.getSigners();
        const Protocol = await ethers.getContractFactory("Protocol");
        await expect(Protocol.deploy(account.address, account.address)).to.be.revertedWith("Token is not a contract");
      });
    });
  });

  describe("Setting variables", () => {
    describe("EMBToken", () => {
      it("Should set the protocol properly", async () => {
        const { embToken } = await loadFixture(prepareContractsFixture);

        expect(await embToken.protocol()).to.not.be.equal(constants.AddressZero);
        expect(await embToken.setProtocol(constants.AddressZero)).not.to.be.reverted;
        expect(await embToken.protocol()).to.be.equal(constants.AddressZero);
      });

      it("Should fail if the protocol is set by non-owner", async () => {
        const { embToken, mintSigner } = await loadFixture(prepareContractsFixture);

        const embTokenMintSigner = embToken.connect(mintSigner);
        await expect(embTokenMintSigner.setProtocol(constants.AddressZero)).to.be.revertedWith(OWNABLE_ERROR_MESSAGE);
      });

      describe("Events", async () => {
        it("Should emit ProtocolChanged event upon calling setProtocol", async () => {
          const { embToken, protocol } = await loadFixture(prepareContractsFixture);

          expect(await embToken.setProtocol(constants.AddressZero))
            .to.emit(embToken, "ProtocolChanged")
            .withArgs(protocol.address, constants.AddressZero);
        });
      });
    });
  });

  // Testing weather or not the contract is Ownable, for security and sanity-checking reasons.
  describe("Ownership", () => {
    describe("EMBToken", () => {
      it("Should renounce the ownership", async () => {
        const { embToken } = await loadFixture(prepareContractsFixture);
        expect(await embToken.renounceOwnership()).not.to.be.reverted;
        expect(await embToken.owner()).to.be.equal(constants.AddressZero);
      });

      it("Should fail to reounce the ownership if the caller isn't the owner", async () => {
        const { embToken, mintSigner } = await loadFixture(prepareContractsFixture);
        const embTokenMintSigner = embToken.connect(mintSigner);

        await expect(embTokenMintSigner.renounceOwnership()).to.be.revertedWith(OWNABLE_ERROR_MESSAGE);
      });

      it("Should transfer the ownership", async () => {
        const { embToken, mintSigner } = await loadFixture(prepareContractsFixture);
        expect(await embToken.transferOwnership(mintSigner.address)).not.to.be.reverted;
        expect(await embToken.owner()).to.be.equal(mintSigner.address);
      });

      it("Should fail to transfer the ownership if the caller isn't the owner", async () => {
        const { embToken, mintSigner } = await loadFixture(prepareContractsFixture);
        const embTokenMintSigner = embToken.connect(mintSigner);

        await expect(embTokenMintSigner.transferOwnership(mintSigner.address)).to.be.revertedWith(OWNABLE_ERROR_MESSAGE);
      });
    });
  });

  describe("Minting", function () {
    describe("EMBToken", () => {
      it("Should fail calling mint in EMBToken contract when calling from owner", async () => {
        const { embToken, owner } = await loadFixture(prepareContractsFixture);

        await expect(embToken.mint(owner.address, constants.WeiPerEther))
          .to.be.revertedWith(PROTOCOL_ERROR_MESSAGE);
      });

      it("Should fail calling mint in EMBToken contract when calling from recipient", async () => {
        const { embToken, recipient } = await loadFixture(prepareContractsFixture);

        const embTokenRecipient = embToken.connect(recipient);

        await expect(embTokenRecipient.mint(recipient.address, constants.WeiPerEther))
          .to.be.revertedWith(PROTOCOL_ERROR_MESSAGE);
      });

      it("Should change the totalSupply by the correct amount", async () => {
        const {
          embToken,
          protocol,
          recipient,
          TO_ADDRESS,
          MINT_AMOUNT,
          VALID_SIGNATURE
        } = await loadFixture(prepareContractsFixture);

        const beforeTotalSupply = await embToken.totalSupply();

        await expect(protocol.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT))
          .to.changeTokenBalance(embToken, recipient, MINT_AMOUNT);

        expect(await embToken.totalSupply()).to.be.equal(beforeTotalSupply.add(MINT_AMOUNT));
      });

      describe("Events", () => {
        it("Should emit a Transfer event", async () => {
          const {
            embToken,
            protocol,
            TO_ADDRESS,
            MINT_AMOUNT,
            VALID_SIGNATURE
          } = await loadFixture(prepareContractsFixture);

          await expect(protocol.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT))
            .to.emit(embToken, "Transfer")
            .withArgs(constants.AddressZero, TO_ADDRESS, MINT_AMOUNT);
        });
      });
    });

    describe("Protocol", () => {
      it("Should call mint in EMBToken contract from Protocol contract successfully", async () => {
        const {
          embToken,
          protocol,
          recipient,
          TO_ADDRESS,
          MINT_AMOUNT,
          VALID_SIGNATURE
        } = await loadFixture(prepareContractsFixture);

        await expect(protocol.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT))
          .to.changeTokenBalance(embToken, recipient, MINT_AMOUNT);
      });

      it("Should fail to mint twice using the same signature", async () => {
        const {
          embToken,
          protocol,
          recipient,
          TO_ADDRESS,
          MINT_AMOUNT,
          VALID_SIGNATURE
        } = await loadFixture(prepareContractsFixture);

        await expect(protocol.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT))
          .to.changeTokenBalance(embToken, recipient, MINT_AMOUNT);
        await expect(protocol.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT))
          .to.be.revertedWith("Already minted");
      });

      it("Should fail to mint to zero address", async () => {
        const { protocol, mintSigner, PROTOCOL_DOMAIN, MINT_AMOUNT } = await loadFixture(prepareContractsFixture);

        const TO_ADDRESS = constants.AddressZero;

        const mintArgs: MintArgs = {
          minter: TO_ADDRESS,
          amount: MINT_AMOUNT
        }

        const signature = await mintSigner._signTypedData(PROTOCOL_DOMAIN, MintDataType, mintArgs);

        await expect(protocol.signatureMint(signature, TO_ADDRESS, MINT_AMOUNT))
          .to.be.revertedWith("To zero address");
      });

      it("Should call mint in EMBToken contract from Protocol contract by a non-deployer address successfully", async () => {
        const {
          embToken,
          protocol,
          recipient,
          TO_ADDRESS,
          MINT_AMOUNT,
          VALID_SIGNATURE
        } = await loadFixture(prepareContractsFixture);

        const protocolRecipient = protocol.connect(recipient);

        await expect(protocolRecipient.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT))
          .to.changeTokenBalance(embToken, recipient, MINT_AMOUNT);
      });

      it("Should fail to call mint in EMBToken from protocol if the signature was not created by the mintSigner", async () => {
        const { protocol, recipient, PROTOCOL_DOMAIN, TO_ADDRESS, MINT_AMOUNT } = await loadFixture(prepareContractsFixture);

        const mintArgs: MintArgs = {
          minter: TO_ADDRESS,
          amount: MINT_AMOUNT
        }

        const signature = await recipient._signTypedData(PROTOCOL_DOMAIN, MintDataType, mintArgs);

        await expect(protocol.signatureMint(signature, TO_ADDRESS, MINT_AMOUNT))
          .to.be.revertedWith("Signature error");
      });

      it("Should fail to call signatureMint if the _to is not matching the signature", async () => {
        const {
          protocol,
          mintSigner,
          MINT_AMOUNT,
          VALID_SIGNATURE
        } = await loadFixture(prepareContractsFixture);

        await expect(protocol.signatureMint(VALID_SIGNATURE, mintSigner.address, MINT_AMOUNT))
          .to.be.revertedWith("Signature error");
      });

      it("Should fail to call signatureMint if the _amount is not matching the signature", async () => {
        const {
          protocol,
          TO_ADDRESS,
          MINT_AMOUNT,
          VALID_SIGNATURE
        } = await loadFixture(prepareContractsFixture);

        await expect(protocol.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT.mul(2)))
          .to.be.revertedWith("Signature error");
      });

      describe("Incompatible token, signatureMint fail", () => {
        it("Should fail to call signatureMint if the token is not set correctly", async () => {
          const { 
            protocol,
            TO_ADDRESS,
            MINT_AMOUNT,
            VALID_SIGNATURE
          } = await loadFixture(deployIncompatibleTokensFixture);

          await expect(protocol.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT))
            .to.be.revertedWith("EmbToken contract call failed");
        });
      });

      describe("Events", () => {
        it("Should emit SignatureMint event", async () => {
          const {
            protocol,
            owner,
            TO_ADDRESS,
            MINT_AMOUNT,
            VALID_SIGNATURE
          } = await loadFixture(prepareContractsFixture);

          await expect(protocol.signatureMint(VALID_SIGNATURE, TO_ADDRESS, MINT_AMOUNT))
            .to.emit(protocol, "SignatureMint")
            .withArgs(owner.address, TO_ADDRESS, MINT_AMOUNT);
        });
      });
    });
  });
});
