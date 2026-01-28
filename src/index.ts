export type {
  Proof,
  TransactionCircuitInputs,
  TransactionPublicInputs,
  SnarkJSCircuitInputFormat,
  ProverArtifacts,
  VKey,
} from './transaction/types'

export type {
  POICircuitInputs,
  POIPublicInputs,
  POISnarkjsFormattedCircuitInputs,
} from './poi/types'

export { standardToSnarkJSInput as standardToSnarkJSTransactionInput } from './transaction/formatter'
export { standardToSnarkJSInput as standardToSnarkJSPOIInput, snarkJSToStandardInput as snarkJSToStandardPOIInput } from './poi/formatter'

export { SnarkjsTransactionProver } from './transaction/prover'
export { SnarkjsPoiProver } from './poi/prover'

export { createGroth16ForEngine, createGroth16FromTransactionProver, createGroth16FromPOIProver } from './core/groth16-adapter'
export type { Groth16Prover } from './core/groth16-adapter'

export {
  hexStringToUint8Array,
  uint8ArrayToHexString,
  uint8ArrayToNumberString,
  numberStringToUint8Array,
  arrayToByteLength,
} from './core/bytes'
