import type { SnarkjsProof } from 'snarkjs'
import { curves, groth16 } from 'snarkjs'

import type { BaseProver } from '../core/base-prover'
import { numberStringToUint8Array } from '../core/bytes'

import { extractPublicInputsFromCircuitInputs, snarkJSToStandardProof, standardToSnarkJSInput, standardToSnarkJSProof, standardToSnarkJSPublicInputs } from './formatter'
import type { POICircuitInputs, POIPublicInputs, Proof, ProverArtifacts } from './types'

/**
 * Implementation of BaseProver for Railgun POI circuits using snarkjs
 */

/**
 * A proof generator for transaction circuits using the SnarkJS library.
 * Implements zero-knowledge proof generation and verification for transaction validity,
 * ensuring that transactions satisfy circuit constraints without revealing private inputs.
 */
export class SnarkjsPoiProver implements BaseProver<POICircuitInputs, POIPublicInputs> {
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
   * @param circuitInputs - POI Circuit inputs for generating proof
   * @returns Proof
   */
  async prove (circuitInputs: POICircuitInputs): Promise<{ proof: Proof, publicInputs: POIPublicInputs }> {
    const snarkJSFormattedInputs = standardToSnarkJSInput(circuitInputs)

    let proof: SnarkjsProof
    let publicSignals: string[]

    try {
      const result = await groth16.fullProve(snarkJSFormattedInputs, this.artifacts.wasm, this.artifacts.zkey)
      proof = result.proof
      publicSignals = result.publicSignals
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Proof generation failed: ${errorMessage}`)
    }

    const standardProof = snarkJSToStandardProof(proof)

    const blindedCommitmentsLength = circuitInputs.poiMerkleroots.length

    const blindedCommitmentsOut = publicSignals.slice(0, blindedCommitmentsLength).map((s: string) => numberStringToUint8Array(s, 32))
    const standardPublicInputs = extractPublicInputsFromCircuitInputs(circuitInputs, standardProof, blindedCommitmentsOut)

    const snarkJSFormattedPublicInputs = standardToSnarkJSPublicInputs(standardPublicInputs)
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

    return { proof: standardProof, publicInputs: standardPublicInputs }
  }

  /**
   * Verify a Railgun transaction proof
   * @param publicInputs - Proof public inputs
   * @param proof - Snark proof
   * @returns is proof valid
   */
  async verify (publicInputs: POIPublicInputs, proof: Proof): Promise<boolean> {
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
