/* eslint-disable jsdoc/require-jsdoc */
import type { SNARK, SnarkjsProof, VKey } from 'snarkjs'
import { groth16 } from 'snarkjs'

import { snarkJSToStandardInput as snarkJSToStandardPOIInput, standardToSnarkJSProof as standardPOIToSnarkJSProof, standardToSnarkJSPublicInputs as standardPOIToSnarkJSPublicInputs } from '../poi/formatter'
import type { POICircuitInputs, POIPublicInputs, POISnarkjsFormattedCircuitInputs } from '../poi/types'
import { snarkJSToStandardInput as snarkJSToStandardTransactionInput, standardToSnarkJSProof as standardTransactionToSnarkJSProof, standardToSnarkJSPublicInputs as standardTransactionToSnarkJSPublicInputs } from '../transaction/formatter'
import type { SnarkJSCircuitInputFormat, TransactionCircuitInputs, TransactionPublicInputs } from '../transaction/types'
import type { ProverArtifacts } from '../types'

import type { BaseProver } from './base-prover'

/**
 * Interface matching the snarkjs.groth16 API surface.
 * Acts as a drop-in replacement within the RAILGUN engine to facilitate
 * automatic type conversion between raw SnarkJS signals and structured application inputs.
 */
interface Groth16Prover {
  fullProve(
    inputs: unknown,
    wasm: Uint8Array,
    zkey: Uint8Array,
    logger?: unknown,
    wtnsCalcOptions?: any,
    proverOptions?: { singleThread?: boolean },
  ): Promise<SNARK>

  verify(
    vkVerifier: VKey,
    publicSignals: unknown,
    proof: SnarkjsProof,
    logger?: unknown,
  ): Promise<boolean>
}

/**
 * Identify if the provided input object matches the Transaction circuit signature.
 * @param inputs - Unknown input object to validate.
 * @returns True if the object matches the SnarkJSCircuitInputFormat for Transactions.
 */
function isTransactionInputs (inputs: unknown): inputs is SnarkJSCircuitInputFormat {
  if (typeof inputs !== 'object' || inputs === null) {
    return false
  }
  const obj = inputs as Record<string, unknown>
  return (
    typeof obj['merkleRoot'] === 'string' &&
    typeof obj['boundParamsHash'] === 'string' &&
    Array.isArray(obj['nullifiers']) &&
    Array.isArray(obj['commitmentsOut']) &&
    !('anyRailgunTxidMerklerootAfterTransaction' in obj)
  )
}

/**
 * Identify if the provided input object matches the Proof of Innocence (POI) circuit signature.
 * @param inputs - Unknown input object to validate.
 * @returns True if the object matches the POISnarkjsFormattedCircuitInputs format.
 */
function isPOIInputs (inputs: unknown): inputs is POISnarkjsFormattedCircuitInputs {
  if (typeof inputs !== 'object' || inputs === null) {
    return false
  }
  const obj = inputs as Record<string, unknown>
  return (
    typeof obj['anyRailgunTxidMerklerootAfterTransaction'] === 'string' &&
    Array.isArray(obj['poiMerkleroots'])
  )
}

/**
 * Creates an adapter that wraps a Transaction BaseProver to make it compatible with
 * the SnarkJS Groth16 interface.
 * @param prover - An instance of BaseProver configured for Transactions.
 * @returns A Groth16Prover compliant object.
 */
function createGroth16FromTransactionProver (
  prover: BaseProver<TransactionCircuitInputs, TransactionPublicInputs>
): Groth16Prover {
  return {
    async fullProve (
      inputs: unknown,
      _wasm: Uint8Array,
      _zkey: Uint8Array,
      _logger?: unknown,
      _wtnsCalcOptions?: any,
      _proverOptions?: { singleThread?: boolean }
    ): Promise<SNARK> {
      if (!isTransactionInputs(inputs)) {
        throw new Error('Invalid inputs format for transaction prover')
      }

      const circuitInputs = snarkJSToStandardTransactionInput(inputs)
      const { proof, publicInputs } = await prover.prove(circuitInputs)

      const snarkjsProof = standardTransactionToSnarkJSProof(proof)
      const publicSignals = standardTransactionToSnarkJSPublicInputs(publicInputs)

      return {
        proof: snarkjsProof,
        publicSignals,
      }
    },
    async verify (
      vkVerifier: VKey,
      publicSignals: unknown,
      proof: SnarkjsProof,
      logger?: unknown
    ): Promise<boolean> {
      if (!Array.isArray(publicSignals)) {
        throw new Error('publicSignals must be an array')
      }
      return groth16.verify(vkVerifier, publicSignals, proof, logger)
    },
  }
}

/**
 * Creates an adapter that wraps a POI BaseProver to make it compatible with
 * the SnarkJS Groth16 interface.
 * @param prover - An instance of BaseProver configured for POI.
 * @returns A Groth16Prover compliant object.
 */
function createGroth16FromPOIProver (
  prover: BaseProver<POICircuitInputs, POIPublicInputs>
): Groth16Prover {
  return {
    async fullProve (
      inputs: unknown,
      _wasm: Uint8Array,
      _zkey: Uint8Array,
      _logger?: unknown,
      _wtnsCalcOptions?: any,
      _proverOptions?: { singleThread?: boolean }
    ): Promise<SNARK> {
      if (!isPOIInputs(inputs)) {
        throw new Error('Invalid inputs format for POI prover')
      }

      const circuitInputs = snarkJSToStandardPOIInput(inputs)
      const { proof, publicInputs } = await prover.prove(circuitInputs)

      const snarkjsProof = standardPOIToSnarkJSProof(proof)
      const publicSignals = standardPOIToSnarkJSPublicInputs(publicInputs)

      return {
        proof: snarkjsProof,
        publicSignals,
      }
    },

    async verify (
      vkVerifier: VKey,
      publicSignals: unknown,
      proof: SnarkjsProof,
      logger?: unknown
    ): Promise<boolean> {
      if (!Array.isArray(publicSignals)) {
        throw new Error('publicSignals must be an array')
      }
      return groth16.verify(vkVerifier, publicSignals, proof, logger)
    },
  }
}

/**
 * Orchestrates proof generation and verification for the RAILGUN engine by acting as a
 * routing middleware between SnarkJS-style calls and structured BaseProver instances.
 * It automatically detects whether the inputs are for a Transaction or POI circuit
 * and routes the request to the appropriate sub-prover.
 * @param transactionProver - Instance of the Transaction prover.
 * @param poiProver - Instance of the POI prover.
 * @param transactionArtifacts - Compiled artifacts for the Transaction circuit.
 * @param poiArtifacts - Compiled artifacts for the POI circuit.
 * @returns A consolidated Groth16Prover adapter.
 */
function createGroth16ForEngine (
  transactionProver: BaseProver<TransactionCircuitInputs, TransactionPublicInputs> | null = null,
  poiProver: BaseProver<POICircuitInputs, POIPublicInputs> | null = null,
  transactionArtifacts: ProverArtifacts | null = null,
  poiArtifacts: ProverArtifacts | null = null
): Groth16Prover {
  return {
    async fullProve (
      inputs: unknown,
      wasm: Uint8Array,
      zkey: Uint8Array,
      logger?: unknown,
      wtnsCalcOptions?: any,
      proverOptions?: { singleThread?: boolean }
    ): Promise<SNARK> {
      if (isTransactionInputs(inputs)) {
        if (!transactionProver || !transactionArtifacts) {
          throw new Error('Transaction prover and artifacts required for transaction inputs')
        }
        const adapter = createGroth16FromTransactionProver(transactionProver)
        return adapter.fullProve(inputs, wasm, zkey, logger, wtnsCalcOptions, proverOptions)
      }

      if (isPOIInputs(inputs)) {
        if (!poiProver || !poiArtifacts) {
          throw new Error('POI prover and artifacts required for POI inputs')
        }
        const adapter = createGroth16FromPOIProver(poiProver)
        return adapter.fullProve(inputs, wasm, zkey, logger, wtnsCalcOptions, proverOptions)
      }

      throw new Error(
        'Unable to determine input type. Inputs must match TransactionCircuitInputs or POICircuitInputs format.'
      )
    },
    async verify (
      vkVerifier: VKey,
      publicSignals: unknown,
      proof: SnarkjsProof,
      logger?: unknown
    ): Promise<boolean> {
      if (transactionArtifacts) {
        const txVkey = transactionArtifacts.vkey
        if (
          txVkey.protocol === vkVerifier.protocol &&
          txVkey.curve === vkVerifier.curve &&
          txVkey.nPublic === vkVerifier.nPublic &&
          JSON.stringify(txVkey.vk_alpha_1) === JSON.stringify(vkVerifier.vk_alpha_1)
        ) {
          const adapter = createGroth16FromTransactionProver(transactionProver!)
          return adapter.verify(vkVerifier, publicSignals, proof, logger)
        }
      }

      if (poiArtifacts) {
        const poiVkey = poiArtifacts.vkey
        if (
          poiVkey.protocol === vkVerifier.protocol &&
          poiVkey.curve === vkVerifier.curve &&
          poiVkey.nPublic === vkVerifier.nPublic &&
          JSON.stringify(poiVkey.vk_alpha_1) === JSON.stringify(vkVerifier.vk_alpha_1)
        ) {
          const adapter = createGroth16FromPOIProver(poiProver!)
          return adapter.verify(vkVerifier, publicSignals, proof, logger)
        }
      }

      if (!Array.isArray(publicSignals)) {
        throw new Error('publicSignals must be an array')
      }
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
