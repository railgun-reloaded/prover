import type { Proof, ProverArtifacts, VKey } from '../types'

/**
 * Bigint-based transaction circuit inputs matching the engine's FormattedCircuitInputsRailgun.
 * Used at the adapter boundary when receiving inputs from the engine.
 */
type TransactionBigintInputs = {
  merkleRoot: bigint
  boundParamsHash: bigint
  nullifiers: bigint[]
  commitmentsOut: bigint[]
  token: bigint
  publicKey: bigint[]
  signature: bigint[]
  randomIn: bigint[]
  valueIn: bigint[]
  pathElements: bigint[]
  leavesIndices: bigint[]
  nullifyingKey: bigint
  npkOut: bigint[]
  valueOut: bigint[]
}

/**
 * Standard representation of circuit inputs
 */
type TransactionCircuitInputs = {
  merkleRoot: Uint8Array,
  boundParamsHash: Uint8Array,
  token: Uint8Array,
  publicKey: Uint8Array[],
  signature: Uint8Array[],
  nullifyingKey: Uint8Array,
  inputTXOs: {
    nullifier: Uint8Array,
    randomIn: Uint8Array,
    valueIn: bigint,
    merkleleafPosition: number,
    pathElements: Uint8Array[],
  }[],
  outputTXOs: {
    commitment: Uint8Array,
    npk: Uint8Array,
    value: bigint,
  }[],
}
/**
 * SnarkJS representation of circuit inputs
 */
type SnarkJSCircuitInputFormat = {
  merkleRoot: string,
  boundParamsHash: string,
  nullifiers: string[],
  commitmentsOut: string[],
  token: string,
  publicKey: string[],
  signature: string[],
  randomIn: string[],
  valueIn: string[],
  pathElements: string[][],
  leavesIndices: number[],
  nullifyingKey: string,
  npkOut: string[],
  valueOut: string[]
}

/**
 * PublicInputs for verifying, returned by prove()
 * NOTE: PublicInputs is the same as PublicSignals
 */
type TransactionPublicInputs = {
  proof: Proof;
  merkleRoot: Uint8Array;
  nullifiers: Uint8Array[];
  commitments: Uint8Array[];
  boundParams: Uint8Array; // Return a hash; interface is not important to circuit interaction
}

export type { Proof, SnarkJSCircuitInputFormat, TransactionBigintInputs, TransactionCircuitInputs, TransactionPublicInputs, ProverArtifacts, VKey }
