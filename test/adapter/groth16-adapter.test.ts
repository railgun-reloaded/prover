import { hook, test } from 'brittle'
import type { SnarkjsProof } from 'snarkjs'
import { curves } from 'snarkjs'

import type { TransactionBigintInputs, TransactionCircuitInputs } from '../../src'
import { SnarkjsTransactionProver, createGroth16ForEngine, uint8ArrayToNumberString } from '../../src'
import { testVectors } from '../transaction/test-vectors'

/**
 * Convert TransactionCircuitInputs (Uint8Array domain format) to TransactionBigintInputs
 * (flat bigint format) as the engine would produce.
 * @param inputs - Domain circuit inputs with Uint8Array field elements.
 * @returns Flat bigint inputs matching TransactionBigintInputs.
 */
function toBigintInputs (inputs: TransactionCircuitInputs): TransactionBigintInputs {
  /**
   * Convert a Uint8Array field element to a bigint.
   * @param arr - Uint8Array to convert.
   * @returns Bigint representation of the field element.
   */
  const toBI = (arr: Uint8Array) => BigInt(uint8ArrayToNumberString(arr))

  return {
    merkleRoot: toBI(inputs.merkleRoot),
    boundParamsHash: toBI(inputs.boundParamsHash),
    nullifiers: inputs.inputTXOs.map(txo => toBI(txo.nullifier)),
    commitmentsOut: inputs.outputTXOs.map(txo => toBI(txo.commitment)),
    token: toBI(inputs.token),
    publicKey: inputs.publicKey.map(toBI),
    signature: inputs.signature.map(toBI),
    randomIn: inputs.inputTXOs.map(txo => toBI(txo.randomIn)),
    valueIn: inputs.inputTXOs.map(txo => txo.valueIn),
    pathElements: inputs.inputTXOs.flatMap(txo => txo.pathElements.map(toBI)),
    leavesIndices: inputs.inputTXOs.map(txo => BigInt(txo.merkleleafPosition)),
    nullifyingKey: toBI(inputs.nullifyingKey),
    npkOut: inputs.outputTXOs.map(txo => toBI(txo.npk)),
    valueOut: inputs.outputTXOs.map(txo => txo.value),
  }
}

test('Groth16Adapter: Should match snarkjs.groth16.fullProve interface for transaction', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const prover = new SnarkjsTransactionProver(vector.artifacts)
  const groth16Adapter = createGroth16ForEngine({
    transaction: { prover, artifacts: vector.artifacts },
  })

  const bigintInputs = toBigintInputs(vector.inputs)
  const result = await groth16Adapter.fullProve(
    bigintInputs,
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
})

test('Groth16Adapter: Should match snarkjs.groth16.verify interface for transaction', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const prover = new SnarkjsTransactionProver(vector.artifacts)
  const groth16Adapter = createGroth16ForEngine({
    transaction: { prover, artifacts: vector.artifacts },
  })

  const bigintInputs = toBigintInputs(vector.inputs)
  const proveResult = await groth16Adapter.fullProve(
    bigintInputs,
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
    const groth16Adapter = createGroth16ForEngine({
      transaction: { prover, artifacts: vector.artifacts },
    })

    const bigintInputs = toBigintInputs(vector.inputs)
    const result = await groth16Adapter.fullProve(
      bigintInputs,
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
  const groth16Adapter = createGroth16ForEngine({
    transaction: { prover, artifacts: vector.artifacts },
  })

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
  const groth16Adapter = createGroth16ForEngine({
    transaction: { prover, artifacts: vector.artifacts },
  })

  const bigintInputs = toBigintInputs(vector.inputs)
  const proveResult = await groth16Adapter.fullProve(
    bigintInputs,
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

test('Groth16Adapter: Should throw error when transaction prover not configured', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const groth16Adapter = createGroth16ForEngine({})

  const bigintInputs = toBigintInputs(vector.inputs)

  try {
    await groth16Adapter.fullProve(
      bigintInputs,
      vector.artifacts.wasm,
      vector.artifacts.zkey
    )
    assert.fail('should throw error when prover not configured')
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
