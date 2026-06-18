import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createGroth16ForEngine } from '../src/index.js'

test('createGroth16ForEngine — returns adapter with fullProve and verify', () => {
  const adapter = createGroth16ForEngine()
  assert.ok(typeof adapter.fullProve === 'function')
  assert.ok(typeof adapter.verify === 'function')
})

test('createGroth16ForEngine — throws when wasm is undefined', async () => {
  const adapter = createGroth16ForEngine()
  await assert.rejects(
    async () => adapter.fullProve({ merkleRoot: 1n, nullifiers: [], commitmentsOut: [] }, undefined as unknown as ArrayLike<number>, new Uint8Array()),
    /WASM artifact is required/
  )
})

test('createGroth16ForEngine — throws for unrecognised input shape', async () => {
  const adapter = createGroth16ForEngine()
  await assert.rejects(
    async () => adapter.fullProve({ unexpected: 1n }, new Uint8Array(), new Uint8Array()),
    /Unable to determine input type/
  )
})
