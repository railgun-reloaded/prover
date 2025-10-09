import type  {VKey} from 'snarkjs'
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
 * Standard representation of circuit inputs
 */
type CircuitInputs = {
  merkleRoot: Uint8Array,
  boundParamsHash: Uint8Array,
  token: Uint8Array,
  publicKey: Uint8Array[],
  signature: Uint8Array[],
  nullifyingKey: Uint8Array,
  inputTXOs: {
    nullifier: Uint8Array,
    randomIn: Uint8Array,
    valueIn: bigint,
    merkleleafPosition: number,
    pathElements: Uint8Array[],
  }[],
  outputTXOs: {
    commitment: Uint8Array,
    npk: Uint8Array,
    value: bigint,
  }[],
}
/**
 * SnarkJS representation of circuit inputs
 */
type SnarkJSCircuitInputFormat = {
  merkleRoot: string,
  boundParamsHash: string,
  nullifiers: string[],
  commitmentsOut: string[],
  token: string,
  publicKey: string[],
  signature: string[],
  randomIn: string[],
  valueIn: string[],
  pathElements: string[][],
  leavesIndices: number[],
  nullifyingKey: string,
  npkOut: string[],
  valueOut: string[]
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


/**
 * PublicInputs for verifying, returned by prove()
 * NOTE: PublicInputs is the same as PublicSignals
 */
type PublicInputs = {
  proof: Proof;
  merkleRoot: Uint8Array;
  nullifiers: Uint8Array[];
  commitments: Uint8Array[];
  boundParams: Uint8Array; // Return a hash; interface is not important to circuit interaction
}

/**
 * Base Prover interface
 */
export interface BaseProver {
  /**
   * Generate a proof for given circuit inputs
   * @param circuitInputs - The inputs to the circuit
   * @param artifacts - The prover artifacts with vkey,zkey and wasm
   * @returns Promise resolving to circuit inputs and generated proof
   */
  prove(
    circuitInputs: CircuitInputs,
    artifacts:ProverArtifacts
  ): Promise<{proof:Proof,publicInputs:PublicInputs}>;

  /**
   * Verify a proof against circuit inputs
   * @param circuitInputs - The inputs to the circuit
   * @param proof - The proof to verify
   * @returns Promise resolving to verification result
   */
  verify(
    vkey:VKey,
    publicInputs: PublicInputs,
    proof: Proof
  ): Promise<boolean>;
}


export type {Proof,CircuitInputs,PublicInputs,SnarkJSCircuitInputFormat,ProverArtifacts,VKey}