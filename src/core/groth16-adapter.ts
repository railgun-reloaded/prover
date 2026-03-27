import type { SNARK, SnarkjsProof, VKey } from 'snarkjs'
import { groth16 } from 'snarkjs'

import { bigintToPOICircuitInputs, standardToSnarkJSInput as poiToSnarkJSInput, standardToSnarkJSProof as poiToSnarkJSProof, standardToSnarkJSPublicInputs as poiToSnarkJSPublicInputs } from '../poi/formatter'
import type { POIBigintInputs, POICircuitInputs, POIPublicInputs } from '../poi/types'
import { bigintToTransactionCircuitInputs, standardToSnarkJSInput as txToSnarkJSInput, standardToSnarkJSProof as txToSnarkJSProof, standardToSnarkJSPublicInputs as txToSnarkJSPublicInputs } from '../transaction/formatter'
import type { TransactionBigintInputs, TransactionCircuitInputs, TransactionPublicInputs } from '../transaction/types'

import type { BaseProver } from './base-prover'

/**
 * Interface matching the snarkjs.groth16 API surface used by the RAILGUN engine.
 */
interface Groth16Prover {
  /**
   * Generate a proof for circuit inputs.
   * @param inputs - Raw circuit inputs (bigint-based for engine path, SnarkJSFormat for standalone).
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
   * @param publicSignals - Public signals as produced by the engine.
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
     * Convert bigint transaction inputs to domain format, generate proof, and return snarkjs SNARK output.
     * @param inputs - Raw transaction circuit inputs from the engine (bigint-based).
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
     * Verify a transaction proof using snarkjs groth16 directly.
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
     * Convert bigint POI inputs to domain format, generate proof, and return snarkjs SNARK output.
     * @param inputs - Raw POI circuit inputs from the engine (bigint-based).
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
 * Creates a Groth16Prover adapter for use with the RAILGUN engine's setSnarkJSGroth16.
 * Converts the engine's bigint circuit inputs to snarkJS hex-string format, then calls
 * groth16.fullProve with the wasm and zkey artifacts provided by the engine's artifactGetter.
 * @returns A Groth16Prover compatible with the engine's SnarkJSGroth16 interface.
 */
function createGroth16ForEngine (): Groth16Prover {
  console.log('[railgun-reloaded/prover] createGroth16ForEngine() called — reloaded prover is active')
  return {
    /**
     * Detect input type, convert bigint inputs to snarkJS format, and generate proof
     * using the wasm and zkey artifacts provided by the engine.
     * @param inputs - Raw circuit inputs from the engine (bigint-based).
     * @param wasm - WASM artifact provided by the engine's artifactGetter.
     * @param zkey - Proving key artifact provided by the engine's artifactGetter.
     * @param logger - Optional logger.
     * @returns Promise resolving to snarkjs SNARK output with proof and public signals.
     */
    async fullProve (
      inputs: unknown,
      wasm: ArrayLike<number> | undefined,
      zkey: ArrayLike<number>,
      logger?: unknown
    ): Promise<SNARK> {
      if (!wasm) throw new Error('WASM artifact is required for snarkjs engine prover')
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
