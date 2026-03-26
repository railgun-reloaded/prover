import type { SNARK, SnarkjsProof, VKey } from 'snarkjs'
import { groth16 } from 'snarkjs'

import { bigintToPOICircuitInputs, standardToSnarkJSProof as poiToSnarkJSProof, standardToSnarkJSPublicInputs as poiToSnarkJSPublicInputs } from '../poi/formatter'
import type { POIBigintInputs, POICircuitInputs, POIPublicInputs } from '../poi/types'
import { bigintToTransactionCircuitInputs, standardToSnarkJSProof as txToSnarkJSProof, standardToSnarkJSPublicInputs as txToSnarkJSPublicInputs } from '../transaction/formatter'
import type { TransactionBigintInputs, TransactionCircuitInputs, TransactionPublicInputs } from '../transaction/types'
import type { ProverArtifacts } from '../types'

import type { BaseProver } from './base-prover'

/**
 * Interface matching the snarkjs.groth16 API surface.
 * Acts as a drop-in replacement within the RAILGUN engine to facilitate
 * routing between typed BaseProver instances.
 */
interface Groth16Prover {
  /**
   * Generate a proof for circuit inputs in the engine's bigint format.
   * @param inputs - Raw circuit inputs passed by the engine (bigint-based).
   * @param wasm - WASM circuit artifact.
   * @param zkey - Proving key artifact.
   * @param logger - Optional logger.
   * @param wtnsCalcOptions - Optional witness calculation options.
   * @param proverOptions - Optional prover options.
   * @param proverOptions.singleThread - Whether to run the prover in single-threaded mode.
   * @returns Promise resolving to snarkjs SNARK output.
   */
  fullProve(
    inputs: unknown,
    wasm: Uint8Array,
    zkey: Uint8Array,
    logger?: unknown,
    wtnsCalcOptions?: unknown,
    proverOptions?: { singleThread?: boolean },
  ): Promise<SNARK>

  /**
   * Verify a proof against a verification key and public signals.
   * The engine handles circuit routing at the call site by passing the correct vkey.
   * @param vkVerifier - The verification key for the circuit.
   * @param publicSignals - Public signals as produced by the engine (bigint or string array).
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
 * Configuration for a circuit prover paired with its artifacts.
 * @template TDomainInputs - The Uint8Array-based domain input type.
 * @template TPublicInputs - The structured public inputs type.
 */
interface ProverConfig<TDomainInputs, TPublicInputs> {
  /** The BaseProver implementation for this circuit. */
  prover: BaseProver<TDomainInputs, TPublicInputs>
  /** The circuit artifacts (vkey, zkey, wasm). */
  artifacts: ProverArtifacts
}

/**
 * Configuration object for createGroth16ForEngine.
 * Each circuit type is optional — only configure the circuits you need.
 */
interface EngineProverConfig {
  /** Transaction (Railgun) circuit prover configuration. */
  transaction?: ProverConfig<TransactionCircuitInputs, TransactionPublicInputs>
  /** Proof of Innocence circuit prover configuration. */
  poi?: ProverConfig<POICircuitInputs, POIPublicInputs>
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
      _wasm: Uint8Array,
      _zkey: Uint8Array
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
      _wasm: Uint8Array,
      _zkey: Uint8Array
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
 * Creates a combined Groth16Prover adapter for use with the RAILGUN engine's setSnarkJSGroth16.
 * Routes fullProve calls to the appropriate sub-prover based on bigint input shape.
 * The engine handles circuit selection in verify by passing the correct vkey at the call site.
 * @param config - Configuration specifying transaction and/or POI prover instances.
 * @returns A Groth16Prover compatible with the engine's SnarkJSGroth16 interface.
 */
function createGroth16ForEngine (config: EngineProverConfig): Groth16Prover {
  return {
    /**
     * Route inputs to the correct sub-prover based on bigint input shape and return snarkjs SNARK output.
     * @param inputs - Raw circuit inputs from the engine (bigint-based).
     * @param wasm - WASM circuit artifact (passed through to sub-provers).
     * @param zkey - Proving key artifact (passed through to sub-provers).
     * @param logger - Optional logger.
     * @param wtnsCalcOptions - Optional witness calculation options.
     * @param proverOptions - Optional prover options.
     * @param proverOptions.singleThread - Whether to run the prover in single-threaded mode.
     * @returns Promise resolving to snarkjs SNARK output with proof and public signals.
     */
    async fullProve (
      inputs: unknown,
      wasm: Uint8Array,
      zkey: Uint8Array,
      logger?: unknown,
      wtnsCalcOptions?: unknown,
      proverOptions?: { singleThread?: boolean }
    ): Promise<SNARK> {
      if (isTransactionInputs(inputs)) {
        if (!config.transaction) {
          throw new Error('Transaction prover and artifacts required for transaction inputs')
        }
        const adapter = createGroth16FromTransactionProver(config.transaction.prover)
        return adapter.fullProve(inputs, wasm, zkey, logger, wtnsCalcOptions, proverOptions)
      }

      if (isPOIInputs(inputs)) {
        if (!config.poi) {
          throw new Error('POI prover and artifacts required for POI inputs')
        }
        const adapter = createGroth16FromPOIProver(config.poi.prover)
        return adapter.fullProve(inputs, wasm, zkey, logger, wtnsCalcOptions, proverOptions)
      }

      throw new Error(
        'Unable to determine input type. Inputs must match TransactionBigintInputs or POIBigintInputs format.'
      )
    },
    /**
     * Verify a proof using snarkjs groth16 directly; the engine routes to this with the correct vkey.
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

export type { Groth16Prover, EngineProverConfig }
