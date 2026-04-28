import { bigIntToBytes, bytesToBigInt } from '@railgun-reloaded/bytes'
import { test } from 'brittle'
import type { SnarkjsProof } from 'snarkjs'

import {
  extractPublicInputsFromCircuitInputs,
  snarkJSToStandardInput,
  snarkJSToStandardProof,
  standardToSnarkJSInput,
  standardToSnarkJSProof,
  standardToSnarkJSPublicInputs
} from '../src/poi/formatter'
import type { POICircuitInputs, POIPublicInputs } from '../src/poi/types'
import type { Proof } from '../src/transaction/types'

/**
 * Builds a 32-byte big-endian `Uint8Array` from a small numeric value, used
 * to compactly construct deterministic field-element fixtures.
 * @param value - Non-negative integer encoded as a 32-byte field element.
 * @returns A 32-byte `Uint8Array` representing `value`.
 */
const createMockUint8Array = (value: number): Uint8Array => {
  return bigIntToBytes(BigInt(value), 32)
}

/**
 * Builds a fully populated `POICircuitInputs` object with deterministic
 * mock field elements for use across the formatter tests.
 * @returns A `POICircuitInputs` shaped like a real circuit input batch.
 */
const createMockCircuitInputs = (): POICircuitInputs => {
  return {
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(123),
    poiMerkleroots: [
      createMockUint8Array(100),
      createMockUint8Array(200),
      createMockUint8Array(300)
    ],
    boundParamsHash: createMockUint8Array(456),
    nullifiers: [
      createMockUint8Array(111),
      createMockUint8Array(222)
    ],
    commitmentsOut: [
      createMockUint8Array(333),
      createMockUint8Array(444)
    ],
    spendingPublicKey: [
      createMockUint8Array(555),
      createMockUint8Array(666)
    ],
    nullifyingKey: createMockUint8Array(777),
    token: createMockUint8Array(888),
    randomsIn: [
      createMockUint8Array(11),
      createMockUint8Array(22)
    ],
    valuesIn: [BigInt(1000), BigInt(2000)],
    utxoPositionsIn: [1, 2],
    utxoTreeIn: 0,
    npksOut: [
      createMockUint8Array(33),
      createMockUint8Array(44)
    ],
    valuesOut: [BigInt(500), BigInt(1500)],
    utxoBatchGlobalStartPositionOut: createMockUint8Array(999),
    railgunTxidIfHasUnshield: createMockUint8Array(1111),
    railgunTxidMerkleProofIndices: 5,
    railgunTxidMerkleProofPathElements: [
      createMockUint8Array(55),
      createMockUint8Array(66)
    ],
    poiInMerkleProofIndices: [0, 1, 2],
    poiInMerkleProofPathElements: [
      [createMockUint8Array(77), createMockUint8Array(88)],
      [createMockUint8Array(99), createMockUint8Array(110)]
    ]
  }
}

/**
 * Builds a deterministic `SnarkjsProof` whose pi_a/pi_b/pi_c entries are
 * recognizable decimal strings — chosen so reversal-order assertions can
 * spot-check that pi_b is being remapped correctly.
 * @returns A `SnarkjsProof` shaped like a real groth16 prover output.
 */
const createMockSnarkjsProof = (): SnarkjsProof => {
  return {
    protocol: 'groth16',
    pi_a: ['123', '456'],
    pi_b: [
      ['789', '101112'],
      ['131415', '161718']
    ],
    pi_c: ['192021', '222324']
  }
}

/**
 * Builds a `Proof` whose field elements mirror `createMockSnarkjsProof`
 * after the snarkJS → standard reversal, so the two factories pair up
 * for round-trip assertions.
 * @returns A `Proof` with deterministic 32-byte field elements.
 */
const createMockStandardProof = (): Proof => {
  return {
    a: {
      x: createMockUint8Array(123),
      y: createMockUint8Array(456)
    },
    b: {
      x: [createMockUint8Array(789), createMockUint8Array(101112)],
      y: [createMockUint8Array(131415), createMockUint8Array(161718)]
    },
    c: {
      x: createMockUint8Array(192021),
      y: createMockUint8Array(222324)
    }
  }
}

test('standardToSnarkJSInput: converts all Uint8Array fields to hex strings', (assert) => {
  const input = createMockCircuitInputs()
  const result = standardToSnarkJSInput(input)

  assert.is(typeof result.anyRailgunTxidMerklerootAfterTransaction, 'string')
  assert.ok(result.anyRailgunTxidMerklerootAfterTransaction.startsWith('0x'))
  assert.is(typeof result.boundParamsHash, 'string')
  assert.is(typeof result.nullifyingKey, 'string')
  assert.is(typeof result.token, 'string')
})

test('standardToSnarkJSInput: converts arrays of Uint8Array to arrays of hex strings', (assert) => {
  const input = createMockCircuitInputs()
  const result = standardToSnarkJSInput(input)

  assert.is(result.poiMerkleroots.length, 3)
  assert.ok(result.poiMerkleroots.every(m => typeof m === 'string' && m.startsWith('0x')))

  assert.is(result.nullifiers.length, 2)
  assert.ok(result.nullifiers.every(n => typeof n === 'string' && n.startsWith('0x')))

  assert.is(result.commitmentsOut.length, 2)
  assert.ok(result.commitmentsOut.every(c => typeof c === 'string' && c.startsWith('0x')))
})

test('standardToSnarkJSInput: converts BigInt values to strings', (assert) => {
  const input = createMockCircuitInputs()
  const result = standardToSnarkJSInput(input)

  assert.is(result.valuesIn.length, 2)
  assert.is(result.valuesIn[0], '1000')
  assert.is(result.valuesIn[1], '2000')

  assert.is(result.valuesOut.length, 2)
  assert.is(result.valuesOut[0], '500')
  assert.is(result.valuesOut[1], '1500')
})

test('standardToSnarkJSInput: preserves number fields', (assert) => {
  const input = createMockCircuitInputs()
  const result = standardToSnarkJSInput(input)

  assert.is(result.utxoPositionsIn[0], 1)
  assert.is(result.utxoPositionsIn[1], 2)
  assert.is(result.utxoTreeIn, 0)
  assert.is(result.railgunTxidMerkleProofIndices, 5)
})

test('standardToSnarkJSInput: converts nested arrays correctly', (assert) => {
  const input = createMockCircuitInputs()
  const result = standardToSnarkJSInput(input)

  assert.is(result.poiInMerkleProofPathElements.length, 2)
  assert.ok(result.poiInMerkleProofPathElements[0], 'first element should exist')
  assert.is(result.poiInMerkleProofPathElements[0]!.length, 2)
  assert.ok(result.poiInMerkleProofPathElements[0]!.every(e => typeof e === 'string' && e.startsWith('0x')))
})

test('standardToSnarkJSInput: converts poiInMerkleProofIndices to strings', (assert) => {
  const input = createMockCircuitInputs()
  const result = standardToSnarkJSInput(input)

  assert.is(result.poiInMerkleProofIndices.length, 3)
  assert.is(result.poiInMerkleProofIndices[0], '0')
  assert.is(result.poiInMerkleProofIndices[1], '1')
  assert.is(result.poiInMerkleProofIndices[2], '2')
})

test('standardToSnarkJSInput: handles empty arrays', (assert) => {
  const input = createMockCircuitInputs()
  input.nullifiers = []
  input.commitmentsOut = []

  const result = standardToSnarkJSInput(input)

  assert.is(result.nullifiers.length, 0)
  assert.is(result.commitmentsOut.length, 0)
})

test('standardToSnarkJSInput: round-trip hex conversion preserves values', (assert) => {
  const input = createMockCircuitInputs()
  const result = standardToSnarkJSInput(input)

  // Convert back and verify
  const backToNumber = BigInt(result.anyRailgunTxidMerklerootAfterTransaction).toString()
  assert.is(backToNumber, '123')
})

test('snarkJSToStandardInput: converts hex strings to Uint8Array', (assert) => {
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x000000000000000000000000000000000000000000000000000000000000007b',
    poiMerkleroots: ['0x0000000000000000000000000000000000000000000000000000000000000064'],
    boundParamsHash: '0x00000000000000000000000000000000000000000000000000000000000001c8',
    nullifiers: ['0x000000000000000000000000000000000000000000000000000000000000006f'],
    commitmentsOut: ['0x000000000000000000000000000000000000000000000000000000000000014d'],
    spendingPublicKey: ['0x000000000000000000000000000000000000000000000000000000000000022b'],
    nullifyingKey: '0x0000000000000000000000000000000000000000000000000000000000000309',
    token: '0x0000000000000000000000000000000000000000000000000000000000000378',
    randomsIn: ['0x000000000000000000000000000000000000000000000000000000000000000b'],
    valuesIn: ['1000'],
    utxoPositionsIn: [1],
    utxoTreeIn: 0,
    npksOut: ['0x0000000000000000000000000000000000000000000000000000000000000021'],
    valuesOut: ['500'],
    utxoBatchGlobalStartPositionOut: '0x00000000000000000000000000000000000000000000000000000000000003e7',
    railgunTxidIfHasUnshield: '0x0000000000000000000000000000000000000000000000000000000000000457',
    railgunTxidMerkleProofIndices: 5,
    railgunTxidMerkleProofPathElements: ['0x0000000000000000000000000000000000000000000000000000000000000037'],
    poiInMerkleProofIndices: ['0'],
    poiInMerkleProofPathElements: [['0x000000000000000000000000000000000000000000000000000000000000004d']]
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.ok(result.anyRailgunTxidMerklerootAfterTransaction instanceof Uint8Array)
  assert.is(result.anyRailgunTxidMerklerootAfterTransaction.length, 32)
  assert.ok(result.boundParamsHash instanceof Uint8Array)
  assert.ok(result.token instanceof Uint8Array)
  assert.ok(result.nullifyingKey instanceof Uint8Array)
})

test('snarkJSToStandardInput: converts arrays of hex strings to arrays of Uint8Array', (assert) => {
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x000000000000000000000000000000000000000000000000000000000000007b',
    poiMerkleroots: [
      '0x0000000000000000000000000000000000000000000000000000000000000064',
      '0x00000000000000000000000000000000000000000000000000000000000000c8'
    ],
    boundParamsHash: '0x00000000000000000000000000000000000000000000000000000000000001c8',
    nullifiers: [
      '0x000000000000000000000000000000000000000000000000000000000000006f',
      '0x00000000000000000000000000000000000000000000000000000000000000de'
    ],
    commitmentsOut: [
      '0x000000000000000000000000000000000000000000000000000000000000014d',
      '0x00000000000000000000000000000000000000000000000000000000000001bc'
    ],
    spendingPublicKey: [
      '0x000000000000000000000000000000000000000000000000000000000000022b',
      '0x000000000000000000000000000000000000000000000000000000000000029a'
    ],
    nullifyingKey: '0x0000000000000000000000000000000000000000000000000000000000000309',
    token: '0x0000000000000000000000000000000000000000000000000000000000000378',
    randomsIn: [
      '0x000000000000000000000000000000000000000000000000000000000000000b',
      '0x0000000000000000000000000000000000000000000000000000000000000016'
    ],
    valuesIn: ['1000', '2000'],
    utxoPositionsIn: [1, 2],
    utxoTreeIn: 0,
    npksOut: [
      '0x0000000000000000000000000000000000000000000000000000000000000021',
      '0x000000000000000000000000000000000000000000000000000000000000002c'
    ],
    valuesOut: ['500', '1500'],
    utxoBatchGlobalStartPositionOut: '0x00000000000000000000000000000000000000000000000000000000000003e7',
    railgunTxidIfHasUnshield: '0x0000000000000000000000000000000000000000000000000000000000000457',
    railgunTxidMerkleProofIndices: 5,
    railgunTxidMerkleProofPathElements: [
      '0x0000000000000000000000000000000000000000000000000000000000000037',
      '0x0000000000000000000000000000000000000000000000000000000000000042'
    ],
    poiInMerkleProofIndices: ['0', '1'],
    poiInMerkleProofPathElements: [
      ['0x000000000000000000000000000000000000000000000000000000000000004d'],
      ['0x000000000000000000000000000000000000000000000000000000000000006e']
    ]
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.poiMerkleroots.length, 2)
  assert.ok(result.poiMerkleroots.every(m => m instanceof Uint8Array && m.length === 32))

  assert.is(result.nullifiers.length, 2)
  assert.ok(result.nullifiers.every(n => n instanceof Uint8Array && n.length === 32))

  assert.is(result.commitmentsOut.length, 2)
  assert.ok(result.commitmentsOut.every(c => c instanceof Uint8Array && c.length === 32))

  assert.is(result.spendingPublicKey.length, 2)
  assert.ok(result.spendingPublicKey.every(pk => pk instanceof Uint8Array && pk.length === 32))
})

test('snarkJSToStandardInput: converts string values to BigInt', (assert) => {
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x000000000000000000000000000000000000000000000000000000000000007b',
    poiMerkleroots: ['0x0000000000000000000000000000000000000000000000000000000000000064'],
    boundParamsHash: '0x00000000000000000000000000000000000000000000000000000000000001c8',
    nullifiers: ['0x000000000000000000000000000000000000000000000000000000000000006f'],
    commitmentsOut: ['0x000000000000000000000000000000000000000000000000000000000000014d'],
    spendingPublicKey: ['0x000000000000000000000000000000000000000000000000000000000000022b'],
    nullifyingKey: '0x0000000000000000000000000000000000000000000000000000000000000309',
    token: '0x0000000000000000000000000000000000000000000000000000000000000378',
    randomsIn: ['0x000000000000000000000000000000000000000000000000000000000000000b'],
    valuesIn: ['1000', '2000'],
    utxoPositionsIn: [1],
    utxoTreeIn: 0,
    npksOut: ['0x0000000000000000000000000000000000000000000000000000000000000021'],
    valuesOut: ['500', '1500'],
    utxoBatchGlobalStartPositionOut: '0x00000000000000000000000000000000000000000000000000000000000003e7',
    railgunTxidIfHasUnshield: '0x0000000000000000000000000000000000000000000000000000000000000457',
    railgunTxidMerkleProofIndices: 5,
    railgunTxidMerkleProofPathElements: ['0x0000000000000000000000000000000000000000000000000000000000000037'],
    poiInMerkleProofIndices: ['0'],
    poiInMerkleProofPathElements: [['0x000000000000000000000000000000000000000000000000000000000000004d']]
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.valuesIn.length, 2)
  assert.is(typeof result.valuesIn[0], 'bigint')
  assert.is(result.valuesIn[0]!.toString(), '1000')
  assert.is(result.valuesIn[1]!.toString(), '2000')

  assert.is(result.valuesOut.length, 2)
  assert.is(typeof result.valuesOut[0], 'bigint')
  assert.is(result.valuesOut[0]!.toString(), '500')
  assert.is(result.valuesOut[1]!.toString(), '1500')
})

test('snarkJSToStandardInput: preserves number fields', (assert) => {
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x000000000000000000000000000000000000000000000000000000000000007b',
    poiMerkleroots: ['0x0000000000000000000000000000000000000000000000000000000000000064'],
    boundParamsHash: '0x00000000000000000000000000000000000000000000000000000000000001c8',
    nullifiers: ['0x000000000000000000000000000000000000000000000000000000000000006f'],
    commitmentsOut: ['0x000000000000000000000000000000000000000000000000000000000000014d'],
    spendingPublicKey: ['0x000000000000000000000000000000000000000000000000000000000000022b'],
    nullifyingKey: '0x0000000000000000000000000000000000000000000000000000000000000309',
    token: '0x0000000000000000000000000000000000000000000000000000000000000378',
    randomsIn: ['0x000000000000000000000000000000000000000000000000000000000000000b'],
    valuesIn: ['1000'],
    utxoPositionsIn: [1, 2, 3],
    utxoTreeIn: 5,
    npksOut: ['0x0000000000000000000000000000000000000000000000000000000000000021'],
    valuesOut: ['500'],
    utxoBatchGlobalStartPositionOut: '0x00000000000000000000000000000000000000000000000000000000000003e7',
    railgunTxidIfHasUnshield: '0x0000000000000000000000000000000000000000000000000000000000000457',
    railgunTxidMerkleProofIndices: 10,
    railgunTxidMerkleProofPathElements: ['0x0000000000000000000000000000000000000000000000000000000000000037'],
    poiInMerkleProofIndices: ['0', '1', '2'],
    poiInMerkleProofPathElements: [['0x000000000000000000000000000000000000000000000000000000000000004d']]
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(typeof result.utxoPositionsIn[0], 'number')
  assert.is(result.utxoPositionsIn[0], 1)
  assert.is(result.utxoPositionsIn[1], 2)
  assert.is(result.utxoPositionsIn[2], 3)
  assert.is(typeof result.utxoTreeIn, 'number')
  assert.is(result.utxoTreeIn, 5)
  assert.is(typeof result.railgunTxidMerkleProofIndices, 'number')
  assert.is(result.railgunTxidMerkleProofIndices, 10)
})

test('snarkJSToStandardInput: converts poiInMerkleProofIndices from strings to numbers', (assert) => {
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x000000000000000000000000000000000000000000000000000000000000007b',
    poiMerkleroots: ['0x0000000000000000000000000000000000000000000000000000000000000064'],
    boundParamsHash: '0x00000000000000000000000000000000000000000000000000000000000001c8',
    nullifiers: ['0x000000000000000000000000000000000000000000000000000000000000006f'],
    commitmentsOut: ['0x000000000000000000000000000000000000000000000000000000000000014d'],
    spendingPublicKey: ['0x000000000000000000000000000000000000000000000000000000000000022b'],
    nullifyingKey: '0x0000000000000000000000000000000000000000000000000000000000000309',
    token: '0x0000000000000000000000000000000000000000000000000000000000000378',
    randomsIn: ['0x000000000000000000000000000000000000000000000000000000000000000b'],
    valuesIn: ['1000'],
    utxoPositionsIn: [1],
    utxoTreeIn: 0,
    npksOut: ['0x0000000000000000000000000000000000000000000000000000000000000021'],
    valuesOut: ['500'],
    utxoBatchGlobalStartPositionOut: '0x00000000000000000000000000000000000000000000000000000000000003e7',
    railgunTxidIfHasUnshield: '0x0000000000000000000000000000000000000000000000000000000000000457',
    railgunTxidMerkleProofIndices: 5,
    railgunTxidMerkleProofPathElements: ['0x0000000000000000000000000000000000000000000000000000000000000037'],
    poiInMerkleProofIndices: ['0', '1', '2'],
    poiInMerkleProofPathElements: [['0x000000000000000000000000000000000000000000000000000000000000004d']]
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.poiInMerkleProofIndices.length, 3)
  assert.is(typeof result.poiInMerkleProofIndices[0], 'number')
  assert.is(result.poiInMerkleProofIndices[0], 0)
  assert.is(result.poiInMerkleProofIndices[1], 1)
  assert.is(result.poiInMerkleProofIndices[2], 2)
})

test('snarkJSToStandardInput: converts nested arrays correctly', (assert) => {
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x000000000000000000000000000000000000000000000000000000000000007b',
    poiMerkleroots: ['0x0000000000000000000000000000000000000000000000000000000000000064'],
    boundParamsHash: '0x00000000000000000000000000000000000000000000000000000000000001c8',
    nullifiers: ['0x000000000000000000000000000000000000000000000000000000000000006f'],
    commitmentsOut: ['0x000000000000000000000000000000000000000000000000000000000000014d'],
    spendingPublicKey: ['0x000000000000000000000000000000000000000000000000000000000000022b'],
    nullifyingKey: '0x0000000000000000000000000000000000000000000000000000000000000309',
    token: '0x0000000000000000000000000000000000000000000000000000000000000378',
    randomsIn: ['0x000000000000000000000000000000000000000000000000000000000000000b'],
    valuesIn: ['1000'],
    utxoPositionsIn: [1],
    utxoTreeIn: 0,
    npksOut: ['0x0000000000000000000000000000000000000000000000000000000000000021'],
    valuesOut: ['500'],
    utxoBatchGlobalStartPositionOut: '0x00000000000000000000000000000000000000000000000000000000000003e7',
    railgunTxidIfHasUnshield: '0x0000000000000000000000000000000000000000000000000000000000000457',
    railgunTxidMerkleProofIndices: 5,
    railgunTxidMerkleProofPathElements: [
      '0x0000000000000000000000000000000000000000000000000000000000000037',
      '0x0000000000000000000000000000000000000000000000000000000000000042'
    ],
    poiInMerkleProofIndices: ['0'],
    poiInMerkleProofPathElements: [
      ['0x000000000000000000000000000000000000000000000000000000000000004d', '0x0000000000000000000000000000000000000000000000000000000000000058'],
      ['0x0000000000000000000000000000000000000000000000000000000000000063', '0x000000000000000000000000000000000000000000000000000000000000006e']
    ]
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.poiInMerkleProofPathElements.length, 2)
  assert.ok(result.poiInMerkleProofPathElements[0])
  assert.is(result.poiInMerkleProofPathElements[0]!.length, 2)
  assert.ok(result.poiInMerkleProofPathElements[0]!.every(e => e instanceof Uint8Array && e.length === 32))
  assert.ok(result.poiInMerkleProofPathElements[1])
  assert.is(result.poiInMerkleProofPathElements[1]!.length, 2)
  assert.ok(result.poiInMerkleProofPathElements[1]!.every(e => e instanceof Uint8Array && e.length === 32))
})

test('snarkJSToStandardInput: handles empty arrays', (assert) => {
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x000000000000000000000000000000000000000000000000000000000000007b',
    poiMerkleroots: [],
    boundParamsHash: '0x00000000000000000000000000000000000000000000000000000000000001c8',
    nullifiers: [],
    commitmentsOut: [],
    spendingPublicKey: ['0x000000000000000000000000000000000000000000000000000000000000022b'],
    nullifyingKey: '0x0000000000000000000000000000000000000000000000000000000000000309',
    token: '0x0000000000000000000000000000000000000000000000000000000000000378',
    randomsIn: [],
    valuesIn: [],
    utxoPositionsIn: [],
    utxoTreeIn: 0,
    npksOut: [],
    valuesOut: [],
    utxoBatchGlobalStartPositionOut: '0x00000000000000000000000000000000000000000000000000000000000003e7',
    railgunTxidIfHasUnshield: '0x0000000000000000000000000000000000000000000000000000000000000457',
    railgunTxidMerkleProofIndices: 5,
    railgunTxidMerkleProofPathElements: [],
    poiInMerkleProofIndices: [],
    poiInMerkleProofPathElements: []
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.nullifiers.length, 0)
  assert.is(result.commitmentsOut.length, 0)
  assert.is(result.valuesIn.length, 0)
  assert.is(result.valuesOut.length, 0)
  assert.is(result.poiInMerkleProofPathElements.length, 0)
})

test('snarkJSToStandardInput: round-trip conversion preserves values', (assert) => {
  const original = createMockCircuitInputs()
  const snarkjsFormat = standardToSnarkJSInput(original)
  const backToStandard = snarkJSToStandardInput(snarkjsFormat)

  assert.is(bytesToBigInt(backToStandard.anyRailgunTxidMerklerootAfterTransaction).toString(), '123')
  assert.is(bytesToBigInt(backToStandard.boundParamsHash).toString(), '456')
  assert.is(backToStandard.valuesIn[0]!.toString(), '1000')
  assert.is(backToStandard.valuesIn[1]!.toString(), '2000')
  assert.is(backToStandard.utxoTreeIn, 0)
  assert.is(backToStandard.railgunTxidMerkleProofIndices, 5)
})

test('snarkJSToStandardInput: handles large BigInt values', (assert) => {
  const largeValue = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x000000000000000000000000000000000000000000000000000000000000007b',
    poiMerkleroots: ['0x0000000000000000000000000000000000000000000000000000000000000064'],
    boundParamsHash: '0x00000000000000000000000000000000000000000000000000000000000001c8',
    nullifiers: ['0x000000000000000000000000000000000000000000000000000000000000006f'],
    commitmentsOut: ['0x000000000000000000000000000000000000000000000000000000000000014d'],
    spendingPublicKey: ['0x000000000000000000000000000000000000000000000000000000000000022b'],
    nullifyingKey: '0x0000000000000000000000000000000000000000000000000000000000000309',
    token: '0x0000000000000000000000000000000000000000000000000000000000000378',
    randomsIn: ['0x000000000000000000000000000000000000000000000000000000000000000b'],
    valuesIn: [largeValue],
    utxoPositionsIn: [1],
    utxoTreeIn: 0,
    npksOut: ['0x0000000000000000000000000000000000000000000000000000000000000021'],
    valuesOut: [largeValue],
    utxoBatchGlobalStartPositionOut: '0x00000000000000000000000000000000000000000000000000000000000003e7',
    railgunTxidIfHasUnshield: '0x0000000000000000000000000000000000000000000000000000000000000457',
    railgunTxidMerkleProofIndices: 5,
    railgunTxidMerkleProofPathElements: ['0x0000000000000000000000000000000000000000000000000000000000000037'],
    poiInMerkleProofIndices: ['0'],
    poiInMerkleProofPathElements: [['0x000000000000000000000000000000000000000000000000000000000000004d']]
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(result.valuesIn[0]!.toString(), largeValue)
  assert.is(result.valuesOut[0]!.toString(), largeValue)
})

test('snarkJSToStandardInput: handles zero values', (assert) => {
  const snarkjsInput = {
    anyRailgunTxidMerklerootAfterTransaction: '0x' + '00'.repeat(32),
    poiMerkleroots: ['0x' + '00'.repeat(32)],
    boundParamsHash: '0x' + '00'.repeat(32),
    nullifiers: ['0x' + '00'.repeat(32)],
    commitmentsOut: ['0x' + '00'.repeat(32)],
    spendingPublicKey: ['0x' + '00'.repeat(32)],
    nullifyingKey: '0x' + '00'.repeat(32),
    token: '0x' + '00'.repeat(32),
    randomsIn: ['0x' + '00'.repeat(32)],
    valuesIn: ['0'],
    utxoPositionsIn: [0],
    utxoTreeIn: 0,
    npksOut: ['0x' + '00'.repeat(32)],
    valuesOut: ['0'],
    utxoBatchGlobalStartPositionOut: '0x' + '00'.repeat(32),
    railgunTxidIfHasUnshield: '0x' + '00'.repeat(32),
    railgunTxidMerkleProofIndices: 0,
    railgunTxidMerkleProofPathElements: ['0x' + '00'.repeat(32)],
    poiInMerkleProofIndices: ['0'],
    poiInMerkleProofPathElements: [['0x' + '00'.repeat(32)]]
  }

  const result = snarkJSToStandardInput(snarkjsInput)

  assert.is(bytesToBigInt(result.token).toString(), '0')
  assert.is(result.valuesIn[0]!.toString(), '0')
  assert.is(result.valuesOut[0]!.toString(), '0')
  assert.is(result.utxoTreeIn, 0)
  assert.is(result.railgunTxidMerkleProofIndices, 0)
})

// snarkJSToStandardProof Tests

test('snarkJSToStandardProof: converts pi_a correctly', (assert) => {
  const snarkjsProof = createMockSnarkjsProof()
  const result = snarkJSToStandardProof(snarkjsProof)

  assert.ok(result.a.x instanceof Uint8Array)
  assert.ok(result.a.y instanceof Uint8Array)
  assert.is(result.a.x.length, 32)
  assert.is(result.a.y.length, 32)

  const xValue = bytesToBigInt(result.a.x).toString()
  const yValue = bytesToBigInt(result.a.y).toString()
  assert.is(xValue, '123')
  assert.is(yValue, '456')
})

test('snarkJSToStandardProof: converts pi_b with reversed order', (assert) => {
  const snarkjsProof = createMockSnarkjsProof()
  const result = snarkJSToStandardProof(snarkjsProof)

  assert.ok(Array.isArray(result.b.x))
  assert.ok(Array.isArray(result.b.y))
  assert.is(result.b.x.length, 2)
  assert.is(result.b.y.length, 2)

  // Verify reversal: pi_b[0][1] -> b.x[0], pi_b[0][0] -> b.x[1]
  const x0Value = bytesToBigInt(result.b.x[0]).toString()
  const x1Value = bytesToBigInt(result.b.x[1]).toString()
  assert.is(x0Value, '101112') // pi_b[0][1]
  assert.is(x1Value, '789')    // pi_b[0][0]

  const y0Value = bytesToBigInt(result.b.y[0]).toString()
  const y1Value = bytesToBigInt(result.b.y[1]).toString()
  assert.is(y0Value, '161718') // pi_b[1][1]
  assert.is(y1Value, '131415') // pi_b[1][0]
})

test('snarkJSToStandardProof: converts pi_c correctly', (assert) => {
  const snarkjsProof = createMockSnarkjsProof()
  const result = snarkJSToStandardProof(snarkjsProof)

  assert.ok(result.c.x instanceof Uint8Array)
  assert.ok(result.c.y instanceof Uint8Array)
  assert.is(result.c.x.length, 32)
  assert.is(result.c.y.length, 32)

  const xValue = bytesToBigInt(result.c.x).toString()
  const yValue = bytesToBigInt(result.c.y).toString()
  assert.is(xValue, '192021')
  assert.is(yValue, '222324')
})

test('snarkJSToStandardProof: handles large numbers', (assert) => {
  const largeNumber = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  const snarkjsProof: SnarkjsProof = {
    protocol: 'groth16',
    pi_a: [largeNumber, largeNumber],
    pi_b: [[largeNumber, largeNumber], [largeNumber, largeNumber]],
    pi_c: [largeNumber, largeNumber]
  }

  const result = snarkJSToStandardProof(snarkjsProof)

  const aXValue = bytesToBigInt(result.a.x).toString()
  assert.is(aXValue, largeNumber)
})

test('snarkJSToStandardProof: handles zero values', (assert) => {
  const snarkjsProof: SnarkjsProof = {
    protocol: 'groth16',
    pi_a: ['0', '0'],
    pi_b: [['0', '0'], ['0', '0']],
    pi_c: ['0', '0']
  }

  const result = snarkJSToStandardProof(snarkjsProof)

  assert.is(bytesToBigInt(result.a.x).toString(), '0')
  assert.is(bytesToBigInt(result.a.y).toString(), '0')
  assert.is(bytesToBigInt(result.b.x[0]).toString(), '0')
  assert.is(bytesToBigInt(result.c.x).toString(), '0')
})

test('extractPublicInputsFromCircuitInputs: includes proof', (assert) => {
  const circuitInputs = createMockCircuitInputs()
  const proof = createMockStandardProof()
  const blindedCommitments = [createMockUint8Array(1), createMockUint8Array(2)]

  const result = extractPublicInputsFromCircuitInputs(circuitInputs, proof, blindedCommitments)

  assert.ok(result.proof)
  assert.is(result.proof, proof)
})

test('extractPublicInputsFromCircuitInputs: includes blindedCommitmentsOut', (assert) => {
  const circuitInputs = createMockCircuitInputs()
  const proof = createMockStandardProof()
  const blindedCommitments = [createMockUint8Array(1), createMockUint8Array(2), createMockUint8Array(3)]

  const result = extractPublicInputsFromCircuitInputs(circuitInputs, proof, blindedCommitments)

  assert.is(result.blindedCommitmentsOut.length, 3)
  assert.is(result.blindedCommitmentsOut, blindedCommitments)
})

test('extractPublicInputsFromCircuitInputs: includes poiMerkleroots', (assert) => {
  const circuitInputs = createMockCircuitInputs()
  const proof = createMockStandardProof()
  const blindedCommitments = [createMockUint8Array(1)]

  const result = extractPublicInputsFromCircuitInputs(circuitInputs, proof, blindedCommitments)

  assert.is(result.poiMerkleroots.length, 3)
  assert.is(result.poiMerkleroots, circuitInputs.poiMerkleroots)
})

test('extractPublicInputsFromCircuitInputs: includes anyRailgunTxidMerklerootAfterTransaction', (assert) => {
  const circuitInputs = createMockCircuitInputs()
  const proof = createMockStandardProof()
  const blindedCommitments = [createMockUint8Array(1)]

  const result = extractPublicInputsFromCircuitInputs(circuitInputs, proof, blindedCommitments)

  assert.is(result.anyRailgunTxidMerklerootAfterTransaction, circuitInputs.anyRailgunTxidMerklerootAfterTransaction)
})

test('extractPublicInputsFromCircuitInputs: includes railgunTxidIfHasUnshield', (assert) => {
  const circuitInputs = createMockCircuitInputs()
  const proof = createMockStandardProof()
  const blindedCommitments = [createMockUint8Array(1)]

  const result = extractPublicInputsFromCircuitInputs(circuitInputs, proof, blindedCommitments)

  assert.is(result.railgunTxidIfHasUnshield, circuitInputs.railgunTxidIfHasUnshield)
})

test('extractPublicInputsFromCircuitInputs: handles empty blindedCommitmentsOut', (assert) => {
  const circuitInputs = createMockCircuitInputs()
  const proof = createMockStandardProof()
  const blindedCommitments: Uint8Array[] = []

  const result = extractPublicInputsFromCircuitInputs(circuitInputs, proof, blindedCommitments)

  assert.is(result.blindedCommitmentsOut.length, 0)
})

test('extractPublicInputsFromCircuitInputs: returns all required fields', (assert) => {
  const circuitInputs = createMockCircuitInputs()
  const proof = createMockStandardProof()
  const blindedCommitments = [createMockUint8Array(1)]

  const result = extractPublicInputsFromCircuitInputs(circuitInputs, proof, blindedCommitments)

  assert.ok(result.proof)
  assert.ok(result.blindedCommitmentsOut)
  assert.ok(result.poiMerkleroots)
  assert.ok(result.anyRailgunTxidMerklerootAfterTransaction)
  assert.ok(result.railgunTxidIfHasUnshield)
})

test('standardToSnarkJSProof: converts a field correctly', (assert) => {
  const standardProof = createMockStandardProof()
  const result = standardToSnarkJSProof(standardProof)

  assert.is(result.protocol, 'groth16')
  assert.is(result.pi_a.length, 2)
  assert.is(result.pi_a[0], '123')
  assert.is(result.pi_a[1], '456')
})

test('standardToSnarkJSProof: converts b field with reversal', (assert) => {
  const standardProof = createMockStandardProof()
  const result = standardToSnarkJSProof(standardProof)

  assert.is(result.pi_b.length, 2)
  assert.is(result.pi_b[0].length, 2)
  assert.is(result.pi_b[1].length, 2)

  // Verify reversal: b.x[1] -> pi_b[0][0], b.x[0] -> pi_b[0][1]
  assert.is(result.pi_b[0][0], '101112') // b.x[1]
  assert.is(result.pi_b[0][1], '789')    // b.x[0]

  assert.is(result.pi_b[1][0], '161718') // b.y[1]
  assert.is(result.pi_b[1][1], '131415') // b.y[0]
})

test('standardToSnarkJSProof: converts c field correctly', (assert) => {
  const standardProof = createMockStandardProof()
  const result = standardToSnarkJSProof(standardProof)

  assert.is(result.pi_c.length, 2)
  assert.is(result.pi_c[0], '192021')
  assert.is(result.pi_c[1], '222324')
})

test('standardToSnarkJSProof: round-trip conversion preserves proof', (assert) => {
  const originalSnarkjs = createMockSnarkjsProof()
  const standard = snarkJSToStandardProof(originalSnarkjs)
  const backToSnarkjs = standardToSnarkJSProof(standard)

  assert.is(backToSnarkjs.pi_a[0], originalSnarkjs.pi_a[0])
  assert.is(backToSnarkjs.pi_a[1], originalSnarkjs.pi_a[1])
  assert.is(backToSnarkjs.pi_c[0], originalSnarkjs.pi_c[0])
  assert.is(backToSnarkjs.pi_c[1], originalSnarkjs.pi_c[1])
})

test('standardToSnarkJSProof: handles zero values', (assert) => {
  const zeroProof: Proof = {
    a: { x: createMockUint8Array(0), y: createMockUint8Array(0) },
    b: {
      x: [createMockUint8Array(0), createMockUint8Array(0)],
      y: [createMockUint8Array(0), createMockUint8Array(0)]
    },
    c: { x: createMockUint8Array(0), y: createMockUint8Array(0) }
  }

  const result = standardToSnarkJSProof(zeroProof)

  assert.is(result.pi_a[0], '0')
  assert.is(result.pi_a[1], '0')
  assert.is(result.pi_b[0][0], '0')
  assert.is(result.pi_c[0], '0')
})

test('standardToSnarkJSPublicInputs: returns array in correct order', (assert) => {
  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut: [
      createMockUint8Array(1),
      createMockUint8Array(2),
      createMockUint8Array(3)
    ],
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(100),
    railgunTxidIfHasUnshield: createMockUint8Array(200),
    poiMerkleroots: [
      createMockUint8Array(300),
      createMockUint8Array(400)
    ]
  }

  const result = standardToSnarkJSPublicInputs(publicInputs)

  // Total should be: 3 (blindedCommitmentsOut) + 1 + 1 + 2 (poiMerkleroots) = 7
  assert.is(result.length, 7)

  // First 3 should be blindedCommitmentsOut
  assert.is(result[0], '1')
  assert.is(result[1], '2')
  assert.is(result[2], '3')

  // Then anyRailgunTxidMerklerootAfterTransaction
  assert.is(result[3], '100')

  // Then railgunTxidIfHasUnshield
  assert.is(result[4], '200')

  // Finally poiMerkleroots
  assert.is(result[5], '300')
  assert.is(result[6], '400')
})

test('standardToSnarkJSPublicInputs: converts all values to strings', (assert) => {
  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut: [createMockUint8Array(1)],
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(100),
    railgunTxidIfHasUnshield: createMockUint8Array(200),
    poiMerkleroots: [createMockUint8Array(300)]
  }

  const result = standardToSnarkJSPublicInputs(publicInputs)

  assert.ok(result.every((val: any) => typeof val === 'string'))
})

test('standardToSnarkJSPublicInputs: handles empty blindedCommitmentsOut', (assert) => {
  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut: [],
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(100),
    railgunTxidIfHasUnshield: createMockUint8Array(200),
    poiMerkleroots: [createMockUint8Array(300)]
  }

  const result = standardToSnarkJSPublicInputs(publicInputs)

  // Should be 0 + 1 + 1 + 1 = 3
  assert.is(result.length, 3)
  assert.is(result[0], '100')
  assert.is(result[1], '200')
  assert.is(result[2], '300')
})

test('standardToSnarkJSPublicInputs: handles empty poiMerkleroots', (assert) => {
  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut: [createMockUint8Array(1)],
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(100),
    railgunTxidIfHasUnshield: createMockUint8Array(200),
    poiMerkleroots: []
  }

  const result = standardToSnarkJSPublicInputs(publicInputs)

  // Should be 1 + 1 + 1 + 0 = 3
  assert.is(result.length, 3)
  assert.is(result[0], '1')
  assert.is(result[1], '100')
  assert.is(result[2], '200')
})

test('standardToSnarkJSPublicInputs: handles large numbers', (assert) => {
  const largeNum = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  const largeArray = bigIntToBytes(BigInt(largeNum), 32)

  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut: [largeArray],
    anyRailgunTxidMerklerootAfterTransaction: largeArray,
    railgunTxidIfHasUnshield: largeArray,
    poiMerkleroots: [largeArray]
  }

  const result = standardToSnarkJSPublicInputs(publicInputs)

  assert.ok(result.every((val: string) => val === largeNum))
})

test('standardToSnarkJSPublicInputs: handles 13 blindedCommitmentsOut (realistic case)', (assert) => {
  const blindedCommitments = Array.from({ length: 13 }, (_, i) => createMockUint8Array(i))
  const poiMerkleroots = Array.from({ length: 13 }, (_, i) => createMockUint8Array(100 + i))

  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut: blindedCommitments,
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(1000),
    railgunTxidIfHasUnshield: createMockUint8Array(2000),
    poiMerkleroots
  }

  const result = standardToSnarkJSPublicInputs(publicInputs)

  // Should be 13 + 1 + 1 + 13 = 28
  assert.is(result.length, 28)

  // Verify first blindedCommitment
  assert.is(result[0], '0')
  assert.is(result[12], '12')

  // Verify anyRailgunTxidMerklerootAfterTransaction
  assert.is(result[13], '1000')

  // Verify railgunTxidIfHasUnshield
  assert.is(result[14], '2000')

  // Verify first and last poiMerkleroot
  assert.is(result[15], '100')
  assert.is(result[27], '112')
})

test('integration: full conversion pipeline', (assert) => {
  // Create circuit inputs
  const circuitInputs = createMockCircuitInputs()

  // Convert to snarkJS format
  const snarkjsInputs = standardToSnarkJSInput(circuitInputs)

  // Verify conversion
  assert.ok(typeof snarkjsInputs.token === 'string')
  assert.ok(snarkjsInputs.token.startsWith('0x'))

  // Create a mock proof
  const snarkjsProof = createMockSnarkjsProof()
  const standardProof = snarkJSToStandardProof(snarkjsProof)

  // Extract public inputs
  const blindedCommitments = [createMockUint8Array(1), createMockUint8Array(2)]
  const publicInputs = extractPublicInputsFromCircuitInputs(circuitInputs, standardProof, blindedCommitments)

  // Convert to snarkJS format for verification
  const snarkjsPublicInputs = standardToSnarkJSPublicInputs(publicInputs)
  const snarkjsProofForVerify = standardToSnarkJSProof(standardProof)

  // Verify all conversions
  assert.ok(Array.isArray(snarkjsPublicInputs))
  assert.ok(snarkjsPublicInputs.every((val: any) => typeof val === 'string'))
  assert.is(snarkjsProofForVerify.protocol, 'groth16')
})

test('integration: proof round-trip conversion', (assert) => {
  const original = createMockSnarkjsProof()
  const standard = snarkJSToStandardProof(original)
  const backToSnarkjs = standardToSnarkJSProof(standard)

  // Verify pi_a
  assert.is(backToSnarkjs.pi_a[0], original.pi_a[0])
  assert.is(backToSnarkjs.pi_a[1], original.pi_a[1])

  // Verify pi_b (note: reversal in both directions should cancel out)
  assert.is(backToSnarkjs.pi_b[0][0], original.pi_b[0][0])
  assert.is(backToSnarkjs.pi_b[0][1], original.pi_b[0][1])
  assert.is(backToSnarkjs.pi_b[1][0], original.pi_b[1][0])
  assert.is(backToSnarkjs.pi_b[1][1], original.pi_b[1][1])

  // Verify pi_c
  assert.is(backToSnarkjs.pi_c[0], original.pi_c[0])
  assert.is(backToSnarkjs.pi_c[1], original.pi_c[1])
})

test('integration: real-world values from test vector', (assert) => {
  // Using actual values from your test data
  const realWorldInputs = createMockCircuitInputs()

  // Override with real values
  realWorldInputs.anyRailgunTxidMerklerootAfterTransaction = bigIntToBytes(
    BigInt('3992948854570403243612454494108563343803762571679238500930694570641057471215'),
    32
  )
  realWorldInputs.railgunTxidIfHasUnshield = bigIntToBytes(0n, 32)
  realWorldInputs.token = bigIntToBytes(
    BigInt('0x000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d6'),
    32
  )
  realWorldInputs.poiMerkleroots = [
    bigIntToBytes(BigInt('11818424364930592963832088714478202734918394395275665258335823549970972331583'), 32),
    bigIntToBytes(BigInt('2051258411002736885948763699317990061539314419500486054347250703186609807356'), 32),
    bigIntToBytes(BigInt('2051258411002736885948763699317990061539314419500486054347250703186609807356'), 32)
  ]

  // Convert to snarkJS format
  const snarkjsFormat = standardToSnarkJSInput(realWorldInputs)

  // Verify conversions maintain accuracy
  assert.ok(snarkjsFormat.anyRailgunTxidMerklerootAfterTransaction.startsWith('0x'))
  assert.ok(snarkjsFormat.token.startsWith('0x'))

  // Verify we can convert back
  const backToNumber = BigInt(snarkjsFormat.anyRailgunTxidMerklerootAfterTransaction).toString()
  assert.is(backToNumber, '3992948854570403243612454494108563343803762571679238500930694570641057471215')
})
test('integration: public inputs match circuit output format', (assert) => {
  // Simulate what the circuit returns
  const circuitPublicSignals = [
    // 13 blindedCommitmentsOut (outputs come first!)
    '0', '0', '4667550798347221639464549368142656668835078328392644893907186830602244497514',
    '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
    // anyRailgunTxidMerklerootAfterTransaction
    '3992948854570403243612454494108563343803762571679238500930694570641057471215',
    // railgunTxidIfHasUnshield
    '0',
    // poiMerkleroots (13 values)
    '11818424364930592963832088714478202734918394395275665258335823549970972331583',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356'
  ]

  // Create POIPublicInputs from these signals
  const blindedCommitmentsOut = circuitPublicSignals.slice(0, 13).map(s => bigIntToBytes(BigInt(s), 32))
  const anyRailgunTxidMerklerootAfterTransaction = bigIntToBytes(BigInt(circuitPublicSignals[13] ?? '0'), 32)
  const railgunTxidIfHasUnshield = bigIntToBytes(BigInt(circuitPublicSignals[14] ?? '0'), 32)
  const poiMerkleroots = circuitPublicSignals.slice(15, 28).map(s => bigIntToBytes(BigInt(s), 32))

  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut,
    anyRailgunTxidMerklerootAfterTransaction,
    railgunTxidIfHasUnshield,
    poiMerkleroots
  }

  // Convert back to snarkJS format
  const result = standardToSnarkJSPublicInputs(publicInputs)

  // Should match circuit output exactly
  assert.is(result.length, circuitPublicSignals.length)
  circuitPublicSignals.forEach((expected, i) => {
    assert.is(result[i], expected, `public input ${i} should match`)
  })
})

test('edge case: maximum array sizes', (assert) => {
  const maxInputs: POICircuitInputs = {
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(1),
    poiMerkleroots: Array.from({ length: 13 }, (_, i) => createMockUint8Array(i)),
    boundParamsHash: createMockUint8Array(2),
    nullifiers: Array.from({ length: 13 }, (_, i) => createMockUint8Array(10 + i)),
    commitmentsOut: Array.from({ length: 13 }, (_, i) => createMockUint8Array(20 + i)),
    spendingPublicKey: [createMockUint8Array(30), createMockUint8Array(31)],
    nullifyingKey: createMockUint8Array(32),
    token: createMockUint8Array(33),
    randomsIn: Array.from({ length: 13 }, (_, i) => createMockUint8Array(40 + i)),
    valuesIn: Array.from({ length: 13 }, (_, i) => BigInt(1000 + i)),
    utxoPositionsIn: Array.from({ length: 13 }, (_, i) => i),
    utxoTreeIn: 5,
    npksOut: Array.from({ length: 13 }, (_, i) => createMockUint8Array(50 + i)),
    valuesOut: Array.from({ length: 13 }, (_, i) => BigInt(2000 + i)),
    utxoBatchGlobalStartPositionOut: createMockUint8Array(60),
    railgunTxidIfHasUnshield: createMockUint8Array(61),
    railgunTxidMerkleProofIndices: 10,
    railgunTxidMerkleProofPathElements: Array.from({ length: 16 }, (_, i) => createMockUint8Array(70 + i)),
    poiInMerkleProofIndices: Array.from({ length: 13 }, (_, i) => i),
    poiInMerkleProofPathElements: Array.from({ length: 13 }, (_, i) =>
      Array.from({ length: 16 }, (_, j) => createMockUint8Array(80 + i + j))
    )
  }

  const result = standardToSnarkJSInput(maxInputs)

  // Verify all arrays are converted
  assert.is(result.poiMerkleroots.length, 13)
  assert.is(result.nullifiers.length, 13)
  assert.is(result.commitmentsOut.length, 13)
  assert.is(result.valuesIn.length, 13)
  assert.is(result.poiInMerkleProofPathElements.length, 13)
  assert.is(result.poiInMerkleProofPathElements[0]?.length, 16)
})

test('edge case: all zero values', (assert) => {
  const zeroInputs: POICircuitInputs = {
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(0),
    poiMerkleroots: [createMockUint8Array(0), createMockUint8Array(0)],
    boundParamsHash: createMockUint8Array(0),
    nullifiers: [createMockUint8Array(0)],
    commitmentsOut: [createMockUint8Array(0)],
    spendingPublicKey: [createMockUint8Array(0), createMockUint8Array(0)],
    nullifyingKey: createMockUint8Array(0),
    token: createMockUint8Array(0),
    randomsIn: [createMockUint8Array(0)],
    valuesIn: [BigInt(0)],
    utxoPositionsIn: [0],
    utxoTreeIn: 0,
    npksOut: [createMockUint8Array(0)],
    valuesOut: [BigInt(0)],
    utxoBatchGlobalStartPositionOut: createMockUint8Array(0),
    railgunTxidIfHasUnshield: createMockUint8Array(0),
    railgunTxidMerkleProofIndices: 0,
    railgunTxidMerkleProofPathElements: [createMockUint8Array(0)],
    poiInMerkleProofIndices: [0],
    poiInMerkleProofPathElements: [[createMockUint8Array(0)]]
  }

  const result = standardToSnarkJSInput(zeroInputs)

  // All hex strings should be 0x followed by 64 zeros (32 bytes)
  assert.is(result.token, '0x' + '00'.repeat(32))
  assert.is(result.valuesIn[0], '0')
  assert.is(result.utxoTreeIn, 0)
})

test('edge case: mixed zero and non-zero values', (assert) => {
  const mixedInputs = createMockCircuitInputs()
  mixedInputs.valuesIn = [BigInt(0), BigInt(1000), BigInt(0)]
  mixedInputs.valuesOut = [BigInt(500), BigInt(0)]

  const result = standardToSnarkJSInput(mixedInputs)

  assert.is(result.valuesIn[0], '0')
  assert.is(result.valuesIn[1], '1000')
  assert.is(result.valuesIn[2], '0')
  assert.is(result.valuesOut[0], '500')
  assert.is(result.valuesOut[1], '0')
})

test('consistency: proof field ordering', (assert) => {
  // Verify that the proof field order is consistent
  const proof = createMockStandardProof()
  const snarkjsProof = standardToSnarkJSProof(proof)

  // Check that all required fields exist
  assert.ok(snarkjsProof.protocol)
  assert.ok(snarkjsProof.pi_a)
  assert.ok(snarkjsProof.pi_b)
  assert.ok(snarkjsProof.pi_c)

  // Check array structures
  assert.is(snarkjsProof.pi_a.length, 2)
  assert.is(snarkjsProof.pi_b.length, 2)
  assert.is(snarkjsProof.pi_b[0].length, 2)
  assert.is(snarkjsProof.pi_b[1].length, 2)
  assert.is(snarkjsProof.pi_c.length, 2)
})

test('consistency: public inputs ordering verification', (assert) => {
  // This test ensures the exact order matches the circuit
  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut: [
      createMockUint8Array(1),
      createMockUint8Array(2),
      createMockUint8Array(3)
    ],
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(100),
    railgunTxidIfHasUnshield: createMockUint8Array(200),
    poiMerkleroots: [
      createMockUint8Array(300),
      createMockUint8Array(400),
      createMockUint8Array(500)
    ]
  }

  const result = standardToSnarkJSPublicInputs(publicInputs)

  // Expected order: blindedCommitmentsOut, anyRailgunTxidMerklerootAfterTransaction,
  // railgunTxidIfHasUnshield, poiMerkleroots
  const expectedOrder = [
    '1', '2', '3',  // blindedCommitmentsOut
    '100',          // anyRailgunTxidMerklerootAfterTransaction
    '200',          // railgunTxidIfHasUnshield
    '300', '400', '500'  // poiMerkleroots
  ]

  assert.alike(result, expectedOrder, 'public inputs should match expected order exactly')
})

test('type safety: all conversions preserve data types', (assert) => {
  const inputs = createMockCircuitInputs()
  const snarkjsInputs = standardToSnarkJSInput(inputs)

  // Check that number fields remain numbers
  assert.is(typeof snarkjsInputs.utxoTreeIn, 'number')
  assert.is(typeof snarkjsInputs.railgunTxidMerkleProofIndices, 'number')
  snarkjsInputs.utxoPositionsIn.forEach((pos: any) => {
    assert.is(typeof pos, 'number')
  })

  // Check that hex strings are strings
  assert.is(typeof snarkjsInputs.token, 'string')
  assert.is(typeof snarkjsInputs.nullifyingKey, 'string')

  // Check that BigInt values become strings
  snarkjsInputs.valuesIn.forEach((val: any) => {
    assert.is(typeof val, 'string')
  })
})

test('performance: batch proof conversions', (assert) => {
  const proofs = Array.from({ length: 10 }, () => createMockSnarkjsProof())

  proofs.forEach(proof => {
    const standard = snarkJSToStandardProof(proof)
    const backToSnarkjs = standardToSnarkJSProof(standard)

    assert.is(backToSnarkjs.pi_a[0], proof.pi_a[0])
    assert.is(backToSnarkjs.protocol, 'groth16')
  })
})

test('performance: batch input conversions', (assert) => {
  const inputs = Array.from({ length: 10 }, () => createMockCircuitInputs())

  inputs.forEach(input => {
    const snarkjs = standardToSnarkJSInput(input)
    assert.ok(snarkjs.token.startsWith('0x'))
    assert.is(typeof snarkjs.valuesIn[0], 'string')
  })
})

test('regression: pi_b reversal is correct', (assert) => {
  // This test specifically verifies the reversal logic for pi_b
  // which is a common source of errors
  const snarkjsProof: SnarkjsProof = {
    protocol: 'groth16',
    pi_a: ['1', '2'],
    pi_b: [
      ['3', '4'],   // pi_b[0][0]=3, pi_b[0][1]=4
      ['5', '6']    // pi_b[1][0]=5, pi_b[1][1]=6
    ],
    pi_c: ['7', '8']
  }

  const standard = snarkJSToStandardProof(snarkjsProof)

  // After conversion: b.x[0] should be pi_b[0][1]=4, b.x[1] should be pi_b[0][0]=3
  assert.is(bytesToBigInt(standard.b.x[0]).toString(), '4')
  assert.is(bytesToBigInt(standard.b.x[1]).toString(), '3')
  assert.is(bytesToBigInt(standard.b.y[0]).toString(), '6')
  assert.is(bytesToBigInt(standard.b.y[1]).toString(), '5')

  // Convert back
  const backToSnarkjs = standardToSnarkJSProof(standard)

  // Should match original
  assert.is(backToSnarkjs.pi_b[0][0], '3')
  assert.is(backToSnarkjs.pi_b[0][1], '4')
  assert.is(backToSnarkjs.pi_b[1][0], '5')
  assert.is(backToSnarkjs.pi_b[1][1], '6')
})

test('regression: public inputs must include all 28 elements for 13x13 circuit', (assert) => {
  // Real-world scenario: 13 inputs, 13 outputs
  const blindedCommitments = Array.from({ length: 13 }, (_, i) => createMockUint8Array(i))
  const poiMerkleroots = Array.from({ length: 13 }, (_, i) => createMockUint8Array(100 + i))

  const publicInputs: POIPublicInputs = {
    proof: createMockStandardProof(),
    blindedCommitmentsOut: blindedCommitments,
    anyRailgunTxidMerklerootAfterTransaction: createMockUint8Array(1000),
    railgunTxidIfHasUnshield: createMockUint8Array(2000),
    poiMerkleroots
  }

  const result = standardToSnarkJSPublicInputs(publicInputs)

  // CRITICAL: Must be exactly 28 for the circuit
  // 13 (blindedCommitmentsOut) + 1 (anyRailgunTxidMerklerootAfterTransaction) +
  // 1 (railgunTxidIfHasUnshield) + 13 (poiMerkleroots) = 28
  assert.is(result.length, 28, 'must have exactly 28 public inputs for 13x13 circuit')
})

test('regression: hex strings must be properly padded', (assert) => {
  // Small numbers should be padded to 32 bytes (64 hex chars + 0x)
  const smallValue = createMockUint8Array(1)
  const circuitInputs = createMockCircuitInputs()
  circuitInputs.token = smallValue

  const result = standardToSnarkJSInput(circuitInputs)

  // Should be 0x + 64 characters
  assert.is(result.token.length, 66, 'hex string should be properly padded')
  assert.ok(result.token.endsWith('01'), 'should have value at end')
})
