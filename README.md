# @railgun-reloaded/prover

Zero-knowledge proof generation and verification for RAILGUN Transaction and POI (Proof of Innocence) circuits.

`prover` provides a stateless groth16 adapter that auto-detects circuit type, converts bigint inputs to snarkJS format, and delegates proof generation to `snarkjs.groth16`.

## Installing

```sh
npm install @railgun-reloaded/prover
```

## Quick start

```typescript
import { createGroth16ForEngine } from '@railgun-reloaded/prover'

// Create a stateless adapter — takes no arguments.
// The engine provides wasm/zkey artifacts at prove-time.
const groth16 = createGroth16ForEngine()

// Generate proof — input type (Transaction or POI) is auto-detected
const { proof, publicSignals } = await groth16.fullProve(
  bigintInputs, // TransactionBigintInputs or POIBigintInputs
  wasmBytes,    // circuit wasm artifact
  zkeyBytes,    // proving key artifact
)

// Verify proof
const isValid = await groth16.verify(vkey, publicSignals, proof)
```

### Standalone provers

For direct proof generation without the engine adapter:

```typescript
import { SnarkjsTransactionProver, SnarkjsPoiProver } from '@railgun-reloaded/prover'
import type { ProverArtifacts } from '@railgun-reloaded/prover'

const artifacts: ProverArtifacts = { wasm, zkey, vkey }

// Transaction circuit
const txProver = new SnarkjsTransactionProver(artifacts)
const { proof, publicInputs } = await txProver.prove(transactionInputs)
await txProver.verify(publicInputs, proof)

// POI circuit
const poiProver = new SnarkjsPoiProver(artifacts)
const { proof, publicInputs } = await poiProver.prove(poiInputs)
await poiProver.verify(publicInputs, proof)
```

## Architecture

```
prover/
  src/
    index.ts                  Package entry point
    definitions.ts            Shared types (Proof, ProverArtifacts, VKey)
    base-prover.ts            BaseProver interface
    groth16-adapter.ts        Stateless groth16 adapter (createGroth16ForEngine)
    bytes.ts                  Byte utilities (hex, bigint, Uint8Array conversions)
    transaction/
      types.ts                Transaction circuit types (inputs, public inputs)
      formatter.ts            Transaction bigint ↔ snarkJS format converters
      prover.ts               SnarkjsTransactionProver implementation
    poi/
      types.ts                POI circuit types (inputs, public inputs)
      formatter.ts            POI bigint ↔ snarkJS format converters
      prover.ts               SnarkjsPoiProver implementation
  test/
    bytes.test.ts             Byte conversion unit tests
    poi-formatter.test.ts     POI formatter field ordering tests
    groth16-adapter.test.ts   Adapter type-detection and error-handling tests
```

## Developing

### Install dependencies

```sh
npm install
```

### Build

```sh
npm run build
```

### Run tests

```sh
npm test
```

### Lint

```sh
npm run lint
npm run lint:fix
```

## License

MIT
