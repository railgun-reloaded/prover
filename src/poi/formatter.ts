import type { SnarkjsProof } from 'snarkjs'

import { hexStringToUint8Array, numberStringToUint8Array, uint8ArrayToHexString, uint8ArrayToNumberString } from '../bytes'

import type { POIBigintInputs, POICircuitInputs, POIPublicInputs, POISnarkjsFormattedCircuitInputs, Proof } from './types'

/**
 * Convert inputs to snarkJS format
 * @param circuitInputs - Circuit inputs to format
 * @returns Formatted snarkJS inputs
 */
function standardToSnarkJSInput (circuitInputs: POICircuitInputs): POISnarkjsFormattedCircuitInputs {
  return {
    anyRailgunTxidMerklerootAfterTransaction: uint8ArrayToHexString(circuitInputs.anyRailgunTxidMerklerootAfterTransaction),
    poiMerkleroots: circuitInputs.poiMerkleroots.map(uint8ArrayToHexString),
    boundParamsHash: uint8ArrayToHexString(circuitInputs.boundParamsHash),
    nullifiers: circuitInputs.nullifiers.map(uint8ArrayToHexString),
    commitmentsOut: circuitInputs.commitmentsOut.map(uint8ArrayToHexString),
    spendingPublicKey: circuitInputs.spendingPublicKey.map(uint8ArrayToHexString),
    nullifyingKey: uint8ArrayToHexString(circuitInputs.nullifyingKey),
    token: uint8ArrayToHexString(circuitInputs.token),
    randomsIn: circuitInputs.randomsIn.map(uint8ArrayToHexString),
    valuesIn: circuitInputs.valuesIn.map(val => val.toString()),
    utxoPositionsIn: circuitInputs.utxoPositionsIn,
    utxoTreeIn: circuitInputs.utxoTreeIn,
    npksOut: circuitInputs.npksOut.map(uint8ArrayToHexString),
    valuesOut: circuitInputs.valuesOut.map(val => val.toString()),
    utxoBatchGlobalStartPositionOut: uint8ArrayToHexString(circuitInputs.utxoBatchGlobalStartPositionOut),
    railgunTxidIfHasUnshield: uint8ArrayToHexString(circuitInputs.railgunTxidIfHasUnshield),
    railgunTxidMerkleProofIndices: circuitInputs.railgunTxidMerkleProofIndices,
    railgunTxidMerkleProofPathElements: circuitInputs.railgunTxidMerkleProofPathElements.map(uint8ArrayToHexString),
    poiInMerkleProofIndices: circuitInputs.poiInMerkleProofIndices.map(val => val.toString()),
    poiInMerkleProofPathElements: circuitInputs.poiInMerkleProofPathElements.map(txo => txo.map(uint8ArrayToHexString))
  }
}
/**
 * Convert snarkJS formatted inputs back to standard POICircuitInputs
 * @param snarkJSInput - Formatted snarkJS inputs
 * @returns Standard circuit inputs
 */
function snarkJSToStandardInput (snarkJSInput: POISnarkjsFormattedCircuitInputs): POICircuitInputs {
  return {
    anyRailgunTxidMerklerootAfterTransaction: hexStringToUint8Array(snarkJSInput.anyRailgunTxidMerklerootAfterTransaction),
    poiMerkleroots: snarkJSInput.poiMerkleroots.map(hexStringToUint8Array),
    boundParamsHash: hexStringToUint8Array(snarkJSInput.boundParamsHash),
    nullifiers: snarkJSInput.nullifiers.map(hexStringToUint8Array),
    commitmentsOut: snarkJSInput.commitmentsOut.map(hexStringToUint8Array),
    spendingPublicKey: snarkJSInput.spendingPublicKey.map(hexStringToUint8Array),
    nullifyingKey: hexStringToUint8Array(snarkJSInput.nullifyingKey),
    token: hexStringToUint8Array(snarkJSInput.token),
    randomsIn: snarkJSInput.randomsIn.map(hexStringToUint8Array),
    valuesIn: snarkJSInput.valuesIn.map(val => BigInt(val)),
    utxoPositionsIn: snarkJSInput.utxoPositionsIn,
    utxoTreeIn: snarkJSInput.utxoTreeIn,
    npksOut: snarkJSInput.npksOut.map(hexStringToUint8Array),
    valuesOut: snarkJSInput.valuesOut.map(val => BigInt(val)),
    utxoBatchGlobalStartPositionOut: hexStringToUint8Array(snarkJSInput.utxoBatchGlobalStartPositionOut),
    railgunTxidIfHasUnshield: hexStringToUint8Array(snarkJSInput.railgunTxidIfHasUnshield),
    railgunTxidMerkleProofIndices: snarkJSInput.railgunTxidMerkleProofIndices,
    railgunTxidMerkleProofPathElements: snarkJSInput.railgunTxidMerkleProofPathElements.map(hexStringToUint8Array),
    poiInMerkleProofIndices: snarkJSInput.poiInMerkleProofIndices.map(val => Number(val)),
    poiInMerkleProofPathElements: snarkJSInput.poiInMerkleProofPathElements.map(pathArray => pathArray.map(hexStringToUint8Array))
  }
}

/**
 * Convert snarkJS proof to standard format
 * @param proof - Proof inputs to format
 * @returns Formatted standard proof
 */
function snarkJSToStandardProof (proof: SnarkjsProof): Proof {
  return {
    a: { x: numberStringToUint8Array(proof.pi_a[0], 32), y: numberStringToUint8Array(proof.pi_a[1], 32) },
    b: {
      x: [numberStringToUint8Array(proof.pi_b[0][1], 32), numberStringToUint8Array(proof.pi_b[0][0], 32)],
      y: [numberStringToUint8Array(proof.pi_b[1][1], 32), numberStringToUint8Array(proof.pi_b[1][0], 32)],
    },
    c: { x: numberStringToUint8Array(proof.pi_c[0], 32), y: numberStringToUint8Array(proof.pi_c[1], 32) },
  }
}

/**
 * Extract PublicInputs from CircuitInputs to be used in verify() after a prove() call
 * @param circuitInputs - CircuitInputs
 * @param proof - Standard Proof
 * @param blindedCommitmentsOut - blindedCommitmentsOut from the circuit output
 * @returns Formatted PublicInputs to be used in verify()
 */
function extractPublicInputsFromCircuitInputs (circuitInputs: POICircuitInputs, proof: Proof, blindedCommitmentsOut:Uint8Array[]): POIPublicInputs {
  return {
    proof,
    blindedCommitmentsOut,
    poiMerkleroots: circuitInputs.poiMerkleroots,
    anyRailgunTxidMerklerootAfterTransaction: circuitInputs.anyRailgunTxidMerklerootAfterTransaction,
    railgunTxidIfHasUnshield: circuitInputs.railgunTxidIfHasUnshield
  }
}

/**
 * Convert standard proof to snarkJS format
 * @param proof - Proof inputs to format
 * @returns Formatted snarkJS proof
 */
function standardToSnarkJSProof (proof: Proof): SnarkjsProof {
  return {
    protocol: 'groth16',
    pi_a: [uint8ArrayToNumberString(proof.a.x), uint8ArrayToNumberString(proof.a.y)],
    pi_b: [
      [uint8ArrayToNumberString(proof.b.x[1]), uint8ArrayToNumberString(proof.b.x[0])],
      [uint8ArrayToNumberString(proof.b.y[1]), uint8ArrayToNumberString(proof.b.y[0])],
    ],
    pi_c: [uint8ArrayToNumberString(proof.c.x), uint8ArrayToNumberString(proof.c.y)]
  }
}
/**
 * Convert standard public inputs to snarkJS format
 * @param publicInputs - Public inputs to format
 * @returns - Formatted snarkJS public inputs
 */
function standardToSnarkJSPublicInputs (publicInputs: POIPublicInputs) : string[] {
  return [
    ...publicInputs.blindedCommitmentsOut.map(uint8ArrayToNumberString),
    uint8ArrayToNumberString(publicInputs.anyRailgunTxidMerklerootAfterTransaction),
    uint8ArrayToNumberString(publicInputs.railgunTxidIfHasUnshield),
    ...publicInputs.poiMerkleroots.map(uint8ArrayToNumberString)
  ]
}

/**
 * Convert bigint-based inputs to standard Uint8Array POI circuit inputs.
 * @param inputs - Bigint-based POI inputs.
 * @returns Standard POICircuitInputs with Uint8Array field elements.
 */
function bigintToPOICircuitInputs (inputs: POIBigintInputs): POICircuitInputs {
  /**
   * Convert a bigint field element to a 32-byte Uint8Array.
   * @param val - Bigint field element.
   * @returns 32-byte Uint8Array representation of the field element.
   */
  const toBytes = (val: bigint) => numberStringToUint8Array(val.toString(), 32)

  return {
    anyRailgunTxidMerklerootAfterTransaction: toBytes(inputs.anyRailgunTxidMerklerootAfterTransaction),
    poiMerkleroots: inputs.poiMerkleroots.map(toBytes),
    boundParamsHash: toBytes(inputs.boundParamsHash),
    nullifiers: inputs.nullifiers.map(toBytes),
    commitmentsOut: inputs.commitmentsOut.map(toBytes),
    spendingPublicKey: inputs.spendingPublicKey.map(toBytes),
    nullifyingKey: toBytes(inputs.nullifyingKey),
    token: toBytes(inputs.token),
    randomsIn: inputs.randomsIn.map(toBytes),
    valuesIn: inputs.valuesIn,
    utxoPositionsIn: inputs.utxoPositionsIn.map(Number),
    utxoTreeIn: Number(inputs.utxoTreeIn),
    npksOut: inputs.npksOut.map(toBytes),
    valuesOut: inputs.valuesOut,
    utxoBatchGlobalStartPositionOut: toBytes(inputs.utxoBatchGlobalStartPositionOut),
    railgunTxidIfHasUnshield: toBytes(inputs.railgunTxidIfHasUnshield),
    railgunTxidMerkleProofIndices: Number(inputs.railgunTxidMerkleProofIndices),
    railgunTxidMerkleProofPathElements: inputs.railgunTxidMerkleProofPathElements.map(toBytes),
    poiInMerkleProofIndices: inputs.poiInMerkleProofIndices.map(Number),
    poiInMerkleProofPathElements: inputs.poiInMerkleProofPathElements.map(path => path.map(toBytes)),
  }
}

export { standardToSnarkJSInput, snarkJSToStandardProof, extractPublicInputsFromCircuitInputs, standardToSnarkJSProof, standardToSnarkJSPublicInputs, snarkJSToStandardInput, bigintToPOICircuitInputs }
