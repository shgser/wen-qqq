const KEY_OFFSET: i32 = 0
const KEY_LEN: i32 = 28
const INPUT_OFFSET: i32 = 256
const OUTPUT_OFFSET: i32 = 32768

export function init(): void {
  store<u8>(KEY_OFFSET + 0, 77)
  store<u8>(KEY_OFFSET + 1, 88)
  store<u8>(KEY_OFFSET + 2, 75)
  store<u8>(KEY_OFFSET + 3, 104)
  store<u8>(KEY_OFFSET + 4, 76)
  store<u8>(KEY_OFFSET + 5, 88)
  store<u8>(KEY_OFFSET + 6, 104)
  store<u8>(KEY_OFFSET + 7, 118)
  store<u8>(KEY_OFFSET + 8, 99)
  store<u8>(KEY_OFFSET + 9, 116)
  store<u8>(KEY_OFFSET + 10, 49)
  store<u8>(KEY_OFFSET + 11, 106)
  store<u8>(KEY_OFFSET + 12, 122)
  store<u8>(KEY_OFFSET + 13, 88)
  store<u8>(KEY_OFFSET + 14, 66)
  store<u8>(KEY_OFFSET + 15, 113)
  store<u8>(KEY_OFFSET + 16, 83)
  store<u8>(KEY_OFFSET + 17, 88)
  store<u8>(KEY_OFFSET + 18, 73)
  store<u8>(KEY_OFFSET + 19, 116)
  store<u8>(KEY_OFFSET + 20, 75)
  store<u8>(KEY_OFFSET + 21, 106)
  store<u8>(KEY_OFFSET + 22, 65)
  store<u8>(KEY_OFFSET + 23, 121)
  store<u8>(KEY_OFFSET + 24, 78)
  store<u8>(KEY_OFFSET + 25, 65)
  store<u8>(KEY_OFFSET + 26, 61)
  store<u8>(KEY_OFFSET + 27, 61)
}

export function decrypt(len: i32): i32 {
  const ivLen: i32 = 8
  if (len <= ivLen) return 0

  const encLen = len - ivLen

  for (let i: i32 = 0; i < encLen; i++) {
    const ivByte = load<u8>(INPUT_OFFSET + (i % ivLen))
    const keyByte = load<u8>(KEY_OFFSET + ((i + ivByte) % KEY_LEN))
    const encByte = load<u8>(INPUT_OFFSET + ivLen + i)
    store<u8>(OUTPUT_OFFSET + i, encByte ^ keyByte)
  }

  return encLen
}

export function getInputPtr(): i32 {
  return INPUT_OFFSET
}

export function getOutputPtr(): i32 {
  return OUTPUT_OFFSET
}
