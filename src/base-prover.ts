import type { Proof, ProverArtifacts } from './definitions.js'

/**
 * Base Prover interface for generating and verifying zero-knowledge proofs.
 */
export interface BaseProver<TCircuitInputs, TPublicInputs> {
  /**
   * Cryptographic artifacts required for proof generation and verification.
   */
  readonly artifacts: ProverArtifacts;

  /**
   * Generate a proof for given circuit inputs.
   * @param circuitInputs - The inputs to the circuit.
   * @returns Promise resolving to the generated proof and structured public inputs.
   */
  prove(
    circuitInputs: TCircuitInputs,
  ): Promise<{ proof: Proof; publicInputs: TPublicInputs }>;

  /**
   * Verify a proof against public inputs.
   * @param publicInputs - The structured public inputs.
   * @param proof - The proof to verify.
   * @returns Promise resolving to true if the proof is valid.
   */
  verify(
    publicInputs: TPublicInputs,
    proof: Proof
  ): Promise<boolean>;
}
