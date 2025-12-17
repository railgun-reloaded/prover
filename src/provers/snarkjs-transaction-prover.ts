import type { SnarkjsProof } from 'snarkjs'
import { curves, groth16 } from 'snarkjs'

import { extractPublicInputsFromCircuitInputs, snarkJSToStandardProof, standardToSnarkJSInput, standardToSnarkJSProof, standardToSnarkJSPublicInputs } from '../formatters/transaction-formatter'
import type {
  Proof,
  ProverArtifacts,
  TransactionCircuitInputs,
  TransactionPublicInputs
} from '../types/transaction-types'

import type { BaseProver } from './base-prover'

/**
 * Implementation of BaseProver for Railgun circuits using snarkjs
 */

/**
 * A proof generator for transaction circuits using the SnarkJS library.
 * Implements zero-knowledge proof generation and verification for transaction validity,
 * ensuring that transactions satisfy circuit constraints without revealing private inputs.
 */
export class SnarkjsTransactionProver implements BaseProver<TransactionCircuitInputs, TransactionPublicInputs> {
  /**
   * Cryptographic artifacts required for proof generation and verification.
   * Contains vkey,zkey and wasm.
   */
  public readonly artifacts: ProverArtifacts

  /**
   * Creates a new instance with the provided prover artifacts.
   * @param artifacts - The prover artifacts containing vkey,zkey and wasm
   */
  constructor (artifacts: ProverArtifacts) {
    this.artifacts = artifacts
  }

  /**
   * Create a Railgun transaction proof
   * @param circuitInputs - Circuit inputs for generating proof
   * @returns Proof
   */
  async prove (circuitInputs: TransactionCircuitInputs): Promise<{ proof: Proof, publicInputs: TransactionPublicInputs }> {
    const snarkJSFormattedInputs = standardToSnarkJSInput(circuitInputs)

    let proof:SnarkjsProof

    try {
      const result = await groth16.fullProve(snarkJSFormattedInputs, this.artifacts.wasm, this.artifacts.zkey)
      proof = result.proof
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Proof generation failed: ${errorMessage}`)
    }

    const standardProof = snarkJSToStandardProof(proof)
    const standardPublicInput = extractPublicInputsFromCircuitInputs(circuitInputs, standardProof)
    const snarkJSFormattedPublicInputs = standardToSnarkJSPublicInputs(standardPublicInput)
    const snarkJSFormattedProof = standardToSnarkJSProof(standardProof)

    try {
      const isValid = await groth16.verify(this.artifacts.vkey, snarkJSFormattedPublicInputs, snarkJSFormattedProof)
      if (!isValid) {
        throw new Error('Generated proof is invalid')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Proof verification failed: ${errorMessage}`)
    }

    return { proof: standardProof, publicInputs: standardPublicInput }
  }

  /**
   * Verify a Railgun transaction proof
   * @param publicInputs - Proof public inputs
   * @param proof - Snark proof
   * @returns is proof valid
   */
  async verify (publicInputs: TransactionPublicInputs, proof: Proof): Promise<boolean> {
    const snarkJSFormattedProof = standardToSnarkJSProof(proof)
    const snarkJSFormattedPublicInputs = standardToSnarkJSPublicInputs(publicInputs)
    try {
      return await groth16.verify(this.artifacts.vkey, snarkJSFormattedPublicInputs, snarkJSFormattedProof)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Proof verification failed: ${errorMessage}`)
    }
  }

  /**
   * Cleanup snarkJS resources
   * @returns Promise<void>
   *
   * https://github.com/iden3/snarkjs/issues/152
   * https://github.com/iden3/snarkjs/issues/393
   */
  async cleanupSnarkJS (): Promise<void> {
  // Initialize the curve object controlling wasm threads
    const curve = await curves.getCurveFromName('bn128')

    // Terminate threads
    curve.terminate()
  }
}
