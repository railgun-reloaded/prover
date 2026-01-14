import { hook, test } from 'brittle'

import { SnarkjsTransactionProver } from '../../src/index'
import { extractPublicInputsFromCircuitInputs, snarkJSToStandardInput, snarkJSToStandardProof, standardToSnarkJSInput, standardToSnarkJSProof, standardToSnarkJSPublicInputs } from '../../src/transaction/formatter'

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

test('Should ensure formatting is correct for snarkJSToStandardInput', async function (assert) {
  snarkJsCircuitInputs.forEach((snarkJsInput, i) => {
    const returnedStandardInputs = snarkJSToStandardInput(snarkJsInput)

    assert.alike(returnedStandardInputs, testVectors[i]!.inputs)
  })
})

test('snarkJSToStandardInput: converts hex strings to Uint8Array', (assert) => {
  const snarkjsInput = snarkJsCircuitInputs[0]
  if (!snarkjsInput) return assert.fail('No test vectors found')

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.ok(result.merkleRoot instanceof Uint8Array)
  assert.is(result.merkleRoot.length, 32)
  assert.ok(result.boundParamsHash instanceof Uint8Array)
  assert.is(result.boundParamsHash.length, 32)
  assert.ok(result.token instanceof Uint8Array)
  assert.is(result.token.length, 32)
  assert.ok(result.nullifyingKey instanceof Uint8Array)
  assert.is(result.nullifyingKey.length, 32)
})

test('snarkJSToStandardInput: converts arrays of hex strings to arrays of Uint8Array', (assert) => {
  const snarkjsInput = snarkJsCircuitInputs[0]
  if (!snarkjsInput) return assert.fail('No test vectors found')

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.ok(Array.isArray(result.publicKey))
  assert.ok(result.publicKey.every(pk => pk instanceof Uint8Array && pk.length === 32))

  assert.ok(Array.isArray(result.signature))
  assert.ok(result.signature.every(sig => sig instanceof Uint8Array && sig.length === 32))
})

test('snarkJSToStandardInput: converts inputTXOs correctly', (assert) => {
  const snarkjsInput = snarkJsCircuitInputs[0]
  if (!snarkjsInput) return assert.fail('No test vectors found')

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.inputTXOs.length, snarkjsInput.nullifiers.length)
  result.inputTXOs.forEach((txo) => {
    assert.ok(txo.nullifier instanceof Uint8Array)
    assert.is(txo.nullifier.length, 32)
    assert.ok(txo.randomIn instanceof Uint8Array)
    assert.is(txo.randomIn.length, 32)
    assert.is(typeof txo.valueIn, 'bigint')
    assert.is(typeof txo.merkleleafPosition, 'number')
    assert.ok(Array.isArray(txo.pathElements))
    assert.ok(txo.pathElements.every(pe => pe instanceof Uint8Array && pe.length === 32))
  })
})

test('snarkJSToStandardInput: converts outputTXOs correctly', (assert) => {
  const snarkjsInput = snarkJsCircuitInputs[0]
  if (!snarkjsInput) return assert.fail('No test vectors found')

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.outputTXOs.length, snarkjsInput.commitmentsOut.length)
  result.outputTXOs.forEach((txo) => {
    assert.ok(txo.commitment instanceof Uint8Array)
    assert.is(txo.commitment.length, 32)
    assert.ok(txo.npk instanceof Uint8Array)
    assert.is(txo.npk.length, 32)
    assert.is(typeof txo.value, 'bigint')
  })
})

test('snarkJSToStandardInput: converts string values to BigInt', (assert) => {
  const snarkjsInput = snarkJsCircuitInputs[0]
  if (!snarkjsInput) return assert.fail('No test vectors found')

  const result = snarkJSToStandardInput(snarkjsInput)

  result.inputTXOs.forEach((txo, i) => {
    const expectedValue = BigInt(snarkjsInput.valueIn[i]!)
    assert.is(txo.valueIn.toString(), expectedValue.toString())
  })

  result.outputTXOs.forEach((txo, i) => {
    const expectedValue = BigInt(snarkjsInput.valueOut[i]!)
    assert.is(txo.value.toString(), expectedValue.toString())
  })
})

test('snarkJSToStandardInput: preserves leavesIndices as numbers', (assert) => {
  const snarkjsInput = snarkJsCircuitInputs[0]
  if (!snarkjsInput) return assert.fail('No test vectors found')

  const result = snarkJSToStandardInput(snarkjsInput)

  result.inputTXOs.forEach((txo, i) => {
    assert.is(typeof txo.merkleleafPosition, 'number')
    assert.is(txo.merkleleafPosition, snarkjsInput.leavesIndices[i])
  })
})

test('snarkJSToStandardInput: handles multiple inputTXOs and outputTXOs', (assert) => {
  const snarkjsInput = snarkJsCircuitInputs[1]
  if (!snarkjsInput) return assert.fail('Need at least 2 test vectors')

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.ok(result.inputTXOs.length >= 2, 'should handle multiple inputs')
  assert.ok(result.outputTXOs.length >= 2, 'should handle multiple outputs')


  result.inputTXOs.forEach(txo => {
    assert.ok(txo.nullifier instanceof Uint8Array)
    assert.ok(txo.randomIn instanceof Uint8Array)
    assert.is(typeof txo.valueIn, 'bigint')
    assert.ok(Array.isArray(txo.pathElements))
  })


  result.outputTXOs.forEach(txo => {
    assert.ok(txo.commitment instanceof Uint8Array)
    assert.ok(txo.npk instanceof Uint8Array)
    assert.is(typeof txo.value, 'bigint')
  })
})

test('snarkJSToStandardInput: round-trip conversion preserves values', (assert) => {
  const original = testVectors[0]
  if (!original) return assert.fail('No test vectors found')

  const snarkjsFormat = standardToSnarkJSInput(original.inputs)
  const backToStandard = snarkJSToStandardInput(snarkjsFormat)


  assert.is(backToStandard.inputTXOs.length, original.inputs.inputTXOs.length)
  assert.is(backToStandard.outputTXOs.length, original.inputs.outputTXOs.length)


  original.inputs.inputTXOs.forEach((txo, i) => {
    assert.is(backToStandard.inputTXOs[i]!.valueIn.toString(), txo.valueIn.toString())
    assert.is(backToStandard.inputTXOs[i]!.merkleleafPosition, txo.merkleleafPosition)
  })

  original.inputs.outputTXOs.forEach((txo, i) => {
    assert.is(backToStandard.outputTXOs[i]!.value.toString(), txo.value.toString())
  })
})

test('snarkJSToStandardInput: handles large BigInt values', (assert) => {
  const snarkjsInput = {
    merkleRoot: '0x14a4f4001199b05fa5e3bd4ca9bd191084c891feac99be79272cdd671d5275b8',
    boundParamsHash: '0x1d64d5e8131bfc3fc3d10343fd3daf7798ae637302501b9058085eb0c2fd2fa1',
    nullifiers: ['0x0bee1c05c9921260085974c1b47e1b0ca39d5b3dfd40cc217a97e43c8595e299'],
    commitmentsOut: ['0x20a3de4307607d219d43d4ecb6f732c5f41d5d2ea1773325d44eba6833db88a8'],
    token: '0x0000000000000000000000000000000000000000000000000000000000000000',
    publicKey: ['0x0ab643966862eed77019d5d727dfd33503f760280079a02ecbff2728e359c832'],
    signature: ['0x059aa001a731044b2e8616835a3ac2bd546e4ae01d65c5310ae2ab2d8035c917'],
    randomIn: ['0x000000000000000000000000000000003df8b0f35478acf7bca5a9501776b86a'],
    valueIn: ['115792089237316195423570985008687907853269984665640564039457584007913129639935'],
    pathElements: [['0x0488f89b25bc7011eaf6a5edce71aeafb9fe706faa3c0a5cd9cbe868ae3b9ffc']],
    leavesIndices: [0],
    nullifyingKey: '0x10723748ec5f3c372795b09ff836a01c2d8912dbdf326e675bd2cce508f85249',
    npkOut: ['0x0000000000000000000000000000000000000000000000000000000000000000'],
    valueOut: ['115792089237316195423570985008687907853269984665640564039457584007913129639935']
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  const largeValue = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  assert.is(result.inputTXOs[0]!.valueIn.toString(), largeValue)
  assert.is(result.outputTXOs[0]!.value.toString(), largeValue)
})

test('snarkJSToStandardInput: handles zero values', (assert) => {
  const snarkjsInput = {
    merkleRoot: '0x' + '00'.repeat(32),
    boundParamsHash: '0x' + '00'.repeat(32),
    nullifiers: ['0x' + '00'.repeat(32)],
    commitmentsOut: ['0x' + '00'.repeat(32)],
    token: '0x' + '00'.repeat(32),
    publicKey: ['0x' + '00'.repeat(32)],
    signature: ['0x' + '00'.repeat(32)],
    randomIn: ['0x' + '00'.repeat(32)],
    valueIn: ['0'],
    pathElements: [['0x' + '00'.repeat(32)]],
    leavesIndices: [0],
    nullifyingKey: '0x' + '00'.repeat(32),
    npkOut: ['0x' + '00'.repeat(32)],
    valueOut: ['0']
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.inputTXOs[0]!.valueIn.toString(), '0')
  assert.is(result.outputTXOs[0]!.value.toString(), '0')
  assert.is(result.inputTXOs[0]!.merkleleafPosition, 0)
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
