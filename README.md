# `@railgun-reloaded/prover`

> Base Prover for Railgun transactions circuit v2

## Example Usage
```ts
  import {RailgunBaseProver} from '@railgun-reloaded/prover';

  // Generate proof 
  const inputs = {...};
  const artifacts = {...};
  const prover = new RailgunBaseProver();
  const {proof, publicInputs} = await prover.prove(inputs, artifacts);

  // Verify proof
  await prover.verify(artifacts.vkey, publicInputs, proof);
```

## Install
```sh
npm install @railgun-reloaded/prover
```

## License
[MIT](LICENSE)