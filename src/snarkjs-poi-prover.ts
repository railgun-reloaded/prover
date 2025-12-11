import { curves, groth16 } from 'snarkjs'

import { extractPublicInputsFromCircuitInputs, snarkJSToStandardProof, standardToSnarkJSInput, standardToSnarkJSProof, standardToSnarkJSPublicInputs } from './poi-formatter'
import type {
  Proof,
  ProverArtifacts} from './transaction-types'
import { BaseProver } from './base-prover';
import { POICircuitInputs, POIPublicInputs } from './poi-types';



/**
 * Implementation of BaseProver for Railgun circuits
 */
// eslint-disable-next-line import-x/group-exports

export class SnarkjsPoiProver implements BaseProver<POICircuitInputs,POIPublicInputs>{
  public artifacts: ProverArtifacts;

  constructor(artifacts: ProverArtifacts) {
    this.artifacts = artifacts;
  }

  /**
   * Create a Railgun transaction proof
   * @param circuitInputs - Circuit inputs for generating proof
   * @param artifacts - Circuit artifacts
   * @returns Proof
   */
  async prove (circuitInputs: POICircuitInputs): Promise<{ proof: Proof, publicInputs: POIPublicInputs }> {
  // Format the inputs into snarkJS format
    const snarkJSFormattedInputs = standardToSnarkJSInput(circuitInputs)

    // Generate proof
    const { proof } = await groth16.fullProve(snarkJSFormattedInputs, this.artifacts.wasm, this.artifacts.zkey)

    // Standardize the proof
    const standardProof = snarkJSToStandardProof(proof)

    // Extract public inputs
    const snarkJSFormattedPublicInputs = extractPublicInputsFromCircuitInputs(circuitInputs, standardProof)

    // Create snarkJS proof
    const snarkJSFormattedProof = standardToSnarkJSProof(standardProof)

    // Ensure proof passes verification
    groth16.verify(this.artifacts.vkey, snarkJSFormattedPublicInputs, snarkJSFormattedProof)

    // Format to Uint8Array and return
    return { proof: standardProof, publicInputs: snarkJSFormattedPublicInputs }
  }

  /**
   * Verify a Railgun transaction proof
   * @param vkey - Circuit verifying key
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
