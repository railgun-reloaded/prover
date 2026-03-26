import { hook, test } from 'brittle'
import { curves } from 'snarkjs'

import { SnarkjsTransactionProver, createGroth16ForEngine } from '../../src'
import { testVectors } from '../transaction/test-vectors'

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

hook('Cleanup snarkJS', async function () {
  for (const vector of testVectors) {
    const prover = new SnarkjsTransactionProver(vector.artifacts)
    await prover.cleanupSnarkJS()
  }

  try {
    const curve = await curves.getCurveFromName('bn128')
    await curve.terminate()
  } catch (error) {
    // Ignore errors during cleanup - curve might already be terminated
  }
})
