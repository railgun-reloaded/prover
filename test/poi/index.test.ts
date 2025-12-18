/* eslint-disable jsdoc/require-jsdoc */

import fs from 'fs'
import path from 'path'

import { hook, test } from 'brittle'

import { SnarkjsPoiProver } from '../../src'
import { numberStringToUint8Array } from '../../src/formatters/bytes'
import type { POICircuitInputs, ProverArtifacts } from '../../src/index'

const ARTIFACTS_ROOT = path.resolve(__dirname, './artifacts')
const TEST_VECTORS_DIR = path.resolve(__dirname, './test-vectors')
const PROOF_TIMEOUT = 300000

const toUint8 = (value: string | number | bigint): Uint8Array => {
  const asString = value.toString()
  const decimalString = asString.startsWith('0x') ? BigInt(asString).toString() : asString
  return numberStringToUint8Array(decimalString, 32)
}

const toBigIntString = (value: string | number | bigint): string => {
  const asString = value.toString()
  return asString.startsWith('0x') ? BigInt(asString).toString() : asString
}

const loadArtifacts = (subdir: '3x3' | '13x13'): ProverArtifacts => {
  const dir = path.join(ARTIFACTS_ROOT, subdir)
  const zkey = fs.readFileSync(path.resolve(dir, 'zkey'))
  const wasm = fs.readFileSync(path.resolve(dir, 'circuit.wasm'))
  const vkey = JSON.parse(fs.readFileSync(path.join(dir, 'vkey.json'), 'utf8'))

  return { wasm, zkey, vkey } as ProverArtifacts
}

const artifactsBySize: Record<'3x3' | '13x13', ProverArtifacts> = {
  '3x3': loadArtifacts('3x3'),
  '13x13': loadArtifacts('13x13'),
}

type PoiTestVector = {
  inputs: POICircuitInputs
  artifacts: ProverArtifacts
}

const chooseArtifacts = (raw: any): ProverArtifacts => {
  const poiRoots = (raw.poiMerkleroots ?? []).length
  return poiRoots <= 3 ? artifactsBySize['3x3'] : artifactsBySize['13x13']
}

const loadTestVectors = (): PoiTestVector[] => {
  const dirs = [path.join(TEST_VECTORS_DIR, 'test-vectors-large'), path.join(TEST_VECTORS_DIR, 'test-vectors-small')]

  const filesWithDir = dirs.flatMap(dir =>
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .map(f => path.join(dir, f))
  )

  return filesWithDir.map(fileName => {
    const raw = JSON.parse(fs.readFileSync(fileName, 'utf8'))
    const artifacts = chooseArtifacts(raw)
    const inputs = {
      anyRailgunTxidMerklerootAfterTransaction: toUint8(raw.anyRailgunTxidMerklerootAfterTransaction ?? 0),
      poiMerkleroots: (raw.poiMerkleroots ?? []).map(toUint8),
      boundParamsHash: toUint8(raw.boundParamsHash ?? 0),
      nullifiers: (raw.nullifiers ?? []).map(toUint8),
      commitmentsOut: (raw.commitmentsOut ?? []).map(toUint8),
      spendingPublicKey: (raw.spendingPublicKey ?? []).map(toUint8),
      nullifyingKey: toUint8(raw.nullifyingKey ?? 0),
      token: toUint8(raw.token ?? 0),
      randomsIn: (raw.randomsIn ?? []).map(toUint8),
      valuesIn: (raw.valuesIn ?? []).map((v: string | number | bigint) => BigInt(v)),
      utxoPositionsIn: (raw.utxoPositionsIn ?? []).map((v: string | number | bigint) => Number(toBigIntString(v))),
      utxoTreeIn: Number(toBigIntString(raw.utxoTreesIn ?? 0)),
      npksOut: (raw.npksOut ?? []).map(toUint8),
      valuesOut: (raw.valuesOut ?? []).map((v: string | number | bigint) => BigInt(v)),
      utxoBatchGlobalStartPositionOut: toUint8(raw.utxoBatchGlobalStartPositionOut ?? 0),
      railgunTxidIfHasUnshield: toUint8(raw.railgunTxidIfHasUnshield ?? 0),
      railgunTxidMerkleProofIndices: Number(toBigIntString(raw.railgunTxidMerkleProofIndices ?? 0)),
      railgunTxidMerkleProofPathElements: (raw.railgunTxidMerkleProofPathElements ?? []).map(toUint8),
      poiInMerkleProofIndices: (raw.poiInMerkleProofIndices ?? []).map((v: string | number | bigint) => Number(toBigIntString(v))),
      poiInMerkleProofPathElements: (raw.poiInMerkleProofPathElements ?? []).map((arr: Array<string | number | bigint>) => arr.map(toUint8))
    } as unknown as POICircuitInputs & Record<string, unknown>

    return { inputs, artifacts }
  })
}

const testVectors = loadTestVectors()

test('POI: All test vectors have consistent structure', { timeout: PROOF_TIMEOUT }, async function (assert) {
  assert.ok(testVectors.length > 0, 'should have test vectors')

  for (const [i, vector] of testVectors.entries()) {
    assert.ok(vector.inputs, `vector ${i} should have inputs`)
    assert.ok(vector.artifacts, `vector ${i} should have artifacts`)
    assert.ok(vector.artifacts.wasm, `vector ${i} should have wasm`)
    assert.ok(vector.artifacts.zkey, `vector ${i} should have zkey`)
    assert.ok(vector.artifacts.vkey, `vector ${i} should have vkey`)
  }
})

test('POI: Should prove all vectors', { timeout: PROOF_TIMEOUT }, async function (assert) {
  for (const [i, vector] of testVectors.entries()) {
    const prover = new SnarkjsPoiProver(vector.artifacts)

    assert.execution(await prover.prove(vector.inputs), `vector ${i}`)
  }
})

test('POI: Should prove and verify', { timeout: PROOF_TIMEOUT }, async function (assert) {
  for (const [i, vector] of testVectors.entries()) {
    const prover = new SnarkjsPoiProver(vector.artifacts)
    const { proof, publicInputs } = await prover.prove(vector.inputs)

    const isValid = await prover.verify(publicInputs, proof)
    assert.ok(isValid, `vector ${i}`)
  }
})

test('POI: Should fail when using 3x3 artifacts for 13x13 inputs', { timeout: PROOF_TIMEOUT }, async function (assert) {
  const vector13x13 = testVectors.find(v => v.artifacts === artifactsBySize['13x13'])
  if (!vector13x13) {
    assert.pass('No 13x13 vector found to test mismatch')
    return
  }

  const wrongProver = new SnarkjsPoiProver(artifactsBySize['3x3'])

  try {
    await wrongProver.prove(vector13x13.inputs)
    assert.fail('Should have failed due to input/constraint mismatch')
  } catch (error) {
    assert.ok(error instanceof Error, 'Caught expected mismatch error')
  }
})

test('POI: Should fail when using 13x13 artifacts for 3x3 inputs', { timeout: PROOF_TIMEOUT }, async function (assert) {
  const vector3x3 = testVectors.find(v => v.artifacts === artifactsBySize['3x3'])
  if (!vector3x3) {
    assert.pass('No 3x3 vector found to test mismatch')
    return
  }

  const wrongProver = new SnarkjsPoiProver(artifactsBySize['13x13'])

  try {
    await wrongProver.prove(vector3x3.inputs)
    assert.fail('Should have failed due to undersized input arrays')
  } catch (error) {
    assert.ok(error instanceof Error, 'Caught expected mismatch error')
  }
})

test('POI: Edge Case - All zero inputs', { timeout: PROOF_TIMEOUT }, async function (assert) {
  const vector = testVectors[0]!
  const prover = new SnarkjsPoiProver(vector.artifacts)

  const zeroInputs = Object.keys(vector.inputs).reduce((acc, key) => {
    const val = (vector.inputs as any)[key]
    if (Array.isArray(val)) {
      acc[key] = val.map(() => (typeof val[0] === 'bigint' ? 0n : new Uint8Array(32).fill(0)))
    } else {
      acc[key] = typeof val === 'bigint' ? 0n : (typeof val === 'number' ? 0 : new Uint8Array(32).fill(0))
    }
    return acc
  }, {} as any)

  try {
    await prover.prove(zeroInputs)
    assert.fail('Proving zero inputs should fail circuit constraints')
  } catch (error) {
    assert.ok(error, 'Correctly rejected invalid zero-knowledge witness')
  }
})
test('POI: Edge Case - Values exceeding field prime', { timeout: PROOF_TIMEOUT }, async function (assert) {
  const vector = testVectors[0]!
  const prover = new SnarkjsPoiProver(vector.artifacts)

  // SNARK Field Prime (Bn254)
  const SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

  const invalidInputs = {
    ...vector.inputs,
    valuesIn: vector.inputs.valuesIn.map(() => SNARK_SCALAR_FIELD + 1n)
  }

  try {
    await prover.prove(invalidInputs as POICircuitInputs)
    assert.fail('Should fail when input exceeds field prime')
  } catch (error) {
    assert.ok(error, 'Correctly handled out-of-bounds field element')
  }
})

test('POI: Should generate different proofs for different inputs', { timeout: PROOF_TIMEOUT }, async function (assert) {
  if (testVectors.length < 2) {
    assert.pass('Not enough test vectors')
    return
  }

  const prover1 = new SnarkjsPoiProver(testVectors[0]!.artifacts)
  const prover2 = new SnarkjsPoiProver(testVectors[1]!.artifacts)

  const result1 = await prover1.prove(testVectors[0]!.inputs)
  const result2 = await prover2.prove(testVectors[1]!.inputs)

  const proof1Hex = Buffer.from(result1.proof.a.x).toString('hex')
  const proof2Hex = Buffer.from(result2.proof.a.x).toString('hex')

  assert.not(proof1Hex, proof2Hex, 'proofs should be different for different inputs')
})

test('POI: Should reject invalid proof', { timeout: PROOF_TIMEOUT }, async function (assert) {
  if (testVectors.length === 0) {
    assert.pass('No test vectors available')
    return
  }

  const vector = testVectors[0]!
  const prover = new SnarkjsPoiProver(vector.artifacts)
  const { proof, publicInputs } = await prover.prove(vector.inputs)

  const corruptedProof = {
    ...proof,
    a: {
      ...proof.a,
      x: numberStringToUint8Array('123456789', 32)
    }
  }

  const isValid = await prover.verify(publicInputs, corruptedProof)
  assert.not(isValid, 'corrupted proof should be invalid')
})

test('POI: Should reject mismatched public inputs', { timeout: PROOF_TIMEOUT }, async function (assert) {
  if (testVectors.length < 2) {
    assert.pass('Not enough test vectors')
    return
  }

  const prover1 = new SnarkjsPoiProver(testVectors[0]!.artifacts)
  const prover2 = new SnarkjsPoiProver(testVectors[1]!.artifacts)

  const { proof } = await prover1.prove(testVectors[0]!.inputs)
  const { publicInputs } = await prover2.prove(testVectors[1]!.inputs)

  const isValid = await prover1.verify(publicInputs, proof)
  assert.not(isValid, 'proof should be invalid with mismatched public inputs')
})

test('POI: Should validate public inputs structure', { timeout: PROOF_TIMEOUT }, async function (assert) {
  if (testVectors.length === 0) {
    assert.pass('No test vectors available')
    return
  }

  const vector = testVectors[0]!
  const prover = new SnarkjsPoiProver(vector.artifacts)
  const { publicInputs } = await prover.prove(vector.inputs)

  assert.ok(publicInputs.proof, 'should have proof')
  assert.ok(publicInputs.blindedCommitmentsOut, 'should have blindedCommitmentsOut')
  assert.ok(Array.isArray(publicInputs.blindedCommitmentsOut), 'blindedCommitmentsOut should be array')
  assert.ok(publicInputs.poiMerkleroots, 'should have poiMerkleroots')
  assert.ok(Array.isArray(publicInputs.poiMerkleroots), 'poiMerkleroots should be array')
  assert.ok(publicInputs.anyRailgunTxidMerklerootAfterTransaction, 'should have anyRailgunTxidMerklerootAfterTransaction')
  assert.ok(publicInputs.railgunTxidIfHasUnshield, 'should have railgunTxidIfHasUnshield')

  // Verify blindedCommitmentsOut(output of the circuit run) length matches circuit size
  const expectedLength = vector.artifacts === artifactsBySize['3x3'] ? 3 : 13
  assert.is(publicInputs.blindedCommitmentsOut.length, expectedLength, 'blindedCommitmentsOut should match circuit size')
})

test('POI: Should produce consistent proof for same inputs', { timeout: PROOF_TIMEOUT }, async function (assert) {
  if (testVectors.length === 0) {
    assert.pass('No test vectors available')
    return
  }

  const vector = testVectors[0]!
  const prover = new SnarkjsPoiProver(vector.artifacts)

  const result1 = await prover.prove(vector.inputs)
  const result2 = await prover.prove(vector.inputs)

  const pubInput1Str = Buffer.from(result1.publicInputs.anyRailgunTxidMerklerootAfterTransaction).toString('hex')
  const pubInput2Str = Buffer.from(result2.publicInputs.anyRailgunTxidMerklerootAfterTransaction).toString('hex')

  assert.is(pubInput1Str, pubInput2Str, 'public inputs should be identical for same circuit inputs')

  assert.ok(await prover.verify(result1.publicInputs, result1.proof), 'first proof should verify')
  assert.ok(await prover.verify(result2.publicInputs, result2.proof), 'second proof should verify')
})

test('POI: Should throw internal verification error when vkey/zkey mismatch', async function (assert) {
  const mismatchedArtifacts = {
    wasm: artifactsBySize['3x3'].wasm,
    zkey: artifactsBySize['3x3'].zkey,
    vkey: artifactsBySize['13x13'].vkey
  }

  const prover = new SnarkjsPoiProver(mismatchedArtifacts as any)
  const vector = testVectors.find(v => v.artifacts === artifactsBySize['3x3'])!

  try {
    await prover.prove(vector.inputs)
    assert.fail('Should have failed internal verification')
  } catch (error) {
    const err = error as Error
    assert.ok(
      err.message.includes('Generated proof is invalid') ||
      err.message.includes('Proof verification failed'),
      `Caught expected internal error: ${err.message}`
    )
  }
})

test('POI: Error handling - should throw on prove failure', { timeout: PROOF_TIMEOUT }, async function (assert) {
  if (testVectors.length === 0) {
    assert.pass('No test vectors available')
    return
  }

  const vector = testVectors[0]!
  const prover = new SnarkjsPoiProver(vector.artifacts)

  const invalidInputs = {
    ...vector.inputs,
    spendingPublicKey: []
  }

  try {
    await prover.prove(invalidInputs as POICircuitInputs)
    assert.fail('should have thrown an error')
  } catch (error) {
    assert.ok(error instanceof Error, 'should throw an Error')
    assert.ok((error as Error).message.includes('Proof generation failed'), 'error message should indicate proof generation failure')
  }
})

hook('Cleanup snarkJS', async function () {
  for (const artifacts of Object.values(artifactsBySize)) {
    const prover = new SnarkjsPoiProver(artifacts)
    await prover.cleanupSnarkJS()
  }
})
