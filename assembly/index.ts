const KEY_OFFSET: i32 = 0
const KEY_LEN: i32 = 19
const INPUT_OFFSET: i32 = 256
const OUTPUT_OFFSET: i32 = 32768

export function init(): void {
  store<u8>(KEY_OFFSET + 0, 101)
  store<u8>(KEY_OFFSET + 1, 115)
  store<u8>(KEY_OFFSET + 2, 97)
  store<u8>(KEY_OFFSET + 3, 45)
  store<u8>(KEY_OFFSET + 4, 120)
  store<u8>(KEY_OFFSET + 5, 111)
  store<u8>(KEY_OFFSET + 6, 114)
  store<u8>(KEY_OFFSET + 7, 45)
  store<u8>(KEY_OFFSET + 8, 99)
  store<u8>(KEY_OFFSET + 9, 105)
  store<u8>(KEY_OFFSET + 10, 112)
  store<u8>(KEY_OFFSET + 11, 104)
  store<u8>(KEY_OFFSET + 12, 101)
  store<u8>(KEY_OFFSET + 13, 114)
  store<u8>(KEY_OFFSET + 14, 45)
  store<u8>(KEY_OFFSET + 15, 50)
  store<u8>(KEY_OFFSET + 16, 48)
  store<u8>(KEY_OFFSET + 17, 50)
  store<u8>(KEY_OFFSET + 18, 52)
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
