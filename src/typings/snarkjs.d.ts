declare module 'snarkjs' {
  // Define types at the module level
  export interface SnarkjsProof {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
    protocol: 'groth16';
  }

  export type PublicSignals = string[];

  export interface SNARK {
    proof: SnarkjsProof;
    publicSignals: PublicSignals;
  }

  export interface VKey {
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

  export interface CurveOptions {
    [key: string]: any;
  }

  export type Curves = 'bn128' | 'bls12381';

  export interface Curve {
    terminate: () => Promise<void>;
  }

  export namespace groth16 {
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

  export namespace curves {
    function getCurveFromName(name: string, options?: CurveOptions): Promise<Curve>;
  }
}