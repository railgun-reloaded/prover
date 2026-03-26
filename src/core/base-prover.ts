import type { Proof } from '../types'

/**
 * Base Prover interface for generating and verifying zero-knowledge proofs.
 * Implementations are responsible for managing their own artifacts.
 */
export interface BaseProver<TCircuitInputs, TPublicInputs> {
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
