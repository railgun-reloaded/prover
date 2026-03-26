/**
 * Type declarations for snarkjs groth16 proof system.
 * Declares the minimal subset of the snarkjs API used by this package.
 */
declare module 'snarkjs' {
  /**
   * A groth16 proof in snarkjs wire format.
   * pi_b coordinates are stored in reversed order relative to the standard representation.
   */
  type SnarkjsProof = {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
  }

  /**
   * Output of a successful fullProve call: the proof and its corresponding public signals.
   */
  type SNARK = {
    proof: SnarkjsProof;
    publicSignals: string[];
  }

  /**
   * Verification key as produced by the groth16 trusted setup.
   */
  type VKey = {
    protocol: string;
    curve: string;
    nPublic: number;
    vk_alpha_1: string[];
    vk_beta_2: string[][];
    vk_gamma_2: string[][];
    vk_delta_2: string[][];
    vk_alphabeta_12: string[][][];
    IC: string[][];
  }

  /**
   * A named elliptic curve instance returned by getCurveFromName.
   * Holds WASM thread workers that must be explicitly terminated.
   */
  interface CurveInstance {
    /**
     * Terminate all background WASM worker threads for this curve.
     */
    terminate(): void;
  }

  /**
   * snarkjs groth16 namespace — proof generation and verification.
   */
  const groth16: {
    /**
     * Generate a groth16 proof for the given circuit inputs.
     * @param input - Circuit inputs as a key-value object.
     * @param wasm - WASM circuit artifact.
     * @param zkey - Proving key artifact.
     * @param logger - Optional logger.
     * @param wtnsCalcOptions - Optional witness calculation options.
     * @param proverOptions - Optional prover options.
     * @param proverOptions.singleThread - Whether to run in single-threaded mode.
     * @returns SNARK containing the proof and public signals.
     */
    fullProve(
      input: unknown,
      wasm: Uint8Array,
      zkey: Uint8Array,
      logger?: unknown,
      wtnsCalcOptions?: unknown,
      proverOptions?: { singleThread?: boolean },
    ): Promise<SNARK>;

    /**
     * Verify a groth16 proof against a verification key and public signals.
     * @param vkVerifier - The verification key.
     * @param publicSignals - The public signals array.
     * @param proof - The proof to verify.
     * @param logger - Optional logger.
     * @returns True if the proof is valid.
     */
    verify(
      vkVerifier: VKey,
      publicSignals: string[],
      proof: SnarkjsProof,
      logger?: unknown,
    ): Promise<boolean>;
  }

  /**
   * snarkjs curves namespace — curve instance lifecycle management.
   */
  const curves: {
    /**
     * Get a curve instance by name, initialising WASM workers if necessary.
     * @param name - The curve name (e.g. 'bn128').
     * @returns The curve instance.
     */
    getCurveFromName(name: string): Promise<CurveInstance>;
  }

  export type { SnarkjsProof, SNARK, VKey, CurveInstance }
  export { groth16, curves }
}
