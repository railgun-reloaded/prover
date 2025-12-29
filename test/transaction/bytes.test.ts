import { test } from 'brittle'

import {
  arrayToByteLength,
  numberStringToUint8Array,
  uint8ArrayToHexString,
  uint8ArrayToNumberString
} from '../../src/core/bytes'

// ============================================================================
// uint8ArrayToHexString Tests
// ============================================================================

test('uint8ArrayToHexString: converts empty array', (assert) => {
  const input = new Uint8Array([])
  const result = uint8ArrayToHexString(input)
  assert.is(result, '0x', 'empty array should return 0x')
})

test('uint8ArrayToHexString: converts single byte', (assert) => {
  const input = new Uint8Array([255])
  const result = uint8ArrayToHexString(input)
  assert.is(result, '0xff', 'should convert 255 to 0xff')
})

test('uint8ArrayToHexString: pads single digit hex values', (assert) => {
  const input = new Uint8Array([0, 1, 15, 16])
  const result = uint8ArrayToHexString(input)
  assert.is(result, '0x00010f10', 'should pad single digit hex values with leading zero')
})

test('uint8ArrayToHexString: converts multiple bytes', (assert) => {
  const input = new Uint8Array([18, 52, 86, 120, 144, 171, 205, 239])
  const result = uint8ArrayToHexString(input)
  assert.is(result, '0x1234567890abcdef', 'should convert byte array to hex string')
})

test('uint8ArrayToHexString: handles all zeros', (assert) => {
  const input = new Uint8Array([0, 0, 0, 0])
  const result = uint8ArrayToHexString(input)
  assert.is(result, '0x00000000', 'should handle all zeros correctly')
})

test('uint8ArrayToHexString: handles all 255s', (assert) => {
  const input = new Uint8Array([255, 255, 255, 255])
  const result = uint8ArrayToHexString(input)
  assert.is(result, '0xffffffff', 'should handle all 255s correctly')
})

test('uint8ArrayToHexString: converts 32 byte array', (assert) => {
  const input = new Uint8Array(32).fill(170) // 0xAA
  const result = uint8ArrayToHexString(input)
  const expected = '0x' + 'aa'.repeat(32)
  assert.is(result, expected, 'should handle 32 byte array')
})

// ============================================================================
// uint8ArrayToNumberString Tests
// ============================================================================

test('uint8ArrayToNumberString: converts zero', (assert) => {
  const input = new Uint8Array([0])
  const result = uint8ArrayToNumberString(input)
  assert.is(result, '0', 'should convert zero correctly')
})

test('uint8ArrayToNumberString: converts single byte to number', (assert) => {
  const input = new Uint8Array([255])
  const result = uint8ArrayToNumberString(input)
  assert.is(result, '255', 'should convert 0xff to 255')
})

test('uint8ArrayToNumberString: converts small number', (assert) => {
  const input = new Uint8Array([1, 0])
  const result = uint8ArrayToNumberString(input)
  assert.is(result, '256', 'should convert to 256')
})

test('uint8ArrayToNumberString: converts large number', (assert) => {
  // 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
  const input = new Uint8Array(32).fill(255)
  const result = uint8ArrayToNumberString(input)
  const expected = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  assert.is(result, expected, 'should convert max 32-byte number')
})

test('uint8ArrayToNumberString: converts specific large number', (assert) => {
  const numberStr = '2051258411002736885948763699317990061539314419500486054347250703186609807356'
  const input = numberStringToUint8Array(numberStr, 32)
  const result = uint8ArrayToNumberString(input)
  assert.is(result, numberStr, 'should convert specific large number correctly')
})

test('uint8ArrayToNumberString: handles leading zeros', (assert) => {
  const input = new Uint8Array([0, 0, 0, 1])
  const result = uint8ArrayToNumberString(input)
  assert.is(result, '1', 'should ignore leading zeros')
})

// ============================================================================
// arrayToByteLength Tests
// ============================================================================

test('arrayToByteLength: pads short array', (assert) => {
  const input = new Uint8Array([1, 2, 3])
  const result = arrayToByteLength(input, 5)
  assert.alike(result, new Uint8Array([0, 0, 1, 2, 3]), 'should pad with leading zeros')
  assert.is(result.length, 5, 'should have correct length')
})

test('arrayToByteLength: handles exact length', (assert) => {
  const input = new Uint8Array([1, 2, 3, 4, 5])
  const result = arrayToByteLength(input, 5)
  assert.alike(result, input, 'should return same array when length matches')
})

test('arrayToByteLength: throws on overflow', (assert) => {
  const input = new Uint8Array([1, 2, 3, 4, 5, 6])
  assert.exception(() => arrayToByteLength(input, 5), /BigInt byte size is larger than length/)
})

test('arrayToByteLength: handles empty array', (assert) => {
  const input = new Uint8Array([])
  const result = arrayToByteLength(input, 4)
  assert.alike(result, new Uint8Array([0, 0, 0, 0]), 'should create array of zeros')
})

test('arrayToByteLength: pads to 32 bytes', (assert) => {
  const input = new Uint8Array([255])
  const result = arrayToByteLength(input, 32)
  assert.is(result.length, 32, 'should pad to 32 bytes')
  assert.is(result[31], 255, 'should have value at end')
  assert.is(result[0], 0, 'should have zeros at start')
})

test('arrayToByteLength: handles single byte array', (assert) => {
  const input = new Uint8Array([42])
  const result = arrayToByteLength(input, 1)
  assert.alike(result, new Uint8Array([42]), 'should handle single byte to single byte')
})

test('arrayToByteLength: handles empty array with zero length', (assert) => {
  const input = new Uint8Array([])
  const result = arrayToByteLength(input, 0)
  assert.alike(result, new Uint8Array([]), 'should handle zero length with empty array')
})

// ============================================================================
// numberStringToUint8Array Tests
// ============================================================================

test('numberStringToUint8Array: converts zero', (assert) => {
  const result = numberStringToUint8Array('0', 32)
  assert.is(result.length, 32, 'should have correct length')
  assert.alike(result, new Uint8Array(32), 'should be all zeros')
})

test('numberStringToUint8Array: converts small number', (assert) => {
  const result = numberStringToUint8Array('255', 32)
  assert.is(result.length, 32, 'should have correct length')
  assert.is(result[31], 255, 'should have 255 at end')
  for (let i = 0; i < 31; i++) {
    assert.is(result[i], 0, 'should have zeros in padding')
  }
})

test('numberStringToUint8Array: converts medium number', (assert) => {
  const result = numberStringToUint8Array('65535', 32) // 0xFFFF
  assert.is(result.length, 32)
  assert.is(result[30], 255, 'should have 0xFF')
  assert.is(result[31], 255, 'should have 0xFF')
})

test('numberStringToUint8Array: converts large number', (assert) => {
  const numberStr = '2051258411002736885948763699317990061539314419500486054347250703186609807356'
  const result = numberStringToUint8Array(numberStr, 32)
  assert.is(result.length, 32)
  // Convert back to verify
  const backToNumber = uint8ArrayToNumberString(result)
  assert.is(backToNumber, numberStr, 'round trip should work')
})

test('numberStringToUint8Array: handles hex string input', (assert) => {
  const result = numberStringToUint8Array('0xff', 32)
  assert.is(result.length, 32)
  assert.is(result[31], 255, 'should convert 0xff correctly')
})

test('numberStringToUint8Array: handles odd length hex conversion', (assert) => {
  const result = numberStringToUint8Array('4095', 4) // 0xFFF -> 0x0FFF
  assert.is(result.length, 4)
  assert.is(result[2], 15, 'should pad odd hex correctly')
  assert.is(result[3], 255, 'should have correct value')
})

test('numberStringToUint8Array: converts max 32-byte value', (assert) => {
  const maxValue = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  const result = numberStringToUint8Array(maxValue, 32)
  assert.is(result.length, 32)
  assert.alike(result, new Uint8Array(32).fill(255), 'should be all 0xFF')
})

test('numberStringToUint8Array: handles different padding lengths', (assert) => {
  const numberStr = '256'

  const result4 = numberStringToUint8Array(numberStr, 4)
  assert.is(result4.length, 4)
  assert.is(result4[2], 1)
  assert.is(result4[3], 0)

  const result8 = numberStringToUint8Array(numberStr, 8)
  assert.is(result8.length, 8)
  assert.is(result8[6], 1)
  assert.is(result8[7], 0)
})

// ============================================================================
// Round-trip Tests (Integration)
// ============================================================================

test('round-trip: numberString -> Uint8Array -> numberString', (assert) => {
  const testCases = [
    '0',
    '1',
    '255',
    '256',
    '65535',
    '16777215',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  ]

  testCases.forEach(testCase => {
    const uint8 = numberStringToUint8Array(testCase, 32)
    const result = uint8ArrayToNumberString(uint8)
    assert.is(result, testCase, `round trip failed for ${testCase}`)
  })
})

test('round-trip: Uint8Array -> hexString -> numberString -> Uint8Array', (assert) => {
  const original = new Uint8Array([18, 52, 86, 120, 144, 171, 205, 239])
  const hex = uint8ArrayToHexString(original)
  const numberStr = BigInt(hex).toString()
  const result = numberStringToUint8Array(numberStr, original.length)
  assert.alike(result, original, 'complex round trip should preserve data')
})

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

test('edge case: very large arrays', (assert) => {
  const largeArray = new Uint8Array(1000).fill(128)
  const hex = uint8ArrayToHexString(largeArray)
  assert.ok(hex.startsWith('0x'), 'should handle large arrays')
  assert.is(hex.length, 2002, 'should have correct length (0x + 2000 chars)')
})

test('edge case: boundary values', (assert) => {
  const boundaries = [0, 1, 127, 128, 254, 255]
  boundaries.forEach(val => {
    const arr = new Uint8Array([val])
    const num = uint8ArrayToNumberString(arr)
    const back = numberStringToUint8Array(num, 1)
    assert.is(back[0], val, `boundary value ${val} should round-trip`)
  })
})

test('edge case: numberStringToUint8Array with leading zeros in hex', (assert) => {
  const result = numberStringToUint8Array('15', 2) // 0xF -> 0x0F
  assert.is(result[0], 0, 'should have leading zero')
  assert.is(result[1], 15, 'should have correct value')
})

test('consistency: same number different representations', (assert) => {
  const decimal = '255'
  const hex = '0xff'

  const fromDecimal = numberStringToUint8Array(decimal, 32)
  const fromHex = numberStringToUint8Array(hex, 32)

  assert.alike(fromDecimal, fromHex, 'different representations should produce same result')
})

// ============================================================================
// Real-world Test Vectors
// ============================================================================

test('real-world: anyRailgunTxidMerklerootAfterTransaction', (assert) => {
  const value = '3992948854570403243612454494108563343803762571679238500930694570641057471215'
  const uint8 = numberStringToUint8Array(value, 32)
  const hex = uint8ArrayToHexString(uint8)
  const backToNumber = uint8ArrayToNumberString(uint8)

  assert.is(backToNumber, value, 'should preserve large number')
  assert.ok(hex.startsWith('0x'), 'should produce valid hex')
})

test('real-world: nullifier conversion', (assert) => {
  const hex = '0x1e52cee52f67c37a468458671cddde6b56390dcbdc4cf3b770badc0e78d66401'
  const numberStr = BigInt(hex).toString()
  const uint8 = numberStringToUint8Array(numberStr, 32)
  const backToHex = uint8ArrayToHexString(uint8)

  assert.is(backToHex, hex, 'should preserve nullifier value')
})

test('real-world: token address', (assert) => {
  const hex = '0x000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d6'
  const numberStr = BigInt(hex).toString()
  const uint8 = numberStringToUint8Array(numberStr, 32)
  const backToHex = uint8ArrayToHexString(uint8)

  assert.is(backToHex, hex, 'should preserve token address with leading zeros')
})

test('real-world: padding value 2051258411002736885948763699317990061539314419500486054347250703186609807356', (assert) => {
  const paddingValue = '2051258411002736885948763699317990061539314419500486054347250703186609807356'
  const uint8 = numberStringToUint8Array(paddingValue, 32)
  const backToNumber = uint8ArrayToNumberString(uint8)

  assert.is(backToNumber, paddingValue, 'should handle padding value correctly')
})

// ============================================================================
// Performance/Stress Tests
// ============================================================================

test('performance: batch conversions', (assert) => {
  const count = 100
  const values = Array.from({ length: count }, (_, i) => i.toString())

  values.forEach(val => {
    const uint8 = numberStringToUint8Array(val, 32)
    const back = uint8ArrayToNumberString(uint8)
    assert.is(back, val, `batch conversion ${val} should work`)
  })
})

test('array integrity: no mutation', (assert) => {
  const original = new Uint8Array([1, 2, 3, 4, 5])
  const originalCopy = new Uint8Array(original)

  arrayToByteLength(original, 10)

  assert.alike(original, originalCopy, 'original array should not be mutated')
})
