//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

/// @title Protocol
/// @author kadro
/// @notice A contract for minting EMB token which allows minters to mint
/// their tokens using signatures.
contract Protocol {
    /// @notice Address of the EMB ERC20 token
    IERC20 public immutable embToken;

    /// @notice The address whose private key will create all the signatures which minters
    /// can use to mint their EMB tokens
    address public immutable mintSigner;

    /// @notice A mapping to keep track of which addresses
    /// have already minted their airdrop
    mapping(address => bool) public alreadyMinted;

    /// @notice the EIP712 domain separator for minting EMB
    bytes32 public immutable eip712DomainSeparator;

    /// @notice EIP-712 typehash for minting EMB
    bytes32 public constant SUPPORT_TYPEHASH =
        keccak256("Mint(address minter,uint256 amount)");

    // Events

    event SignatureMint(address indexed caller, address indexed recipient, uint256 amount);

    // Constructor

    /// @notice Sets the necessary initial minter verification data
    constructor(address _signer, IERC20 _embToken) {
        require(_signer != address(0), "Signer address zero");
        require(address(_embToken) != address(0), "Token address zero");

        // No externally-owned accounts, could cause problems
        uint32 size;
        
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := extcodesize(_embToken)
        }
        require(size > 0, "Token is not a contract");

        // Initialize contract variables
        mintSigner = _signer;
        embToken = _embToken;

        eip712DomainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Protocol")),
                keccak256(bytes("v1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Allows a msg.sender to mint their EMB token by providing a
    /// signature signed by the `Protocol.mintSigner` address.
    /// @dev An address can only mint its EMB once
    /// @dev See `Protocol.toTypedDataHash` for how to format the pre-signed data
    /// @param signature An array of bytes representing a signature created by the
    /// `Protocol.mintSigner` address
    /// @param _to The address the minted EMB should be sent to
    /// @param _amount The amount of EMB to be minted
    function signatureMint(
        bytes memory signature,
        address _to,
        uint256 _amount
    ) external {
        // Fail early
        require(_to != address(0), "To zero address");
        // Replay protection
        require(!alreadyMinted[_to], "Already minted");

        // Create digest
        bytes32 digest = toTypedDataHash(_to, _amount);

        // NOTE: It is also possible to split the signature off-chain, would even be better gas-wise
        // NOTE: It does impact the user-experience a little bit
        // NOTE: If they decide to mint from the contract directly, like using myEtherWallet, or Etherscan
        // NOTE: And not from our website, because there are more arguments to pass in
        // Recover the address
        address recoveredAddress = ECDSA.recover(digest, signature);

        require(
            recoveredAddress != address(0) && recoveredAddress == mintSigner,
            "Signature error"
        );

        // NOTE: No contract importing, that's why it's done this way.
        // Call the mint function
        // solhint-disable-next-line avoid-low-level-calls
        (bool sent, ) = address(embToken).call(
            abi.encodeWithSignature("mint(address,uint256)", _to, _amount)
        );
        require(sent, "EmbToken contract call failed");

        // No replay attacks
        alreadyMinted[_to] = true;

        // Emit event
        emit SignatureMint(msg.sender, _to, _amount);
    }

    /// @dev Helper function for formatting the minter data in an EIP-712 compatible way
    /// @param _minter The address which will mint the EMB tokens
    /// @param _amount The amount of EMB to be minted
    /// @return A 32-byte hash, which will have been signed by `Protocol.mintSigner`
    function toTypedDataHash(
        address _minter,
        uint256 _amount
    ) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(SUPPORT_TYPEHASH, _minter, _amount)
        );
        return ECDSA.toTypedDataHash(eip712DomainSeparator, structHash);
    }
}
