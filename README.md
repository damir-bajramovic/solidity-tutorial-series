# Embed Protocol Interview Solidity Engineer Solution

This is a solution to the Embed Protocol Interview Assignment for a Solidity Engineer position.
The original repository can be found [here](https://github.com/Embed-protocol/interview-assignments/tree/main/Solidity%20Engineer).

## General idea
Two contracts were provided, `EMB.sol` and `Protocol.sol`.
`EMB.sol` is to be deployed first, followed by the `Protocol.sol` where the `EMB` address is passed through the constructor, along with the `mintSigner` address.
After deploying both contracts, the `EMB` `owner` will call `setProtocol` function in the `EMB` contract with the `Protocol` contract address as an argument. 

Only the `Protocol` contract can call the `mint` function of the `EMB` contract.
This ensures that minting can be done in a controlled manner. After the minting process is complete, the `EMB` `owner` is to call `setProtocol` function and pass either the zero address, or the dead address and renounce ownership, to ensure the token supply integrity. 

The `mintSigner` address is immutable, so it is crucial to keep it's private key safe. If the private key is compromised in any way, re-deploying the `Protocol` contract as fast as possible and calling the `setProtocol` function with the new contract address is crucial for security reasons.

Everyone does their minting on their own, after the signatures have been shared, by calling the `signatureMint` function of the `Protocol` contract.

The `Protocol` contract calls the `EMB` token contract, where minting happens. When deploying the `Protocol` contract, the `embToken` variable is immutable, so it's only settable by the constructor, which requires it not to be an externally-owned account (EOA). Given the use of low-level calls, weird things can happen if the `embToken` is set to be an EOA.

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

Low-level calls, like `address.call(...)` could be avoided by using an interface, but the constraint was set not to import additional contracts.

The `EMB` token is `Ownable` just to save some time and not write the functions that we need to use ourselves. The `EMB` token is the control center now.

It would be nice to add linting and formatting for TypeScript files.

Also:
- Scripts for verifying contracts on Etherscan
- Scripts for running various contract functions for interacting on live-networks
- Actually using an interface, instead of low-level calls in `Protocol` for interaction with the `EMB` token.
- Adding tests that would cover different signature styles, which are covered by the `ECDSA` library in the `Protocol` contract, just in case.