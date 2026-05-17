import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const keyConfig = JSON.parse(readFileSync(resolve(root, 'wasm-key.json'), 'utf-8'))
const key = keyConfig.key
const keyLen = key.length
const b64 = Buffer.from(key).toString('base64')

console.log(`Key: ${key}`)
console.log(`Base64: ${b64}`)
console.log(`Length: ${keyLen}`)

writeFileSync(
  resolve(root, 'crypto-key.js'),
  `export const KEY_B64 = "${b64}"\n`
)
console.log('Generated: crypto-key.js')

let storeLines = ''
for (let i = 0; i < keyLen; i++) {
  storeLines += `  store<u8>(KEY_OFFSET + ${i}, ${key.charCodeAt(i)})\n`
}

const assemblyCode = `const KEY_OFFSET: i32 = 0
const KEY_LEN: i32 = ${keyLen}
const INPUT_OFFSET: i32 = 256
const OUTPUT_OFFSET: i32 = 32768

export function init(): void {
${storeLines}}

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
`

mkdirSync(resolve(root, 'assembly'), { recursive: true })
writeFileSync(resolve(root, 'assembly/index.ts'), assemblyCode)
console.log('Generated: assembly/index.ts')

mkdirSync(resolve(root, 'wasm'), { recursive: true })
execSync(
  `npx asc assembly/index.ts -o wasm/decrypt.wasm --runtime stub --initialMemory 4 --noAssert`,
  { cwd: root, stdio: 'inherit' }
)
console.log('Compiled: wasm/decrypt.wasm')
