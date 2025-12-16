# `@railgun-reloaded/prover`

> Prover for Railgun transactions circuit v2 and POI cicuits

## Example Usage

```ts
  import { SnarkjsPoiProver, SnarkjsTransactionProver } from '@railgun-reloaded/prover';

  // Generate transaction proof from inputs and artifacts
  const transactionInputs = {...};
  const transationArtifacts = {...};

  const transactionProver = new SnarkjsTransactionProver(transationArtifacts);

  const {proof, publicInputs} = await transactionProver.prove(transactionInputs);

  // Verify proof
  await transactionProver.verify( publicInputs,proof);



  //Generate poi proof from inputs and artifacts
  const poiInputs = {...};
  const poiArtifacts ={...};

  const poiProver = new SnarkjsPoiProver(poiArtifacts);
  const {proof, publicInputs} = await poiProver.prove(poiInputs);

  await poiProver.verify(publicInputs, proof)

```

## Install

```sh
npm install @railgun-reloaded/prover
```

## License

[MIT](LICENSE)
