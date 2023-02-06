//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/// @title EMB Token
/// @author kadro
/// @notice A simple ERC20 token that will be distributed by the protocol
contract EMBToken is ERC20, Ownable {

    // Variables

    address public protocol;

    // Events

    event ProtocolChanged(address indexed _oldProtocol, address indexed _newProtocol);

    // Constructor

    // solhint-disable-next-line no-empty-blocks
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) { }

    // External functions

    /**
     * Setter for the protocol variable, the caller of the mint function.
     * @param _protocol Address of the Protocol contract that will check mint conditions for the minters.
     */
    function setProtocol(address _protocol) external onlyOwner {
        // Settable to address zero, so that minting can be closed.
        address oldProtocol = protocol;
        protocol = _protocol;
        emit ProtocolChanged(oldProtocol, protocol);
    }

    /**
     * Distribute tokens to an address.
     * @param account Recipient address of the token.
     * @param amount Amount of token to receive.
     */
    function mint(address account, uint256 amount) external {
        require(_msgSender() == protocol, "Only protocol");
        _mint(account, amount);
    }
}