import { BigNumber, ethers } from "ethers";

export function calculateDeploymentAddresses(
  deployerAddress: string,
  nonce: BigNumber
): string {
  const nonceHex = nonce.eq(0) ? '0x' : nonce.toHexString();

  const input_arr = [deployerAddress, nonceHex];
  const rlp_encoded = ethers.utils.RLP.encode(input_arr);

  const contract_address_long = ethers.utils.keccak256(rlp_encoded);

  return `0x${contract_address_long.substring(26)}` //Trim the first 24 characters.
}
