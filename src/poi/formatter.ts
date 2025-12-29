import type { SnarkjsProof } from 'snarkjs'

import { numberStringToUint8Array, uint8ArrayToHexString, uint8ArrayToNumberString } from '../core/bytes'

import type { POICircuitInputs, POIPublicInputs, POISnarkjsFormattedCircuitInputs, Proof } from './types'

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

export { standardToSnarkJSInput, snarkJSToStandardProof, extractPublicInputsFromCircuitInputs, standardToSnarkJSProof, standardToSnarkJSPublicInputs }
