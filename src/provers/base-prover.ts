import type { Proof, ProverArtifacts } from '../types/transaction-types'

/**
 * Base Prover interface
 */
export interface BaseProver<TCircuitInputs, TPublicInputs> {
  readonly artifacts: ProverArtifacts
  /**
   * Generate a proof for given circuit inputs
   * @param circuitInputs - The inputs to the circuit
   * @returns Promise resolving to circuit inputs and generated proof
   */
  prove(
    circuitInputs: TCircuitInputs,
  ): Promise<{ proof: Proof, publicInputs: TPublicInputs }>;

  /**
   * Verify a proof against circuit inputs
   * @param publicInputs - The inputs to the circuit
   * @param proof - The proof to verify
   * @returns Promise resolving to verification result
   */
  verify(
    publicInputs: TPublicInputs,
    proof: Proof
  ): Promise<boolean>;
}
