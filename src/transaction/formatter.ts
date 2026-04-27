import { bigIntToBytes, bytesToBigInt, bytesToHex, hexToBytes } from '@railgun-reloaded/bytes'
import type { SnarkjsProof } from 'snarkjs'

import type { Proof, SnarkJSCircuitInputFormat, TransactionBigintInputs, TransactionCircuitInputs, TransactionPublicInputs } from './types'

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
function standardToSnarkJSInput (circuitInputs: TransactionCircuitInputs): SnarkJSCircuitInputFormat {
  return {
    merkleRoot: toPrefixedHex(circuitInputs.merkleRoot),
    boundParamsHash: toPrefixedHex(circuitInputs.boundParamsHash),
    nullifiers: circuitInputs.inputTXOs.map(txo => toPrefixedHex(txo.nullifier)),
    commitmentsOut: circuitInputs.outputTXOs.map(txo => toPrefixedHex(txo.commitment)),
    token: toPrefixedHex(circuitInputs.token),
    publicKey: circuitInputs.publicKey.map(toPrefixedHex),
    signature: circuitInputs.signature.map(toPrefixedHex),
    randomIn: circuitInputs.inputTXOs.map(txo => toPrefixedHex(txo.randomIn)),
    valueIn: circuitInputs.inputTXOs.map(txo => txo.valueIn.toString()),
    pathElements: circuitInputs.inputTXOs.map(txo => txo.pathElements.map(toPrefixedHex)),
    leavesIndices: circuitInputs.inputTXOs.map(txo => txo.merkleleafPosition),
    nullifyingKey: toPrefixedHex(circuitInputs.nullifyingKey),
    npkOut: circuitInputs.outputTXOs.map(txo => toPrefixedHex(txo.npk)),
    valueOut: circuitInputs.outputTXOs.map(txo => txo.value.toString()),
  }
}
/**
 * Convert snarkJS formatted inputs back to standard TransactionCircuitInputs
 * @param snarkJSInput - Formatted snarkJS inputs
 * @returns Standard circuit inputs with Uint8Arrays and BigInts
 */
function snarkJSToStandardInput (snarkJSInput: SnarkJSCircuitInputFormat): TransactionCircuitInputs {
  return {
    merkleRoot: hexToBytes(snarkJSInput.merkleRoot),
    boundParamsHash: hexToBytes(snarkJSInput.boundParamsHash),
    token: hexToBytes(snarkJSInput.token),
    nullifyingKey: hexToBytes(snarkJSInput.nullifyingKey),
    publicKey: snarkJSInput.publicKey.map(hexToBytes),
    signature: snarkJSInput.signature.map(hexToBytes),
    inputTXOs: snarkJSInput.nullifiers.map((_, i) => ({
      nullifier: hexToBytes(snarkJSInput.nullifiers[i]!),
      randomIn: hexToBytes(snarkJSInput.randomIn[i]!),
      valueIn: BigInt(snarkJSInput.valueIn[i]!),
      merkleleafPosition: Number(snarkJSInput.leavesIndices[i]),
      pathElements: snarkJSInput.pathElements[i]!.map(hexToBytes),
    })),
    outputTXOs: snarkJSInput.commitmentsOut.map((_, i) => ({
      commitment: hexToBytes(snarkJSInput.commitmentsOut[i]!),
      npk: hexToBytes(snarkJSInput.npkOut[i]!),
      value: BigInt(snarkJSInput.valueOut[i]!),
    })),
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
 * @returns Formatted PublicInputs to be used in verify()
 */
function extractPublicInputsFromCircuitInputs (circuitInputs: TransactionCircuitInputs, proof: Proof): TransactionPublicInputs {
  return {
    proof,
    merkleRoot: circuitInputs.merkleRoot,
    nullifiers: circuitInputs.inputTXOs.map(txo => txo.nullifier),
    commitments: circuitInputs.outputTXOs.map(txo => txo.commitment),
    boundParams: circuitInputs.boundParamsHash
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
function standardToSnarkJSPublicInputs (publicInputs: TransactionPublicInputs) : string[] {
  return [
    toDecimalString(publicInputs.merkleRoot),
    toDecimalString(publicInputs.boundParams),
    ...publicInputs.nullifiers.map(toDecimalString),
    ...publicInputs.commitments.map(toDecimalString)
  ]
}

/**
 * Convert bigint-based inputs to standard Uint8Array circuit inputs.
 * Handles the flat pathElements array by deriving tree depth from input count.
 * @param inputs - Bigint-based transaction inputs.
 * @returns Standard TransactionCircuitInputs with Uint8Array field elements.
 */
function bigintToTransactionCircuitInputs (inputs: TransactionBigintInputs): TransactionCircuitInputs {
  /**
   * Convert a bigint field element to a 32-byte Uint8Array.
   * @param val - Bigint field element.
   * @returns 32-byte Uint8Array representation of the field element.
   */
  const toBytes = (val: bigint) => fromNumericString(val.toString(), 32)
  const numInputs = inputs.leavesIndices.length
  const treeDepth = numInputs > 0 ? inputs.pathElements.length / numInputs : 0

  return {
    merkleRoot: toBytes(inputs.merkleRoot),
    boundParamsHash: toBytes(inputs.boundParamsHash),
    token: toBytes(inputs.token),
    nullifyingKey: toBytes(inputs.nullifyingKey),
    publicKey: inputs.publicKey.map(toBytes),
    signature: inputs.signature.map(toBytes),
    inputTXOs: inputs.leavesIndices.map((leafIndex, i) => ({
      nullifier: toBytes(inputs.nullifiers[i]!),
      randomIn: toBytes(inputs.randomIn[i]!),
      valueIn: inputs.valueIn[i]!,
      merkleleafPosition: Number(leafIndex),
      pathElements: inputs.pathElements.slice(i * treeDepth, (i + 1) * treeDepth).map(toBytes),
    })),
    outputTXOs: inputs.commitmentsOut.map((commitment, i) => ({
      commitment: toBytes(commitment),
      npk: toBytes(inputs.npkOut[i]!),
      value: inputs.valueOut[i]!,
    })),
  }
}

export { standardToSnarkJSInput, snarkJSToStandardProof, extractPublicInputsFromCircuitInputs, standardToSnarkJSProof, standardToSnarkJSPublicInputs, snarkJSToStandardInput, bigintToTransactionCircuitInputs }
