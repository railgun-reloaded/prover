import type { VKey } from 'snarkjs'
/**
 * Standard Groth16 proof format
 */
type Proof = {
  a: {
    x: Uint8Array;
    y: Uint8Array;
  };
  b: {
    x: [Uint8Array, Uint8Array];
    y: [Uint8Array, Uint8Array];
  };
  c: {
    x: Uint8Array;
    y: Uint8Array;
  };
}
/**
 * Generated circuit artifacts
 */
type ProverArtifacts = {
  vkey: {
    protocol: 'groth16',
    curve: 'bn128',
    nPublic: number,
    vk_alpha_1: string[],
    vk_beta_2: string[][],
    vk_gamma_2: string[][],
    vk_delta_2: string[][],
    vk_alphabeta_12: string[][][],
    IC: string[][],
  },
  zkey: Uint8Array,
  wasm: Uint8Array
}
export type { Proof, ProverArtifacts, VKey }
