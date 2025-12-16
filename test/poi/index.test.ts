/* eslint-disable jsdoc/require-jsdoc */

import fs from 'fs'
import path from 'path'
// import zlib from 'zlib'

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
  const files = fs.readdirSync(TEST_VECTORS_DIR).filter(f => f.endsWith('.json')).sort()

  return files.map(fileName => {
    const raw = JSON.parse(fs.readFileSync(path.join(TEST_VECTORS_DIR, fileName), 'utf8'))
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

hook('Cleanup snarkJS', async function () {
  for (const artifacts of Object.values(artifactsBySize)) {
    const prover = new SnarkjsPoiProver(artifacts)
    await prover.cleanupSnarkJS()
  }
})
