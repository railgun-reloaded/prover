import { test } from 'brittle'

import { createGroth16ForEngine } from '../src'

test('createGroth16ForEngine — returns adapter with fullProve and verify', async (t) => {
  const adapter = createGroth16ForEngine()
  t.ok(typeof adapter.fullProve === 'function')
  t.ok(typeof adapter.verify === 'function')
})

test('createGroth16ForEngine — throws when wasm is undefined', async (t) => {
  const adapter = createGroth16ForEngine()
  await t.exception(
    async () => adapter.fullProve({ merkleRoot: 1n, nullifiers: [], commitmentsOut: [] }, undefined as unknown as ArrayLike<number>, new Uint8Array()),
    /WASM artifact is required/
  )
})

test('createGroth16ForEngine — throws for unrecognised input shape', async (t) => {
  const adapter = createGroth16ForEngine()
  await t.exception(
    async () => adapter.fullProve({ unexpected: 1n }, new Uint8Array(), new Uint8Array()),
    /Unable to determine input type/
  )
})
