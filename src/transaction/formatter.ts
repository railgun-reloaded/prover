import type { SnarkjsProof } from 'snarkjs'

import { hexStringToUint8Array, numberStringToUint8Array, uint8ArrayToHexString, uint8ArrayToNumberString } from '../core/bytes'

import type { Proof, SnarkJSCircuitInputFormat, TransactionBigintInputs, TransactionCircuitInputs, TransactionPublicInputs } from './types'

/**
 * Convert inputs to snarkJS format
 * @param circuitInputs - Circuit inputs to format
 * @returns Formatted snarkJS inputs
 */
function standardToSnarkJSInput (circuitInputs: TransactionCircuitInputs): SnarkJSCircuitInputFormat {
  return {
    merkleRoot: uint8ArrayToHexString(circuitInputs.merkleRoot),
    boundParamsHash: uint8ArrayToHexString(circuitInputs.boundParamsHash),
    nullifiers: circuitInputs.inputTXOs.map(txo => uint8ArrayToHexString(txo.nullifier)),
    commitmentsOut: circuitInputs.outputTXOs.map(txo => uint8ArrayToHexString(txo.commitment)),
    token: uint8ArrayToHexString(circuitInputs.token),
    publicKey: circuitInputs.publicKey.map(uint8ArrayToHexString),
    signature: circuitInputs.signature.map(uint8ArrayToHexString),
    randomIn: circuitInputs.inputTXOs.map(txo => uint8ArrayToHexString(txo.randomIn)),
    valueIn: circuitInputs.inputTXOs.map(txo => txo.valueIn.toString()),
    pathElements: circuitInputs.inputTXOs.map(txo => txo.pathElements.map(uint8ArrayToHexString)),
    leavesIndices: circuitInputs.inputTXOs.map(txo => txo.merkleleafPosition),
    nullifyingKey: uint8ArrayToHexString(circuitInputs.nullifyingKey),
    npkOut: circuitInputs.outputTXOs.map(txo => uint8ArrayToHexString(txo.npk)),
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
    merkleRoot: hexStringToUint8Array(snarkJSInput.merkleRoot),
    boundParamsHash: hexStringToUint8Array(snarkJSInput.boundParamsHash),
    token: hexStringToUint8Array(snarkJSInput.token),
    nullifyingKey: hexStringToUint8Array(snarkJSInput.nullifyingKey),
    publicKey: snarkJSInput.publicKey.map(hexStringToUint8Array),
    signature: snarkJSInput.signature.map(hexStringToUint8Array),
    inputTXOs: snarkJSInput.nullifiers.map((_, i) => ({
      nullifier: hexStringToUint8Array(snarkJSInput.nullifiers[i]!),
      randomIn: hexStringToUint8Array(snarkJSInput.randomIn[i]!),
      valueIn: BigInt(snarkJSInput.valueIn[i]!),
      merkleleafPosition: Number(snarkJSInput.leavesIndices[i]),
      pathElements: snarkJSInput.pathElements[i]!.map(hexStringToUint8Array),
    })),
    outputTXOs: snarkJSInput.commitmentsOut.map((_, i) => ({
      commitment: hexStringToUint8Array(snarkJSInput.commitmentsOut[i]!),
      npk: hexStringToUint8Array(snarkJSInput.npkOut[i]!),
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
function standardToSnarkJSPublicInputs (publicInputs: TransactionPublicInputs) : string[] {
  return [
    uint8ArrayToNumberString(publicInputs.merkleRoot),
    uint8ArrayToNumberString(publicInputs.boundParams),
    ...publicInputs.nullifiers.map(uint8ArrayToNumberString),
    ...publicInputs.commitments.map(uint8ArrayToNumberString)
  ]
}

/**
 * Convert bigint-based engine inputs to standard Uint8Array circuit inputs.
 * Handles the flat pathElements array by deriving tree depth from input count.
 * @param inputs - Bigint-based inputs matching the engine's FormattedCircuitInputsRailgun.
 * @returns Standard TransactionCircuitInputs with Uint8Array field elements.
 */
function bigintToTransactionCircuitInputs (inputs: TransactionBigintInputs): TransactionCircuitInputs {
  /**
   * Convert a bigint field element to a 32-byte Uint8Array.
   * @param val - Bigint field element.
   * @returns 32-byte Uint8Array representation of the field element.
   */
  const toBytes = (val: bigint) => numberStringToUint8Array(val.toString(), 32)
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
