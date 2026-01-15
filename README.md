# `@railgun-reloaded/prover`

> Prover for Railgun transactions circuit v2 and POI circuits

## Example Usage

### Basic Prover Usage

```ts
import { SnarkjsPoiProver, SnarkjsTransactionProver } from '@railgun-reloaded/prover';

// Generate transaction proof from inputs and artifacts
const transactionInputs = {...};
const transactionArtifacts = {...};

const transactionProver = new SnarkjsTransactionProver(transactionArtifacts);

const {proof, publicInputs} = await transactionProver.prove(transactionInputs);

// Verify proof
await transactionProver.verify(publicInputs, proof);

// Generate POI proof from inputs and artifacts
const poiInputs = {...};
const poiArtifacts = {...};

const poiProver = new SnarkjsPoiProver(poiArtifacts);
const {proof, publicInputs} = await poiProver.prove(poiInputs);

await poiProver.verify(publicInputs, proof);
```

### Groth16 Adapter for Engine Integration

The `createGroth16ForEngine()` function creates a drop-in replacement for `snarkjs.groth16` that can be used in the RAILGUN engine:

```ts
import { 
  createGroth16ForEngine, 
  SnarkjsTransactionProver, 
  SnarkjsPoiProver 
} from '@railgun-reloaded/prover';
import type { ProverArtifacts } from '@railgun-reloaded/prover';

// Create provers with artifacts
const transactionProver = new SnarkjsTransactionProver(txArtifacts);
const poiProver = new SnarkjsPoiProver(poiArtifacts);

// Create adapter matching snarkjs.groth16 interface
const groth16 = createGroth16ForEngine(
  transactionProver,  // or null if not needed
  poiProver,          // or null if not needed
  txArtifacts,        // required if transactionProver provided
  poiArtifacts        // required if poiProver provided
);


const result = await groth16.fullProve(
  inputs,     
  wasm,       
  zkey,       
  logger,     // optional logger
  options,    // optional wtnsCalcOptions
  proverOpts  // optional proverOptions
);

// Verify proof
const isValid = await groth16.verify(
  vkey,           
  publicSignals,  
  proof,          
  logger          // optional logger
);
```

### Using Adapter with Transaction Circuits Only

```ts
import { createGroth16ForEngine, SnarkjsTransactionProver } from '@railgun-reloaded/prover';

const transactionProver = new SnarkjsTransactionProver(txArtifacts);
const groth16 = createGroth16ForEngine(
  transactionProver,
  null,           // No POI prover
  txArtifacts,
  null            // No POI artifacts
);

// The adapter will automatically detect transaction inputs
const result = await groth16.fullProve(transactionInputs, wasm, zkey);
```

### Using Adapter with POI Circuits Only

```ts
import { createGroth16ForEngine, SnarkjsPoiProver } from '@railgun-reloaded/prover';

const poiProver = new SnarkjsPoiProver(poiArtifacts);
const groth16 = createGroth16ForEngine(
  null,           
  poiProver,
  null,         
  poiArtifacts
);

// The adapter will automatically detect POI inputs
const result = await groth16.fullProve(poiInputs, wasm, zkey);
```

### Using Adapter with Both Transaction and POI Circuits

```ts
import { 
  createGroth16ForEngine, 
  SnarkjsTransactionProver, 
  SnarkjsPoiProver 
} from '@railgun-reloaded/prover';

const transactionProver = new SnarkjsTransactionProver(txArtifacts);
const poiProver = new SnarkjsPoiProver(poiArtifacts);

const groth16 = createGroth16ForEngine(
  transactionProver,
  poiProver,
  txArtifacts,
  poiArtifacts
);

// Adapter automatically routes to correct prover based on input type
const txResult = await groth16.fullProve(txInputs, txWasm, txZkey);
const poiResult = await groth16.fullProve(poiInputs, poiWasm, poiZkey);
```

## Install

```sh
npm install @railgun-reloaded/prover
```

## License

[MIT](LICENSE)
