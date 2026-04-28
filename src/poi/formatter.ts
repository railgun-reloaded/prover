import { bigIntToBytes, bytesToBigInt, bytesToHex, hexToBytes } from '@railgun-reloaded/bytes'
import type { SnarkjsProof } from 'snarkjs'

import type { POIBigintInputs, POICircuitInputs, POIPublicInputs, POISnarkjsFormattedCircuitInputs, Proof } from './types'

/**
 * Convert inputs to snarkJS format
 * @param circuitInputs - Circuit inputs to format
 * @returns Formatted snarkJS inputs
 */
function standardToSnarkJSInput (circuitInputs: POICircuitInputs): POISnarkjsFormattedCircuitInputs {
  return {
    anyRailgunTxidMerklerootAfterTransaction: bytesToHex(circuitInputs.anyRailgunTxidMerklerootAfterTransaction, { prefix: true }),
    poiMerkleroots: circuitInputs.poiMerkleroots.map((b) => bytesToHex(b, { prefix: true })),
    boundParamsHash: bytesToHex(circuitInputs.boundParamsHash, { prefix: true }),
    nullifiers: circuitInputs.nullifiers.map((b) => bytesToHex(b, { prefix: true })),
    commitmentsOut: circuitInputs.commitmentsOut.map((b) => bytesToHex(b, { prefix: true })),
    spendingPublicKey: circuitInputs.spendingPublicKey.map((b) => bytesToHex(b, { prefix: true })),
    nullifyingKey: bytesToHex(circuitInputs.nullifyingKey, { prefix: true }),
    token: bytesToHex(circuitInputs.token, { prefix: true }),
    randomsIn: circuitInputs.randomsIn.map((b) => bytesToHex(b, { prefix: true })),
    valuesIn: circuitInputs.valuesIn.map(val => val.toString()),
    utxoPositionsIn: circuitInputs.utxoPositionsIn,
    utxoTreeIn: circuitInputs.utxoTreeIn,
    npksOut: circuitInputs.npksOut.map((b) => bytesToHex(b, { prefix: true })),
    valuesOut: circuitInputs.valuesOut.map(val => val.toString()),
    utxoBatchGlobalStartPositionOut: bytesToHex(circuitInputs.utxoBatchGlobalStartPositionOut, { prefix: true }),
    railgunTxidIfHasUnshield: bytesToHex(circuitInputs.railgunTxidIfHasUnshield, { prefix: true }),
    railgunTxidMerkleProofIndices: circuitInputs.railgunTxidMerkleProofIndices,
    railgunTxidMerkleProofPathElements: circuitInputs.railgunTxidMerkleProofPathElements.map((b) => bytesToHex(b, { prefix: true })),
    poiInMerkleProofIndices: circuitInputs.poiInMerkleProofIndices.map(val => val.toString()),
    poiInMerkleProofPathElements: circuitInputs.poiInMerkleProofPathElements.map(txo => txo.map((b) => bytesToHex(b, { prefix: true })))
  }
}
/**
 * Convert snarkJS formatted inputs back to standard POICircuitInputs
 * @param snarkJSInput - Formatted snarkJS inputs
 * @returns Standard circuit inputs
 */
function snarkJSToStandardInput (snarkJSInput: POISnarkjsFormattedCircuitInputs): POICircuitInputs {
  return {
    anyRailgunTxidMerklerootAfterTransaction: hexToBytes(snarkJSInput.anyRailgunTxidMerklerootAfterTransaction),
    poiMerkleroots: snarkJSInput.poiMerkleroots.map((b) => hexToBytes(b)),
    boundParamsHash: hexToBytes(snarkJSInput.boundParamsHash),
    nullifiers: snarkJSInput.nullifiers.map((b) => hexToBytes(b)),
    commitmentsOut: snarkJSInput.commitmentsOut.map((b) => hexToBytes(b)),
    spendingPublicKey: snarkJSInput.spendingPublicKey.map((b) => hexToBytes(b)),
    nullifyingKey: hexToBytes(snarkJSInput.nullifyingKey),
    token: hexToBytes(snarkJSInput.token),
    randomsIn: snarkJSInput.randomsIn.map((b) => hexToBytes(b)),
    valuesIn: snarkJSInput.valuesIn.map(val => BigInt(val)),
    utxoPositionsIn: snarkJSInput.utxoPositionsIn,
    utxoTreeIn: snarkJSInput.utxoTreeIn,
    npksOut: snarkJSInput.npksOut.map((b) => hexToBytes(b)),
    valuesOut: snarkJSInput.valuesOut.map(val => BigInt(val)),
    utxoBatchGlobalStartPositionOut: hexToBytes(snarkJSInput.utxoBatchGlobalStartPositionOut),
    railgunTxidIfHasUnshield: hexToBytes(snarkJSInput.railgunTxidIfHasUnshield),
    railgunTxidMerkleProofIndices: snarkJSInput.railgunTxidMerkleProofIndices,
    railgunTxidMerkleProofPathElements: snarkJSInput.railgunTxidMerkleProofPathElements.map((b) => hexToBytes(b)),
    poiInMerkleProofIndices: snarkJSInput.poiInMerkleProofIndices.map(val => Number(val)),
    poiInMerkleProofPathElements: snarkJSInput.poiInMerkleProofPathElements.map(pathArray => pathArray.map((b) => hexToBytes(b)))
  }
}

/**
 * Convert snarkJS proof to standard format
 * @param proof - Proof inputs to format
 * @returns Formatted standard proof
 */
function snarkJSToStandardProof (proof: SnarkjsProof): Proof {
  return {
    a: { x: bigIntToBytes(BigInt(proof.pi_a[0]), 32), y: bigIntToBytes(BigInt(proof.pi_a[1]), 32) },
    b: {
      x: [bigIntToBytes(BigInt(proof.pi_b[0][1]), 32), bigIntToBytes(BigInt(proof.pi_b[0][0]), 32)],
      y: [bigIntToBytes(BigInt(proof.pi_b[1][1]), 32), bigIntToBytes(BigInt(proof.pi_b[1][0]), 32)],
    },
    c: { x: bigIntToBytes(BigInt(proof.pi_c[0]), 32), y: bigIntToBytes(BigInt(proof.pi_c[1]), 32) },
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
    pi_a: [bytesToBigInt(proof.a.x).toString(), bytesToBigInt(proof.a.y).toString()],
    pi_b: [
      [bytesToBigInt(proof.b.x[1]).toString(), bytesToBigInt(proof.b.x[0]).toString()],
      [bytesToBigInt(proof.b.y[1]).toString(), bytesToBigInt(proof.b.y[0]).toString()],
    ],
    pi_c: [bytesToBigInt(proof.c.x).toString(), bytesToBigInt(proof.c.y).toString()]
  }
}
/**
 * Convert standard public inputs to snarkJS format
 * @param publicInputs - Public inputs to format
 * @returns - Formatted snarkJS public inputs
 */
function standardToSnarkJSPublicInputs (publicInputs: POIPublicInputs) : string[] {
  return [
    ...publicInputs.blindedCommitmentsOut.map((b) => bytesToBigInt(b).toString()),
    bytesToBigInt(publicInputs.anyRailgunTxidMerklerootAfterTransaction).toString(),
    bytesToBigInt(publicInputs.railgunTxidIfHasUnshield).toString(),
    ...publicInputs.poiMerkleroots.map((b) => bytesToBigInt(b).toString())
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
  const toBytes = (val: bigint) => bigIntToBytes(val, 32)

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
