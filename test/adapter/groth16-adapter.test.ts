import fs from 'fs'
import path from 'path'

import { hook, test } from 'brittle'
import { curves } from 'snarkjs'

import type { ProverArtifacts, TransactionBigintInputs, TransactionCircuitInputs } from '../../src'
import { SnarkjsPoiProver, SnarkjsTransactionProver, createGroth16ForEngine, createGroth16FromPOIProver, createGroth16FromTransactionProver } from '../../src'
import { uint8ArrayToHexString } from '../../src/core/bytes'
import { bigintToPOICircuitInputs } from '../../src/poi/formatter'
import type { POIBigintInputs } from '../../src/poi/types'
import { bigintToTransactionCircuitInputs } from '../../src/transaction/formatter'
import { testVectors } from '../transaction/test-vectors'

const PROOF_TIMEOUT = 120_000

/**
 * Convert a Uint8Array to its bigint representation.
 * @param arr - The byte array to convert.
 * @returns The bigint value.
 */
const toBigint = (arr: Uint8Array): bigint => BigInt(uint8ArrayToHexString(arr))

/**
 * Convert standard TransactionCircuitInputs to the flat bigint format the engine sends.
 * @param inputs - Standard circuit inputs with Uint8Arrays and nested TXO structures.
 * @returns Flat bigint-based inputs matching TransactionBigintInputs.
 */
function standardToTransactionBigintInputs (inputs: TransactionCircuitInputs): TransactionBigintInputs {
  return {
    merkleRoot: toBigint(inputs.merkleRoot),
    boundParamsHash: toBigint(inputs.boundParamsHash),
    token: toBigint(inputs.token),
    publicKey: inputs.publicKey.map(toBigint),
    signature: inputs.signature.map(toBigint),
    nullifyingKey: toBigint(inputs.nullifyingKey),
    nullifiers: inputs.inputTXOs.map(txo => toBigint(txo.nullifier)),
    randomIn: inputs.inputTXOs.map(txo => toBigint(txo.randomIn)),
    valueIn: inputs.inputTXOs.map(txo => txo.valueIn),
    pathElements: inputs.inputTXOs.flatMap(txo => txo.pathElements.map(toBigint)),
    leavesIndices: inputs.inputTXOs.map(txo => BigInt(txo.merkleleafPosition)),
    commitmentsOut: inputs.outputTXOs.map(txo => toBigint(txo.commitment)),
    npkOut: inputs.outputTXOs.map(txo => toBigint(txo.npk)),
    valueOut: inputs.outputTXOs.map(txo => txo.value),
  }
}

const POI_ARTIFACTS_ROOT = path.resolve(__dirname, '../poi/artifacts')
const POI_VECTORS_DIR = path.resolve(__dirname, '../poi/test-vectors/test-vectors-small')

/**
 * Load POI test artifacts from the bundled directory.
 * @param subdir - The circuit dimension subdirectory to load.
 * @returns ProverArtifacts with wasm, zkey, and vkey.
 */
const loadPOIArtifacts = (subdir: '3x3' | '13x13'): ProverArtifacts => {
  const dir = path.join(POI_ARTIFACTS_ROOT, subdir)
  return {
    wasm: fs.readFileSync(path.resolve(dir, 'circuit.wasm')),
    zkey: fs.readFileSync(path.resolve(dir, 'zkey')),
    vkey: JSON.parse(fs.readFileSync(path.join(dir, 'vkey.json'), 'utf8')),
  } as ProverArtifacts
}

/**
 * Parse a JSON test vector value (hex or decimal string) to bigint.
 * @param value - String value from JSON test vector.
 * @returns Bigint representation.
 */
const parseBigint = (value: string | number | bigint): bigint => BigInt(value)

/**
 * Load a POI test vector as POIBigintInputs directly from JSON.
 * @param filePath - Path to the JSON test vector file.
 * @returns POIBigintInputs matching the engine's FormattedCircuitInputsPOI.
 */
function loadPOIBigintInputs (filePath: string): POIBigintInputs {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return {
    anyRailgunTxidMerklerootAfterTransaction: parseBigint(raw.anyRailgunTxidMerklerootAfterTransaction ?? 0),
    poiMerkleroots: (raw.poiMerkleroots ?? []).map(parseBigint),
    boundParamsHash: parseBigint(raw.boundParamsHash ?? 0),
    nullifiers: (raw.nullifiers ?? []).map(parseBigint),
    commitmentsOut: (raw.commitmentsOut ?? []).map(parseBigint),
    spendingPublicKey: [
      parseBigint((raw.spendingPublicKey ?? [])[0] ?? 0),
      parseBigint((raw.spendingPublicKey ?? [])[1] ?? 0),
    ],
    nullifyingKey: parseBigint(raw.nullifyingKey ?? 0),
    token: parseBigint(raw.token ?? 0),
    randomsIn: (raw.randomsIn ?? []).map(parseBigint),
    valuesIn: (raw.valuesIn ?? []).map(parseBigint),
    utxoPositionsIn: (raw.utxoPositionsIn ?? []).map(parseBigint),
    utxoTreeIn: parseBigint(raw.utxoTreeIn ?? 0),
    npksOut: (raw.npksOut ?? []).map(parseBigint),
    valuesOut: (raw.valuesOut ?? []).map(parseBigint),
    utxoBatchGlobalStartPositionOut: parseBigint(raw.utxoBatchGlobalStartPositionOut ?? 0),
    railgunTxidIfHasUnshield: parseBigint(raw.railgunTxidIfHasUnshield ?? 0),
    railgunTxidMerkleProofIndices: parseBigint(raw.railgunTxidMerkleProofIndices ?? 0),
    railgunTxidMerkleProofPathElements: (raw.railgunTxidMerkleProofPathElements ?? []).map(parseBigint),
    poiInMerkleProofIndices: (raw.poiInMerkleProofIndices ?? []).map(parseBigint),
    poiInMerkleProofPathElements: (raw.poiInMerkleProofPathElements ?? []).map(
      (arr: Array<string | number | bigint>) => arr.map(parseBigint)
    ),
  }
}

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

test('bigintToTransactionCircuitInputs — 1x2 roundtrip matches standard inputs', async (t) => {
  const vector = testVectors[0]!
  const bigintInputs = standardToTransactionBigintInputs(vector.inputs)
  const converted = bigintToTransactionCircuitInputs(bigintInputs)

  t.is(uint8ArrayToHexString(converted.merkleRoot), uint8ArrayToHexString(vector.inputs.merkleRoot))
  t.is(uint8ArrayToHexString(converted.boundParamsHash), uint8ArrayToHexString(vector.inputs.boundParamsHash))
  t.is(uint8ArrayToHexString(converted.token), uint8ArrayToHexString(vector.inputs.token))
  t.is(uint8ArrayToHexString(converted.nullifyingKey), uint8ArrayToHexString(vector.inputs.nullifyingKey))

  t.is(converted.publicKey.length, vector.inputs.publicKey.length)
  t.is(converted.signature.length, vector.inputs.signature.length)
  t.is(converted.inputTXOs.length, vector.inputs.inputTXOs.length)
  t.is(converted.outputTXOs.length, vector.inputs.outputTXOs.length)

  for (let i = 0; i < converted.inputTXOs.length; i++) {
    const got = converted.inputTXOs[i]!
    const expected = vector.inputs.inputTXOs[i]!
    t.is(uint8ArrayToHexString(got.nullifier), uint8ArrayToHexString(expected.nullifier), `inputTXO[${i}] nullifier`)
    t.is(uint8ArrayToHexString(got.randomIn), uint8ArrayToHexString(expected.randomIn), `inputTXO[${i}] randomIn`)
    t.is(got.valueIn, expected.valueIn, `inputTXO[${i}] valueIn`)
    t.is(got.merkleleafPosition, expected.merkleleafPosition, `inputTXO[${i}] merkleleafPosition`)
    t.is(got.pathElements.length, expected.pathElements.length, `inputTXO[${i}] pathElements count`)
    for (let j = 0; j < got.pathElements.length; j++) {
      t.is(uint8ArrayToHexString(got.pathElements[j]!), uint8ArrayToHexString(expected.pathElements[j]!), `inputTXO[${i}] pathElement[${j}]`)
    }
  }

  for (let i = 0; i < converted.outputTXOs.length; i++) {
    const got = converted.outputTXOs[i]!
    const expected = vector.inputs.outputTXOs[i]!
    t.is(uint8ArrayToHexString(got.commitment), uint8ArrayToHexString(expected.commitment), `outputTXO[${i}] commitment`)
    t.is(uint8ArrayToHexString(got.npk), uint8ArrayToHexString(expected.npk), `outputTXO[${i}] npk`)
    t.is(got.value, expected.value, `outputTXO[${i}] value`)
  }
})

test('bigintToTransactionCircuitInputs — 2x2 roundtrip matches standard inputs', async (t) => {
  const vector = testVectors[1]!
  const bigintInputs = standardToTransactionBigintInputs(vector.inputs)
  const converted = bigintToTransactionCircuitInputs(bigintInputs)

  t.is(uint8ArrayToHexString(converted.merkleRoot), uint8ArrayToHexString(vector.inputs.merkleRoot))
  t.is(converted.inputTXOs.length, 2, 'should have 2 input TXOs')
  t.is(converted.outputTXOs.length, 2, 'should have 2 output TXOs')

  for (let i = 0; i < converted.inputTXOs.length; i++) {
    const got = converted.inputTXOs[i]!
    const expected = vector.inputs.inputTXOs[i]!
    t.is(got.pathElements.length, expected.pathElements.length, `inputTXO[${i}] correct tree depth`)
    t.is(got.merkleleafPosition, expected.merkleleafPosition, `inputTXO[${i}] correct leaf position`)
  }
})

test('bigintToPOICircuitInputs — 3x3 vector produces valid structure', async (t) => {
  const vectorFile = path.join(POI_VECTORS_DIR, 'inputs0.json')
  const bigintInputs = loadPOIBigintInputs(vectorFile)
  const converted = bigintToPOICircuitInputs(bigintInputs)

  t.ok(converted.anyRailgunTxidMerklerootAfterTransaction instanceof Uint8Array)
  t.is(converted.anyRailgunTxidMerklerootAfterTransaction.length, 32)
  t.is(converted.poiMerkleroots.length, bigintInputs.poiMerkleroots.length)
  t.is(converted.nullifiers.length, bigintInputs.nullifiers.length)
  t.is(converted.commitmentsOut.length, bigintInputs.commitmentsOut.length)
  t.is(converted.spendingPublicKey.length, 2)
  t.is(converted.randomsIn.length, bigintInputs.randomsIn.length)
  t.is(converted.valuesIn.length, bigintInputs.valuesIn.length)
  t.is(converted.railgunTxidMerkleProofPathElements.length, bigintInputs.railgunTxidMerkleProofPathElements.length)
  t.is(converted.poiInMerkleProofPathElements.length, bigintInputs.poiInMerkleProofPathElements.length)

  t.alike(converted.valuesIn, bigintInputs.valuesIn)
  t.alike(converted.valuesOut, bigintInputs.valuesOut)
})

test('bigintToPOICircuitInputs — roundtrip preserves field values', async (t) => {
  const vectorFile = path.join(POI_VECTORS_DIR, 'inputs0.json')
  const bigintInputs = loadPOIBigintInputs(vectorFile)
  const converted = bigintToPOICircuitInputs(bigintInputs)

  t.is(toBigint(converted.anyRailgunTxidMerklerootAfterTransaction), bigintInputs.anyRailgunTxidMerklerootAfterTransaction)
  t.is(toBigint(converted.boundParamsHash), bigintInputs.boundParamsHash)
  t.is(toBigint(converted.nullifyingKey), bigintInputs.nullifyingKey)
  t.is(toBigint(converted.token), bigintInputs.token)

  for (let i = 0; i < converted.nullifiers.length; i++) {
    t.is(toBigint(converted.nullifiers[i]!), bigintInputs.nullifiers[i]!, `nullifier[${i}]`)
  }

  for (let i = 0; i < converted.poiMerkleroots.length; i++) {
    t.is(toBigint(converted.poiMerkleroots[i]!), bigintInputs.poiMerkleroots[i]!, `poiMerkleroot[${i}]`)
  }
})

test('createGroth16ForEngine — e2e transaction proof 1x2', { timeout: PROOF_TIMEOUT }, async (t) => {
  const vector = testVectors[0]!
  const adapter = createGroth16ForEngine()
  const bigintInputs = standardToTransactionBigintInputs(vector.inputs)

  const result = await adapter.fullProve(bigintInputs, vector.artifacts.wasm, vector.artifacts.zkey)
  t.ok(result.proof, 'should return proof')
  t.ok(result.publicSignals, 'should return publicSignals')
  t.ok(Array.isArray(result.publicSignals), 'publicSignals should be an array')

  const isValid = await adapter.verify(vector.artifacts.vkey, result.publicSignals, result.proof)
  t.ok(isValid, 'proof should verify')
})

test('createGroth16ForEngine — e2e transaction proof 2x2', { timeout: PROOF_TIMEOUT }, async (t) => {
  const vector = testVectors[1]!
  const adapter = createGroth16ForEngine()
  const bigintInputs = standardToTransactionBigintInputs(vector.inputs)

  const result = await adapter.fullProve(bigintInputs, vector.artifacts.wasm, vector.artifacts.zkey)
  t.ok(result.proof, 'should return proof')

  const isValid = await adapter.verify(vector.artifacts.vkey, result.publicSignals, result.proof)
  t.ok(isValid, 'proof should verify')
})

test('createGroth16ForEngine — e2e POI proof 3x3', { timeout: PROOF_TIMEOUT }, async (t) => {
  const artifacts = loadPOIArtifacts('3x3')
  const adapter = createGroth16ForEngine()
  const vectorFile = path.join(POI_VECTORS_DIR, 'inputs0.json')
  const bigintInputs = loadPOIBigintInputs(vectorFile)

  const result = await adapter.fullProve(bigintInputs, artifacts.wasm, artifacts.zkey)
  t.ok(result.proof, 'should return proof')
  t.ok(result.publicSignals, 'should return publicSignals')

  const isValid = await adapter.verify(artifacts.vkey, result.publicSignals, result.proof)
  t.ok(isValid, 'proof should verify')
})

test('createGroth16FromTransactionProver — e2e proof 1x2', { timeout: PROOF_TIMEOUT }, async (t) => {
  const vector = testVectors[0]!
  const prover = new SnarkjsTransactionProver(vector.artifacts)
  const adapter = createGroth16FromTransactionProver(prover)
  const bigintInputs = standardToTransactionBigintInputs(vector.inputs)

  const result = await adapter.fullProve(bigintInputs, vector.artifacts.wasm, vector.artifacts.zkey)
  t.ok(result.proof, 'should return proof')

  const isValid = await adapter.verify(vector.artifacts.vkey, result.publicSignals, result.proof)
  t.ok(isValid, 'proof should verify')
})

test('createGroth16FromPOIProver — e2e proof 3x3', { timeout: PROOF_TIMEOUT }, async (t) => {
  const artifacts = loadPOIArtifacts('3x3')
  const poiProver = new SnarkjsPoiProver(artifacts)
  const adapter = createGroth16FromPOIProver(poiProver)
  const vectorFile = path.join(POI_VECTORS_DIR, 'inputs0.json')
  const bigintInputs = loadPOIBigintInputs(vectorFile)

  const result = await adapter.fullProve(bigintInputs, artifacts.wasm, artifacts.zkey)
  t.ok(result.proof, 'should return proof')

  const isValid = await adapter.verify(artifacts.vkey, result.publicSignals, result.proof)
  t.ok(isValid, 'proof should verify')
})

hook('Cleanup snarkJS', async function () {
  try {
    const curve = await curves.getCurveFromName('bn128')
    await curve.terminate()
  } catch {
    // Curve might already be terminated
  }
})
