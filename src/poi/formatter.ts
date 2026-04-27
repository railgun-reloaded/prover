import { bigIntToBytes, bytesToBigInt, bytesToHex, hexToBytes } from '@railgun-reloaded/bytes'
import type { SnarkjsProof } from 'snarkjs'

import type { POIBigintInputs, POICircuitInputs, POIPublicInputs, POISnarkjsFormattedCircuitInputs, Proof } from './types'

/**
 * Encodes a byte array as a `0x`-prefixed lowercase hex string.
 * @param b - Bytes to encode.
 * @returns `0x`-prefixed hex string.
 */
const toPrefixedHex = (b: Uint8Array): string => bytesToHex(b, { prefix: true })

/**
 * Encodes a byte array as a decimal big-integer string.
 * @param b - Bytes to encode (big-endian).
 * @returns Decimal string representation.
 */
const toDecimalString = (b: Uint8Array): string => bytesToBigInt(b).toString()

/**
 * Decodes a decimal or `0x`-prefixed hex string into a fixed-length byte array.
 * @param s - Decimal or hex numeric string.
 * @param byteLength - Target byte length.
 * @returns Big-endian byte array of exactly `byteLength` bytes.
 */
const fromNumericString = (s: string, byteLength: number): Uint8Array => bigIntToBytes(BigInt(s), byteLength)

/**
 * Convert inputs to snarkJS format
 * @param circuitInputs - Circuit inputs to format
 * @returns Formatted snarkJS inputs
 */
function standardToSnarkJSInput (circuitInputs: POICircuitInputs): POISnarkjsFormattedCircuitInputs {
  return {
    anyRailgunTxidMerklerootAfterTransaction: toPrefixedHex(circuitInputs.anyRailgunTxidMerklerootAfterTransaction),
    poiMerkleroots: circuitInputs.poiMerkleroots.map(toPrefixedHex),
    boundParamsHash: toPrefixedHex(circuitInputs.boundParamsHash),
    nullifiers: circuitInputs.nullifiers.map(toPrefixedHex),
    commitmentsOut: circuitInputs.commitmentsOut.map(toPrefixedHex),
    spendingPublicKey: circuitInputs.spendingPublicKey.map(toPrefixedHex),
    nullifyingKey: toPrefixedHex(circuitInputs.nullifyingKey),
    token: toPrefixedHex(circuitInputs.token),
    randomsIn: circuitInputs.randomsIn.map(toPrefixedHex),
    valuesIn: circuitInputs.valuesIn.map(val => val.toString()),
    utxoPositionsIn: circuitInputs.utxoPositionsIn,
    utxoTreeIn: circuitInputs.utxoTreeIn,
    npksOut: circuitInputs.npksOut.map(toPrefixedHex),
    valuesOut: circuitInputs.valuesOut.map(val => val.toString()),
    utxoBatchGlobalStartPositionOut: toPrefixedHex(circuitInputs.utxoBatchGlobalStartPositionOut),
    railgunTxidIfHasUnshield: toPrefixedHex(circuitInputs.railgunTxidIfHasUnshield),
    railgunTxidMerkleProofIndices: circuitInputs.railgunTxidMerkleProofIndices,
    railgunTxidMerkleProofPathElements: circuitInputs.railgunTxidMerkleProofPathElements.map(toPrefixedHex),
    poiInMerkleProofIndices: circuitInputs.poiInMerkleProofIndices.map(val => val.toString()),
    poiInMerkleProofPathElements: circuitInputs.poiInMerkleProofPathElements.map(txo => txo.map(toPrefixedHex))
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
    poiMerkleroots: snarkJSInput.poiMerkleroots.map(hexToBytes),
    boundParamsHash: hexToBytes(snarkJSInput.boundParamsHash),
    nullifiers: snarkJSInput.nullifiers.map(hexToBytes),
    commitmentsOut: snarkJSInput.commitmentsOut.map(hexToBytes),
    spendingPublicKey: snarkJSInput.spendingPublicKey.map(hexToBytes),
    nullifyingKey: hexToBytes(snarkJSInput.nullifyingKey),
    token: hexToBytes(snarkJSInput.token),
    randomsIn: snarkJSInput.randomsIn.map(hexToBytes),
    valuesIn: snarkJSInput.valuesIn.map(val => BigInt(val)),
    utxoPositionsIn: snarkJSInput.utxoPositionsIn,
    utxoTreeIn: snarkJSInput.utxoTreeIn,
    npksOut: snarkJSInput.npksOut.map(hexToBytes),
    valuesOut: snarkJSInput.valuesOut.map(val => BigInt(val)),
    utxoBatchGlobalStartPositionOut: hexToBytes(snarkJSInput.utxoBatchGlobalStartPositionOut),
    railgunTxidIfHasUnshield: hexToBytes(snarkJSInput.railgunTxidIfHasUnshield),
    railgunTxidMerkleProofIndices: snarkJSInput.railgunTxidMerkleProofIndices,
    railgunTxidMerkleProofPathElements: snarkJSInput.railgunTxidMerkleProofPathElements.map(hexToBytes),
    poiInMerkleProofIndices: snarkJSInput.poiInMerkleProofIndices.map(val => Number(val)),
    poiInMerkleProofPathElements: snarkJSInput.poiInMerkleProofPathElements.map(pathArray => pathArray.map(hexToBytes))
  }
}

/**
 * Convert snarkJS proof to standard format
 * @param proof - Proof inputs to format
 * @returns Formatted standard proof
 */
function snarkJSToStandardProof (proof: SnarkjsProof): Proof {
  return {
    a: { x: fromNumericString(proof.pi_a[0], 32), y: fromNumericString(proof.pi_a[1], 32) },
    b: {
      x: [fromNumericString(proof.pi_b[0][1], 32), fromNumericString(proof.pi_b[0][0], 32)],
      y: [fromNumericString(proof.pi_b[1][1], 32), fromNumericString(proof.pi_b[1][0], 32)],
    },
    c: { x: fromNumericString(proof.pi_c[0], 32), y: fromNumericString(proof.pi_c[1], 32) },
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
    pi_a: [toDecimalString(proof.a.x), toDecimalString(proof.a.y)],
    pi_b: [
      [toDecimalString(proof.b.x[1]), toDecimalString(proof.b.x[0])],
      [toDecimalString(proof.b.y[1]), toDecimalString(proof.b.y[0])],
    ],
    pi_c: [toDecimalString(proof.c.x), toDecimalString(proof.c.y)]
  }
}
/**
 * Convert standard public inputs to snarkJS format
 * @param publicInputs - Public inputs to format
 * @returns - Formatted snarkJS public inputs
 */
function standardToSnarkJSPublicInputs (publicInputs: POIPublicInputs) : string[] {
  return [
    ...publicInputs.blindedCommitmentsOut.map(toDecimalString),
    toDecimalString(publicInputs.anyRailgunTxidMerklerootAfterTransaction),
    toDecimalString(publicInputs.railgunTxidIfHasUnshield),
    ...publicInputs.poiMerkleroots.map(toDecimalString)
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
  const toBytes = (val: bigint) => fromNumericString(val.toString(), 32)

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
