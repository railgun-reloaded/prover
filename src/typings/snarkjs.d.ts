declare module 'snarkjs' {
  interface SnarkjsProof {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
    protocol: 'groth16';
  }

  type PublicSignals = string[];

  interface SNARK {
    proof: SnarkjsProof;
    publicSignals: PublicSignals;
  }

  interface VKey {
    protocol: 'groth16';
    curve: Curves;
    nPublic: number;
    vk_alpha_1: (string | bigint)[];
    vk_beta_2: (string | bigint)[][];
    vk_gamma_2: (string | bigint)[][];
    vk_delta_2: (string | bigint)[][];
    vk_alphabeta_12: (string | bigint)[][][];
    IC: (string | bigint)[][];
  }


  interface CurveOptions {
    [key: string]: any;
  }

  namespace groth16 {

    function fullProve(
      inputs: unknown,
      wasm: Uint8Array | string,
      zkey: Uint8Array | string,
      logger?: unknown,
      wtnsCalcOptions?: any,
      proverOptions?: { singleThread?: boolean },
    ): Promise<SNARK>;

    function verify(
      vkVerifier: VKey,
      publicSignals: unknown,
      proof: SnarkjsProof,
      logger?: unknown,
    ): Promise<boolean>;
  }

  interface Curve {
    terminate: () => Promise<void>;
  }

  namespace curves {

    function getCurveFromName(name: string, options?: CurveOptions): Promise<Curve>;
  }

  type Curves = 'bn128' | 'bls12381';

  export type { SnarkjsProof, SNARK, VKey, Curves, CurveOptions };
  export { groth16, curves };
}