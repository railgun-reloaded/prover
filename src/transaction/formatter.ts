import { bigIntToBytes, bytesToBigInt, bytesToHex, hexToBytes } from '@railgun-reloaded/bytes'
import type { SnarkjsProof } from 'snarkjs'

import type { Proof, SnarkJSCircuitInputFormat, TransactionBigintInputs, TransactionCircuitInputs, TransactionPublicInputs } from './types'

/**
 * Convert inputs to snarkJS format
 * @param circuitInputs - Circuit inputs to format
 * @returns Formatted snarkJS inputs
 */
function standardToSnarkJSInput (circuitInputs: TransactionCircuitInputs): SnarkJSCircuitInputFormat {
  return {
    merkleRoot: bytesToHex(circuitInputs.merkleRoot, { prefix: true }),
    boundParamsHash: bytesToHex(circuitInputs.boundParamsHash, { prefix: true }),
    nullifiers: circuitInputs.inputTXOs.map(txo => bytesToHex(txo.nullifier, { prefix: true })),
    commitmentsOut: circuitInputs.outputTXOs.map(txo => bytesToHex(txo.commitment, { prefix: true })),
    token: bytesToHex(circuitInputs.token, { prefix: true }),
    publicKey: circuitInputs.publicKey.map((b) => bytesToHex(b, { prefix: true })),
    signature: circuitInputs.signature.map((b) => bytesToHex(b, { prefix: true })),
    randomIn: circuitInputs.inputTXOs.map(txo => bytesToHex(txo.randomIn, { prefix: true })),
    valueIn: circuitInputs.inputTXOs.map(txo => txo.valueIn.toString()),
    pathElements: circuitInputs.inputTXOs.map(txo => txo.pathElements.map((b) => bytesToHex(b, { prefix: true }))),
    leavesIndices: circuitInputs.inputTXOs.map(txo => txo.merkleleafPosition),
    nullifyingKey: bytesToHex(circuitInputs.nullifyingKey, { prefix: true }),
    npkOut: circuitInputs.outputTXOs.map(txo => bytesToHex(txo.npk, { prefix: true })),
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
    publicKey: snarkJSInput.publicKey.map((b) => hexToBytes(b)),
    signature: snarkJSInput.signature.map((b) => hexToBytes(b)),
    inputTXOs: snarkJSInput.nullifiers.map((_, i) => ({
      nullifier: hexToBytes(snarkJSInput.nullifiers[i]!),
      randomIn: hexToBytes(snarkJSInput.randomIn[i]!),
      valueIn: BigInt(snarkJSInput.valueIn[i]!),
      merkleleafPosition: Number(snarkJSInput.leavesIndices[i]),
      pathElements: snarkJSInput.pathElements[i]!.map((b) => hexToBytes(b)),
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
function standardToSnarkJSPublicInputs (publicInputs: TransactionPublicInputs) : string[] {
  return [
    bytesToBigInt(publicInputs.merkleRoot).toString(),
    bytesToBigInt(publicInputs.boundParams).toString(),
    ...publicInputs.nullifiers.map((b) => bytesToBigInt(b).toString()),
    ...publicInputs.commitments.map((b) => bytesToBigInt(b).toString())
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
  const toBytes = (val: bigint) => bigIntToBytes(val, 32)
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
