import { bigIntToBytes, bytesToBigInt, bytesToHex, hexToBytes } from '@railgun-reloaded/bytes'
import { test } from 'brittle'

/**
 * These tests pin the conversion behavior the prover relied on when it
 * still maintained its own bytes module. The local helpers have been
 * replaced as follows:
 *   uint8ArrayToHexString(b)        -> bytesToHex(b, { prefix: true })
 *   uint8ArrayToNumberString(b)     -> bytesToBigInt(b).toString()
 *   numberStringToUint8Array(s, n)  -> bigIntToBytes(BigInt(s), n)
 *   hexStringToUint8Array(h)        -> hexToBytes(h)
 * arrayToByteLength is dropped — it was only used internally by
 * numberStringToUint8Array, which is now expressed with bigIntToBytes.
 */

test('bytesToHex with prefix: empty array', (assert) => {
  assert.is(bytesToHex(new Uint8Array([]), { prefix: true }), '0x')
})

test('bytesToHex with prefix: single byte', (assert) => {
  assert.is(bytesToHex(new Uint8Array([255]), { prefix: true }), '0xff')
})

test('bytesToHex with prefix: pads single digit hex', (assert) => {
  assert.is(bytesToHex(new Uint8Array([0, 1, 15, 16]), { prefix: true }), '0x00010f10')
})

test('bytesToHex with prefix: 32 byte array', (assert) => {
  const input = new Uint8Array(32).fill(170)
  assert.is(bytesToHex(input, { prefix: true }), '0x' + 'aa'.repeat(32))
})

test('bytesToBigInt + toString: zero', (assert) => {
  assert.is(bytesToBigInt(new Uint8Array([0])).toString(), '0')
})

test('bytesToBigInt + toString: single byte 255', (assert) => {
  assert.is(bytesToBigInt(new Uint8Array([255])).toString(), '255')
})

test('bytesToBigInt + toString: 256', (assert) => {
  assert.is(bytesToBigInt(new Uint8Array([1, 0])).toString(), '256')
})

test('bytesToBigInt + toString: 32-byte max value', (assert) => {
  const input = new Uint8Array(32).fill(255)
  const expected = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  assert.is(bytesToBigInt(input).toString(), expected)
})

test('bytesToBigInt + toString: leading zeros', (assert) => {
  assert.is(bytesToBigInt(new Uint8Array([0, 0, 0, 1])).toString(), '1')
})

test('bigIntToBytes(BigInt(s), n): zero', (assert) => {
  const result = bigIntToBytes(BigInt('0'), 32)
  assert.is(result.length, 32)
  assert.alike(result, new Uint8Array(32))
})

test('bigIntToBytes(BigInt(s), n): small number', (assert) => {
  const result = bigIntToBytes(BigInt('255'), 32)
  assert.is(result.length, 32)
  assert.is(result[31], 255)
  for (let i = 0; i < 31; i += 1) assert.is(result[i], 0)
})

test('bigIntToBytes(BigInt(s), n): medium number', (assert) => {
  const result = bigIntToBytes(BigInt('65535'), 32)
  assert.is(result[30], 255)
  assert.is(result[31], 255)
})

test('bigIntToBytes(BigInt(s), n): large number round-trips', (assert) => {
  const numberStr = '2051258411002736885948763699317990061539314419500486054347250703186609807356'
  const bytes = bigIntToBytes(BigInt(numberStr), 32)
  assert.is(bytesToBigInt(bytes).toString(), numberStr)
})

test('bigIntToBytes(BigInt(s), n): hex string input', (assert) => {
  const result = bigIntToBytes(BigInt('0xff'), 32)
  assert.is(result[31], 255)
})

test('bigIntToBytes(BigInt(s), n): odd hex coerced via BigInt', (assert) => {
  // BigInt('0xfff') === 4095n; fits in 4 bytes as 00000fff
  const result = bigIntToBytes(BigInt('4095'), 4)
  assert.is(result[2], 15)
  assert.is(result[3], 255)
})

test('bigIntToBytes(BigInt(s), n): max 32-byte value', (assert) => {
  const maxValue = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  const result = bigIntToBytes(BigInt(maxValue), 32)
  assert.alike(result, new Uint8Array(32).fill(255))
})

test('bigIntToBytes(BigInt(s), n): different padding lengths', (assert) => {
  const numberStr = '256'

  const r4 = bigIntToBytes(BigInt(numberStr), 4)
  assert.is(r4.length, 4)
  assert.is(r4[2], 1)
  assert.is(r4[3], 0)

  const r8 = bigIntToBytes(BigInt(numberStr), 8)
  assert.is(r8.length, 8)
  assert.is(r8[6], 1)
  assert.is(r8[7], 0)
})

test('round-trip: numberString -> Uint8Array -> numberString', (assert) => {
  const cases = [
    '0',
    '1',
    '255',
    '256',
    '65535',
    '16777215',
    '2051258411002736885948763699317990061539314419500486054347250703186609807356',
    '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  ]
  for (const c of cases) {
    const u = bigIntToBytes(BigInt(c), 32)
    assert.is(bytesToBigInt(u).toString(), c, `round trip failed for ${c}`)
  }
})

test('round-trip: Uint8Array -> hex (prefixed) -> bigint -> Uint8Array', (assert) => {
  const original = new Uint8Array([18, 52, 86, 120, 144, 171, 205, 239])
  const hex = bytesToHex(original, { prefix: true })
  const numberStr = BigInt(hex).toString()
  const result = bigIntToBytes(BigInt(numberStr), original.length)
  assert.alike(result, original)
})

test('edge case: very large arrays', (assert) => {
  const largeArray = new Uint8Array(1000).fill(128)
  const hex = bytesToHex(largeArray, { prefix: true })
  assert.ok(hex.startsWith('0x'))
  assert.is(hex.length, 2002)
})

test('edge case: boundary values', (assert) => {
  for (const val of [0, 1, 127, 128, 254, 255]) {
    const arr = new Uint8Array([val])
    const num = bytesToBigInt(arr).toString()
    const back = bigIntToBytes(BigInt(num), 1)
    assert.is(back[0], val, `boundary value ${val} should round-trip`)
  }
})

test('consistency: same number different representations', (assert) => {
  const fromDecimal = bigIntToBytes(BigInt('255'), 32)
  const fromHex = bigIntToBytes(BigInt('0xff'), 32)
  assert.alike(fromDecimal, fromHex)
})

test('real-world: anyRailgunTxidMerklerootAfterTransaction', (assert) => {
  const value = '3992948854570403243612454494108563343803762571679238500930694570641057471215'
  const u = bigIntToBytes(BigInt(value), 32)
  const hex = bytesToHex(u, { prefix: true })
  assert.is(bytesToBigInt(u).toString(), value)
  assert.ok(hex.startsWith('0x'))
})

test('real-world: nullifier conversion', (assert) => {
  const hex = '0x1e52cee52f67c37a468458671cddde6b56390dcbdc4cf3b770badc0e78d66401'
  const numberStr = BigInt(hex).toString()
  const u = bigIntToBytes(BigInt(numberStr), 32)
  assert.is(bytesToHex(u, { prefix: true }), hex)
})

test('real-world: token address with leading zeros', (assert) => {
  const hex = '0x000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d6'
  const numberStr = BigInt(hex).toString()
  const u = bigIntToBytes(BigInt(numberStr), 32)
  assert.is(bytesToHex(u, { prefix: true }), hex)
})

test('hexToBytes: even-length round-trips with bytesToHex(prefix)', (assert) => {
  const hex = '0xdeadbeef'
  const bytes = hexToBytes(hex)
  assert.is(bytesToHex(bytes, { prefix: true }), hex)
})
