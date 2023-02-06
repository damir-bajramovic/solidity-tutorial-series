# Solidity Tutorial Series, part 1: Showcase of ERC712 Mint in ERC20 tokens 

In the efforts to make Web3 world accessible to more people, and because of my love for teaching, I decided to start this tutorial series. It's a work in progress, and this is the first part. Medium article link will soon be available. 

This is a showcase of how to use ERC712 to mint tokens, as well as how to use low level calls when interacting with smart contracts, and certain peculiarities that come with using low level calls which make the use of EVM assembly mandatory in the contracts.

## General idea
Two contracts were provided, `SignatureMintErc20.sol` and `Protocol.sol`.
`SignatureMintErc20.sol` is to be deployed first, followed by the `Protocol.sol` where the `SignatureMintErc20` address is passed through the constructor, along with the `mintSigner` address.
After deploying both contracts, the `SignatureMintErc20` `owner` will call `setProtocol` function in the `SignatureMintErc20` contract with the `Protocol` contract address as an argument. 

Only the `Protocol` contract can call the `mint` function of the `SignatureMintErc20` contract.
This ensures that minting can be done in a controlled manner. After the minting process is complete, the `SignatureMintErc20` `owner` is to call `setProtocol` function and pass either the zero address, or the `dead` (`0x000000000000000000000000000000000000dEaD`) address and renounce ownership, to ensure the token supply integrity. 

The `mintSigner` address is immutable, so it is crucial to keep it's private key safe. If the private key is compromised in any way, re-deploying the `Protocol` contract as fast as possible and calling the `setProtocol` function with the new contract address is crucial for security reasons.

Everyone does their minting on their own, after the signatures have been shared (off-chain), by calling the `signatureMint` function of the `Protocol` contract.

The `Protocol` contract calls the `SignatureMintErc20` token contract, where minting happens. When deploying the `Protocol` contract, the `mintableToken` variable is immutable, so it's only settable by the constructor, which requires it not to be an externally-owned account (EOA). Given the use of low-level calls, weird things can happen if the `mintableToken` is set to be an EOA.

## Installing

It is required to have `hardhat` npm package available on your machine.

```shell
npm i hardhat -g
```

Afterwards, to install the `npm` packages, run:
```shell
npm i
```

## Testing

To test the contracts, run:
```shell
npm run test
```

To test the contracts on the local network, run:
```shell
npm run test --network localhost
```

For gas report, run:
```shell
npm run gas-reporter
```

For code coverage, run:
```shell
npm run coverage
```

For deploying on local hardhat network, run a hardhat node in one terminal:
```shell
npx hardhat node
```

And in the other terminal, run:
```shell
npx hardhat run ./scripts/deploy.ts --network localhost
```

## Development

For linting the smart contracts using `solhint`, run:

```shell
npm run lint
```

## Possible extensions, and further explanations

One of the things that would be nice to do is to extend the project to be deployable to live networks (production and test-nets).

Also, it is debatable should the signature parameteres, `v`, `r`, `s` be passed to the `signatureMint` function of the `Protocol` contract individually, where signature is split off-chain, or, for the sake of the user-experience to do it on-chain, where user needs to pass in less arguments, if they decide to do the minting from a website like `etherscan.io`.

The `SignatureMintErc20` token is `Ownable`. The `SignatureMintErc20` token is the "control center" now.

Low-level calls, like `address.call(...)` could be avoided by using an interface, but for the purposes of this tutorial, we decided not to import additional contracts.

It is paramount to make sure that the address of the token is actually a contract, not an EOA (Externally Owned Account). External calls made by using `address.call(...)` will not revert if there is no code present which can revert them. The EOAs don't have any code present in them, so the reverting doesn't happen. Checking if the token is actually a contract is done with the opcode `extcodesize` which is 0 if the address is an EOA. When a contract is deployed to that address, the state changes, so the `extcodesize` will return a value greater than 0.


It would be nice to add linting and formatting for TypeScript files.

Also:
- Scripts for verifying contracts on Etherscan
- Scripts for running various contract functions for interacting on live-networks
- Actually using an interface, instead of low-level calls in `Protocol` for interaction with the `SignatureMintErc20` token.
- Adding tests that would cover different signature styles, which are covered by the `ECDSA` library in the `Protocol` contract, just in case.