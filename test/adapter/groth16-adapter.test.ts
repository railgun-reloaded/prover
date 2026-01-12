import { hook, test } from 'brittle'
import type { SnarkjsProof } from 'snarkjs'
import { curves, groth16 } from 'snarkjs'

import { SnarkjsTransactionProver, createGroth16ForEngine } from '../../src'
import { standardToSnarkJSInput } from '../../src/transaction/formatter'
import { testVectors } from '../transaction/test-vectors'

test('Groth16Adapter: Should match snarkjs.groth16.fullProve interface for transaction', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const prover = new SnarkjsTransactionProver(vector.artifacts)
  const groth16Adapter = createGroth16ForEngine(
    prover,
    null,
    vector.artifacts,
    null
  )

  const snarkjsInputs = standardToSnarkJSInput(vector.inputs)
  const result = await groth16Adapter.fullProve(
    snarkjsInputs,
    vector.artifacts.wasm,
    vector.artifacts.zkey
  )

  assert.ok(result.proof, 'should have proof')
  assert.ok(result.publicSignals, 'should have publicSignals')
  assert.ok(Array.isArray(result.publicSignals), 'publicSignals should be array')
  assert.is(result.proof.protocol, 'groth16', 'proof should have protocol')
  assert.is(result.proof.pi_a.length, 2, 'proof.pi_a should have 2 elements')
  assert.is(result.proof.pi_b.length, 2, 'proof.pi_b should have 2 elements')
  assert.is(result.proof.pi_c.length, 2, 'proof.pi_c should have 2 elements')
  assert.ok(Array.isArray(result.proof.pi_b[0]), 'proof.pi_b[0] should be array')
  assert.ok(Array.isArray(result.proof.pi_b[1]), 'proof.pi_b[1] should be array')

  const snarkjsResult = await groth16.fullProve(
    snarkjsInputs,
    vector.artifacts.wasm,
    vector.artifacts.zkey
  )

  assert.is(
    result.publicSignals.length,
    snarkjsResult.publicSignals.length,
    'publicSignals length should match snarkjs'
  )
  assert.is(result.proof.protocol, snarkjsResult.proof.protocol, 'protocol should match')
})

test('Groth16Adapter: Should match snarkjs.groth16.verify interface for transaction', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const prover = new SnarkjsTransactionProver(vector.artifacts)
  const groth16Adapter = createGroth16ForEngine(prover, null, vector.artifacts, null)

  const snarkjsInputs = standardToSnarkJSInput(vector.inputs)
  const proveResult = await groth16Adapter.fullProve(
    snarkjsInputs,
    vector.artifacts.wasm,
    vector.artifacts.zkey
  )

  const isValid = await groth16Adapter.verify(
    vector.artifacts.vkey,
    proveResult.publicSignals,
    proveResult.proof
  )
  assert.ok(isValid, 'proof should be valid')

  const invalidProof: SnarkjsProof = {
    ...proveResult.proof,
    pi_a: ['0', '0', '1'] as any
  }

  const invalidIsValid = await groth16Adapter.verify(
    vector.artifacts.vkey,
    proveResult.publicSignals,
    invalidProof
  )
  assert.ok(!invalidIsValid, 'invalid proof should fail verification')
})

test('Groth16Adapter: Should handle all transaction test vectors', async function (assert) {
  for (const vector of testVectors) {
    const prover = new SnarkjsTransactionProver(vector.artifacts)
    const groth16Adapter = createGroth16ForEngine(
      prover,
      null,
      vector.artifacts,
      null
    )

    const snarkjsInputs = standardToSnarkJSInput(vector.inputs)
    const result = await groth16Adapter.fullProve(
      snarkjsInputs,
      vector.artifacts.wasm,
      vector.artifacts.zkey
    )

    assert.ok(result.proof, `should generate proof for ${vector.inputs.inputTXOs.length}x${vector.inputs.outputTXOs.length} circuit`)
    assert.ok(result.publicSignals.length > 0, 'should have publicSignals')

    const isValid = await groth16Adapter.verify(
      vector.artifacts.vkey,
      result.publicSignals,
      result.proof
    )
    assert.ok(isValid, `proof should be valid for ${vector.inputs.inputTXOs.length}x${vector.inputs.outputTXOs.length} circuit`)
  }
})

test('Groth16Adapter: Should throw error for invalid input format', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const prover = new SnarkjsTransactionProver(vector.artifacts)
  const groth16Adapter = createGroth16ForEngine(
    prover,
    null,
    vector.artifacts,
    null
  )

  const invalidInputs = { invalid: 'format' }

  try {
    await groth16Adapter.fullProve(
      invalidInputs,
      vector.artifacts.wasm,
      vector.artifacts.zkey
    )
    assert.fail('should throw error for invalid inputs')
  } catch (error:unknown) {
    if (error instanceof Error) {
      assert.ok(error instanceof Error, 'should throw Error')
      assert.ok(
        error.message.includes('Unable to determine input type') ||
      error.message.includes('format'),
        'error message should indicate input type issue'
      )
    }
  }
})

test('Groth16Adapter: Should throw error when verify receives invalid publicSignals', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const prover = new SnarkjsTransactionProver(vector.artifacts)
  const groth16Adapter = createGroth16ForEngine(
    prover,
    null,
    vector.artifacts,
    null
  )

  const snarkjsInputs = standardToSnarkJSInput(vector.inputs)
  const proveResult = await groth16Adapter.fullProve(
    snarkjsInputs,
    vector.artifacts.wasm,
    vector.artifacts.zkey
  )

  try {
    await groth16Adapter.verify(
      vector.artifacts.vkey,
      'not-an-array' as unknown as string[],
      proveResult.proof
    )
    assert.fail('should throw error for invalid publicSignals format')
  } catch (error:unknown) {
    if (error instanceof Error) {
      assert.ok(error instanceof Error, 'should throw Error')
      assert.ok(error.message.includes('publicSignals must be an array'), 'error message should indicate publicSignals issue')
    }
  }
})

test('Groth16Adapter: Should handle missing prover gracefully', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  // Create adapter without provers
  const groth16Adapter = createGroth16ForEngine(
    null,
    null,
    null,
    null
  )

  const snarkjsInputs = standardToSnarkJSInput(vector.inputs)

  try {
    await groth16Adapter.fullProve(
      snarkjsInputs,
      vector.artifacts.wasm,
      vector.artifacts.zkey
    )
    assert.fail('should throw error when prover not provided')
  } catch (error) {
    if (error instanceof Error) {
      assert.ok(error instanceof Error, 'should throw Error')
      assert.ok(
        error.message.includes('required') ||
      error.message.includes('provided') ||
      error.message.includes('Transaction prover'),
        'error message should indicate missing prover'
      )
    }
  }
})

// Note: The fallback verify behavior when artifacts are not provided is implemented
// in the adapter but not tested here because:
// 1. In practice, artifacts should always be provided
// 2. The fallback to snarkjs.verify can hang in some environments due to curve initialization
// 3. The main verify behavior is already tested with artifacts provided (above tests)
// The fallback code path is: if no artifacts match, call groth16.verify directly (line 247 in groth16-adapter.ts)

hook('Cleanup snarkJS', async function () {
  // Clean up all provers used in tests
  for (const vector of testVectors) {
    const prover = new SnarkjsTransactionProver(vector.artifacts)
    await prover.cleanupSnarkJS()
  }

  // Clean up direct groth16 usage (curves)
  try {
    const curve = await curves.getCurveFromName('bn128')
    await curve.terminate()
  } catch (error) {
    // Ignore errors during cleanup - curve might already be terminated
  }
})
