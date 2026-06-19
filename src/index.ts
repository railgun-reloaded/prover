/// <reference path="./snarkjs.d.ts" />

export type {
  Proof,
  TransactionCircuitInputs,
  TransactionPublicInputs,
  TransactionBigintInputs,
  SnarkJSCircuitInputFormat,
  ProverArtifacts,
  VKey,
} from './transaction/types.js'

export type {
  POICircuitInputs,
  POIPublicInputs,
  POIBigintInputs,
  POISnarkjsFormattedCircuitInputs,
} from './poi/types.js'

export { standardToSnarkJSInput as standardToSnarkJSTransactionInput, snarkJSToStandardInput as snarkJSToStandardTransactionInput } from './transaction/formatter.js'
export { standardToSnarkJSInput as standardToSnarkJSPOIInput, snarkJSToStandardInput as snarkJSToStandardPOIInput } from './poi/formatter.js'

export { SnarkjsTransactionProver } from './transaction/prover.js'
export { SnarkjsPoiProver } from './poi/prover.js'

export { createGroth16ForEngine, createGroth16FromTransactionProver, createGroth16FromPOIProver } from './groth16-adapter.js'
export type { Groth16Prover } from './groth16-adapter.js'
