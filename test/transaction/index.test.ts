import { hook, test } from 'brittle'

import { SnarkjsTransactionProver } from '../../src/index'
import { extractPublicInputsFromCircuitInputs, snarkJSToStandardProof, standardToSnarkJSInput, standardToSnarkJSProof, standardToSnarkJSPublicInputs } from '../../src/transaction/formatter'

import { snarkJsCircuitInputs, snarkJsProofs, snarkJsPublicInputs, standardProofs, standardPublicInputs, testVectors } from './test-vectors'

test('Transaction Prover: Should prove', async function (assert) {
  for (const vector of testVectors) {
    const prover = new SnarkjsTransactionProver(vector.artifacts)
    assert.execution(await prover.prove(vector.inputs), `Circuit Size ${vector.inputs.inputTXOs.length}x${vector.inputs.outputTXOs.length}`)
  }
})

test('Transaction Prover: Should prove and verify, using publicSignals returned from prove', async function (assert) {
  for (const vector of testVectors) {
    const prover = new SnarkjsTransactionProver(vector.artifacts)
    const { proof, publicInputs } = await prover.prove(vector.inputs)

    assert.ok(await prover.verify(publicInputs, proof), `Circuit Size ${vector.inputs.inputTXOs.length}x${vector.inputs.outputTXOs.length}`)
  }
})
test('Transaction Prover: Should cover failing on  invalid proof generation with corrupted zkey ', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const corruptedArtifacts = {
    ...vector.artifacts,
    zkey: Buffer.from('invalid-zkey-data-that-causes-wasm-failure')
  }
  const prover = new SnarkjsTransactionProver(corruptedArtifacts)

  try {
    await prover.prove(vector.inputs)
    assert.fail('Should have thrown during fullProve')
  } catch (error: any) {
    assert.ok(error.message.includes('Proof generation failed'), 'Successfully hit line 54')
  }
})
test('Transaction Prover: Should cover failing on invalid  verification with mismatched Vkey', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')

  const mismatchedArtifacts = {
    ...vector.artifacts,
    vkey: testVectors[1]!.artifacts.vkey
  }
  const proverFalse = new SnarkjsTransactionProver(mismatchedArtifacts)

  try {
    await proverFalse.prove(vector.inputs)
    assert.fail('Should have failed isValid check')
  } catch (error: any) {
    assert.is(error.message, 'Proof verification failed: Generated proof is invalid', 'Hit line 65')
  }
})

test('Transaction Prover: Should cover failing on invalid  verification corrupted VKey', async function (assert) {
  const vector = testVectors[0]
  if (!vector) return assert.fail('No test vectors found')
  const brokenVkeyArtifacts = {
    ...vector.artifacts,
    vkey: { ...vector.artifacts.vkey, vk_alpha_1: ['not', 'a', 'point'] }
  }
  const proverCrash = new SnarkjsTransactionProver(brokenVkeyArtifacts as any)

  try {
    await proverCrash.prove(vector.inputs)
    assert.fail('Should have crashed during internal verify')
  } catch (error: any) {
    assert.ok(error.message.includes('Proof verification failed'), 'Hit line 69')
  }
})

test('Should ensure formatting is correct for SnarkjsProof', async function (assert) {
  snarkJsProofs.forEach((snarkJsProof, i) => {
    const returnedStandardProof = snarkJSToStandardProof(snarkJsProof)

    assert.alike(returnedStandardProof, standardProofs[i])
  })
})

test('Should ensure formatting is correct for Proof', async function (assert) {
  standardProofs.forEach((standardProof, i) => {
    const returnedSnarkJsProof = standardToSnarkJSProof(standardProof)

    assert.alike(returnedSnarkJsProof, snarkJsProofs[i])
  })
})

test('Should ensure formatting is correct for CircuitInputs', async function (assert) {
  testVectors.forEach((testVector, i) => {
    const returnedSnarkJsCircuitInputs = standardToSnarkJSInput(testVector.inputs)

    assert.alike(returnedSnarkJsCircuitInputs, snarkJsCircuitInputs[i])
  })
})

test('Should ensure formatting is correct for PublicInputs', async function (assert) {
  standardPublicInputs.forEach((standardPublicInput, i) => {
    const returnedStringArray = standardToSnarkJSPublicInputs(standardPublicInput)

    assert.alike(returnedStringArray, snarkJsPublicInputs[i])
  })
})

test('Should ensure formatting is correct for extracted PublicInputs', async function (assert) {
  testVectors.forEach((testVector, i) => {
    const returnedPublicInputs = extractPublicInputsFromCircuitInputs(testVector.inputs, testVector.proof)

    assert.alike(returnedPublicInputs, standardPublicInputs[i])
  })
})

hook('Cleanup snarkJS', async function () {
  for (const vector of testVectors) {
    const prover = new SnarkjsTransactionProver(vector.artifacts)

    await prover.cleanupSnarkJS()
  }
})
