import type { SNARK, SnarkjsProof, VKey } from 'snarkjs'
import { groth16 } from 'snarkjs'

import { bigintToPOICircuitInputs, standardToSnarkJSInput as poiToSnarkJSInput, standardToSnarkJSProof as poiToSnarkJSProof, standardToSnarkJSPublicInputs as poiToSnarkJSPublicInputs } from '../poi/formatter'
import type { POIBigintInputs, POICircuitInputs, POIPublicInputs } from '../poi/types'
import { bigintToTransactionCircuitInputs, standardToSnarkJSInput as txToSnarkJSInput, standardToSnarkJSProof as txToSnarkJSProof, standardToSnarkJSPublicInputs as txToSnarkJSPublicInputs } from '../transaction/formatter'
import type { TransactionBigintInputs, TransactionCircuitInputs, TransactionPublicInputs } from '../transaction/types'

import type { BaseProver } from './base-prover'

/**
 * Groth16 proof generation and verification interface compatible with snarkjs.
 */
interface Groth16Prover {
  /**
   * Generate a proof for circuit inputs.
   * @param inputs - Circuit inputs (bigint-based or snarkJS hex-string format).
   * @param wasm - WASM circuit artifact.
   * @param zkey - Proving key artifact.
   * @param logger - Optional logger.
   * @param wtnsCalcOptions - Optional witness calculation options.
   * @param proverOptions - Optional prover options.
   * @param proverOptions.singleThread - Whether to run in single-threaded mode.
   * @returns Promise resolving to snarkjs SNARK output.
   */
  fullProve(
    inputs: unknown,
    wasm: ArrayLike<number> | undefined,
    zkey: ArrayLike<number>,
    logger?: unknown,
    wtnsCalcOptions?: unknown,
    proverOptions?: { singleThread?: boolean },
  ): Promise<SNARK>

  /**
   * Verify a proof against a verification key and public signals.
   * @param vkVerifier - The verification key for the circuit.
   * @param publicSignals - The public signals array.
   * @param proof - The snarkjs-format proof to verify.
   * @param logger - Optional logger.
   * @returns Promise resolving to true if the proof is valid.
   */
  verify(
    vkVerifier: VKey,
    publicSignals: unknown,
    proof: SnarkjsProof,
    logger?: unknown,
  ): Promise<boolean>
}

/**
 * Detect whether the given inputs match the Transaction circuit format.
 * Transaction inputs use bigint field elements and do not contain POI-specific fields.
 * @param inputs - Unknown input object to validate.
 * @returns True if the object matches TransactionBigintInputs.
 */
function isTransactionInputs (inputs: unknown): inputs is TransactionBigintInputs {
  if (typeof inputs !== 'object' || inputs === null) return false
  const obj = inputs as Record<string, unknown>
  return (
    typeof obj['merkleRoot'] === 'bigint' &&
    Array.isArray(obj['nullifiers']) &&
    Array.isArray(obj['commitmentsOut']) &&
    !('anyRailgunTxidMerklerootAfterTransaction' in obj)
  )
}

/**
 * Detect whether the given inputs match the POI circuit format.
 * POI inputs are identified by the presence of the anyRailgunTxidMerklerootAfterTransaction bigint field.
 * @param inputs - Unknown input object to validate.
 * @returns True if the object matches POIBigintInputs.
 */
function isPOIInputs (inputs: unknown): inputs is POIBigintInputs {
  if (typeof inputs !== 'object' || inputs === null) return false
  const obj = inputs as Record<string, unknown>
  return typeof obj['anyRailgunTxidMerklerootAfterTransaction'] === 'bigint'
}

/**
 * Creates an adapter that wraps a Transaction BaseProver to match the Groth16Prover interface.
 * Intended for standalone use where artifacts are managed by the caller.
 * @param prover - A BaseProver instance configured for Transaction circuits.
 * @returns A Groth16Prover compliant object.
 */
function createGroth16FromTransactionProver (
  prover: BaseProver<TransactionCircuitInputs, TransactionPublicInputs>
): Groth16Prover {
  return {
    /**
     * Convert bigint transaction inputs to standard format, generate proof, and return snarkjs SNARK output.
     * @param inputs - Bigint-based transaction circuit inputs.
     * @param _wasm - Unused; artifact is managed by the sub-prover.
     * @param _zkey - Unused; artifact is managed by the sub-prover.
     * @returns Promise resolving to snarkjs SNARK output with proof and public signals.
     */
    async fullProve (
      inputs: unknown,
      _wasm: ArrayLike<number> | undefined,
      _zkey: ArrayLike<number>
    ): Promise<SNARK> {
      if (!isTransactionInputs(inputs)) {
        throw new Error('Invalid inputs format for transaction prover')
      }
      const circuitInputs = bigintToTransactionCircuitInputs(inputs)
      const { proof, publicInputs } = await prover.prove(circuitInputs)

      return {
        proof: txToSnarkJSProof(proof),
        publicSignals: txToSnarkJSPublicInputs(publicInputs),
      }
    },
    /**
     * Verify a transaction proof using snarkjs groth16.
     * @param vkVerifier - The verification key for the circuit.
     * @param publicSignals - Public signals array.
     * @param proof - The snarkjs-format proof to verify.
     * @param logger - Optional logger.
     * @returns Promise resolving to true if the proof is valid.
     */
    async verify (
      vkVerifier: VKey,
      publicSignals: unknown,
      proof: SnarkjsProof,
      logger?: unknown
    ): Promise<boolean> {
      if (!Array.isArray(publicSignals)) throw new Error('publicSignals must be an array')
      return groth16.verify(vkVerifier, publicSignals, proof, logger)
    },
  }
}

/**
 * Creates an adapter that wraps a POI BaseProver to match the Groth16Prover interface.
 * Intended for standalone use where artifacts are managed by the caller.
 * @param prover - A BaseProver instance configured for POI circuits.
 * @returns A Groth16Prover compliant object.
 */
function createGroth16FromPOIProver (
  prover: BaseProver<POICircuitInputs, POIPublicInputs>
): Groth16Prover {
  return {
    /**
     * Convert bigint POI inputs to standard format, generate proof, and return snarkjs SNARK output.
     * @param inputs - Bigint-based POI circuit inputs.
     * @param _wasm - Unused; artifact is managed by the sub-prover.
     * @param _zkey - Unused; artifact is managed by the sub-prover.
     * @returns Promise resolving to snarkjs SNARK output with proof and public signals.
     */
    async fullProve (
      inputs: unknown,
      _wasm: ArrayLike<number> | undefined,
      _zkey: ArrayLike<number>
    ): Promise<SNARK> {
      if (!isPOIInputs(inputs)) {
        throw new Error('Invalid inputs format for POI prover')
      }
      const circuitInputs = bigintToPOICircuitInputs(inputs)
      const { proof, publicInputs } = await prover.prove(circuitInputs)

      return {
        proof: poiToSnarkJSProof(proof),
        publicSignals: poiToSnarkJSPublicInputs(publicInputs),
      }
    },
    /**
     * Verify a POI proof using snarkjs groth16 directly.
     * @param vkVerifier - The verification key for the circuit.
     * @param publicSignals - Public signals array.
     * @param proof - The snarkjs-format proof to verify.
     * @param logger - Optional logger.
     * @returns Promise resolving to true if the proof is valid.
     */
    async verify (
      vkVerifier: VKey,
      publicSignals: unknown,
      proof: SnarkjsProof,
      logger?: unknown
    ): Promise<boolean> {
      if (!Array.isArray(publicSignals)) throw new Error('publicSignals must be an array')
      return groth16.verify(vkVerifier, publicSignals, proof, logger)
    },
  }
}

/**
 * Creates a Groth16Prover that auto-detects input type and converts bigint circuit inputs
 * to snarkJS hex-string format before calling groth16.fullProve with caller-provided artifacts.
 * @returns A Groth16Prover that accepts both Transaction and POI bigint inputs.
 */
function createGroth16ForEngine (): Groth16Prover {
  return {
    /**
     * Detect input type (Transaction or POI), convert bigint inputs to snarkJS format,
     * and generate a proof using the provided artifacts.
     * @param inputs - Bigint-based circuit inputs (Transaction or POI).
     * @param wasm - WASM circuit artifact.
     * @param zkey - Proving key artifact.
     * @param logger - Optional logger.
     * @returns Promise resolving to snarkjs SNARK output with proof and public signals.
     */
    async fullProve (
      inputs: unknown,
      wasm: ArrayLike<number> | undefined,
      zkey: ArrayLike<number>,
      logger?: unknown
    ): Promise<SNARK> {
      if (!wasm) throw new Error('WASM artifact is required for snarkjs prover')
      const wasmBytes = wasm instanceof Uint8Array ? wasm : Uint8Array.from(wasm)
      const zkeyBytes = zkey instanceof Uint8Array ? zkey : Uint8Array.from(zkey)

      if (isTransactionInputs(inputs)) {
        const circuitInputs = bigintToTransactionCircuitInputs(inputs)
        const snarkJSInputs = txToSnarkJSInput(circuitInputs)
        return groth16.fullProve(snarkJSInputs as unknown, wasmBytes, zkeyBytes, logger)
      }

      if (isPOIInputs(inputs)) {
        const circuitInputs = bigintToPOICircuitInputs(inputs)
        const snarkJSInputs = poiToSnarkJSInput(circuitInputs)
        return groth16.fullProve(snarkJSInputs as unknown, wasmBytes, zkeyBytes, logger)
      }

      throw new Error(
        'Unable to determine input type. Inputs must match TransactionBigintInputs or POIBigintInputs format.'
      )
    },
    /**
     * Verify a proof using snarkjs groth16 directly.
     * @param vkVerifier - The verification key for the circuit.
     * @param publicSignals - Public signals array.
     * @param proof - The snarkjs-format proof to verify.
     * @param logger - Optional logger.
     * @returns Promise resolving to true if the proof is valid.
     */
    async verify (
      vkVerifier: VKey,
      publicSignals: unknown,
      proof: SnarkjsProof,
      logger?: unknown
    ): Promise<boolean> {
      if (!Array.isArray(publicSignals)) throw new Error('publicSignals must be an array')
      return groth16.verify(vkVerifier, publicSignals, proof, logger)
    },
  }
}

export {
  createGroth16FromTransactionProver,
  createGroth16FromPOIProver,
  createGroth16ForEngine,
}

export type { Groth16Prover }
