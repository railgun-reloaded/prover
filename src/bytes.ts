/**
 * Convert a Uint8Array to a 32 byte hex string
 * @param array - Uint8Array representation of hex string
 * @returns - 0x Prefixed Hex String
 */
function uint8ArrayToHexString (array: Uint8Array) : string {
  let hexString = ''

  array.forEach((byte) => {
    let hexByte = byte.toString(16)

    hexByte = hexByte.length === 1 ? '0' + hexByte : hexByte


    hexString += hexByte
  })


  return `0x${hexString}`
}
/**
 * Convert Uint8Array to a number string
 * @param array - Uint8Array representation of number
 * @returns - String representation of number
 */
function uint8ArrayToNumberString (array: Uint8Array) : string {
  return BigInt(uint8ArrayToHexString(array)).toString()
}

/**
 * Pad an input array to request length
 * @param byteArray - Input array
 * @param length - Size
 * @returns - Padded array of Uint8Array
 */
function arrayToByteLength (byteArray: Uint8Array, length: number) : Uint8Array {

  if (byteArray.length > length) throw new Error('BigInt byte size is larger than length')

  return new Uint8Array(new Array(length - byteArray.length).concat(...byteArray))
}
/**
 * Convert number string to Uint8Array
 * @param ns - Number string
 * @param length  - Padded length required for hex string
 * @returns - Uint8Array representation of number string
 */
function numberStringToUint8Array (ns: string, length: number): Uint8Array {
  
  let hex = BigInt(ns).toString(16)

  
  if (hex.length % 2) hex = `0${hex}`

  
  const hexArray = hex.match(/.{2}/g) ?? []

 
  const byteArray = new Uint8Array(hexArray.map((byte) => parseInt(byte, 16)))

  return arrayToByteLength(byteArray, length)
}

export { uint8ArrayToHexString, uint8ArrayToNumberString, arrayToByteLength, numberStringToUint8Array }