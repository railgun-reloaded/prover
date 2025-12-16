import { curves, groth16 } from 'snarkjs'

import { numberStringToUint8Array } from '../formatters/bytes'
import { extractPublicInputsFromCircuitInputs, snarkJSToStandardProof, standardToSnarkJSInput, standardToSnarkJSProof, standardToSnarkJSPublicInputs } from '../formatters/poi-formatter'
import type { POICircuitInputs, POIPublicInputs } from '../types/poi-types'
import type {
  Proof,
  ProverArtifacts
} from '../types/transaction-types'

import type { BaseProver } from './base-prover'

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
  public artifacts: ProverArtifacts

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

    const { proof, publicSignals } = await groth16.fullProve(snarkJSFormattedInputs, this.artifacts.wasm, this.artifacts.zkey)

    const standardProof = snarkJSToStandardProof(proof)

    const blindedCommitmentsOut = publicSignals.slice(0, 13).map((s: string) => numberStringToUint8Array(s, 32))
    const standardPublicInputs = extractPublicInputsFromCircuitInputs(circuitInputs, standardProof, blindedCommitmentsOut)

    const snarkJSFormattedPublicInputs = standardToSnarkJSPublicInputs(standardPublicInputs)

    const snarkJSFormattedProof = standardToSnarkJSProof(standardProof)

    groth16.verify(this.artifacts.vkey, snarkJSFormattedPublicInputs, snarkJSFormattedProof)

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
    return groth16.verify(this.artifacts.vkey, snarkJSFormattedPublicInputs, snarkJSFormattedProof)
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
