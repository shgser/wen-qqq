import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const keyConfig = JSON.parse(readFileSync(resolve(root, 'wasm-key.json'), 'utf-8'))
const key = keyConfig.key
const keyLen = key.length
const b64 = Buffer.from(key).toString('base64')

console.log(`Key length: ${keyLen}`)

writeFileSync(
  resolve(root, 'crypto-key.js'),
  `export const KEY_B64 = "${b64}"\n`
)
console.log('Generated: crypto-key.js')

const masks = Array.from({ length: keyLen }, () => Math.floor(Math.random() * 256))
const maskedBytes = Array.from(key, (ch, i) => ch.charCodeAt(0) ^ masks[i])

const stateIds = Array.from({ length: keyLen }, () => 100 + Math.floor(Math.random() * 800))
const finalState = 999

const order = Array.from({ length: keyLen }, (_, i) => i)
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1))
  ;[order[i], order[j]] = [order[j], order[i]]
}

const branches = []
for (let step = 0; step < keyLen; step++) {
  const keyIdx = order[step]
  const mask = masks[keyIdx]
  const masked = maskedBytes[keyIdx]
  const sid = stateIds[step]
  const nextSid = step < keyLen - 1 ? stateIds[step + 1] : finalState

  branches.push(`    if (state == ${sid}) {`)
  branches.push(`      store<u8>(KEY_OFFSET + ${keyIdx}, ${masked});`)
  branches.push(`      store<u8>(KEY_OFFSET + ${keyIdx}, load<u8>(KEY_OFFSET + ${keyIdx}) ^ ${mask});`)

  if (Math.random() > 0.4) {
    const junkOff = 65000 + Math.floor(Math.random() * 500)
    const junkVal = Math.floor(Math.random() * 256)
    branches.push(`      store<u8>(${junkOff}, ${junkVal});`)
    branches.push(`      let _j${step}: i32 = load<u8>(${junkOff}) ^ ${Math.floor(Math.random() * 256)};`)
  }

  branches.push(`      state = ${nextSid};`)
  branches.push(`    }`)
}

for (let i = 0; i < 6; i++) {
  const fakeSid = 900 + Math.floor(Math.random() * 90)
  const fakeOff = 65000 + Math.floor(Math.random() * 500)
  branches.push(`    if (state == ${fakeSid}) {`)
  branches.push(`      store<u8>(${fakeOff}, ${Math.floor(Math.random() * 256)});`)
  branches.push(`      let _f${i}: i32 = load<u8>(${fakeOff});`)
  branches.push(`      state = ${fakeSid + 1};`)
  branches.push(`    }`)
}

const fakeNames = ['validate', 'checksum', 'hash', 'encode', 'transform', 'verify', 'compute', 'digest']
const fakeExports = []
const usedNames = new Set()
for (let i = 0; i < 4; i++) {
  let name
  do {
    name = fakeNames[Math.floor(Math.random() * fakeNames.length)]
  } while (usedNames.has(name))
  usedNames.add(name)

  const iterations = 10 + Math.floor(Math.random() * 20)
  const xorVal = Math.floor(Math.random() * 256)
  fakeExports.push(`
export function ${name}(input: i32): i32 {
  let acc: i32 = input
  for (let i: i32 = 0; i < ${iterations}; i++) {
    acc = acc ^ ${xorVal}
    acc = (acc << 1) | (acc >>> 31)
  }
  return acc
}`)
}

const assemblyCode = `const KEY_OFFSET: i32 = 0
const KEY_LEN: i32 = ${keyLen}

export function init(): void {
  let state: i32 = ${stateIds[0]}
  while (state != ${finalState}) {
${branches.join('\n')}
  }
}

export function getKeyPtr(): i32 {
  return KEY_OFFSET
}

export function getKeyLen(): i32 {
  return KEY_LEN
}

${fakeExports.join('\n')}
`

mkdirSync(resolve(root, 'assembly'), { recursive: true })
writeFileSync(resolve(root, 'assembly/index.ts'), assemblyCode)
console.log('Generated: assembly/index.ts (obfuscated)')

mkdirSync(resolve(root, 'wasm'), { recursive: true })
execSync(
  `npx asc assembly/index.ts -o wasm/decrypt.wasm --runtime stub --initialMemory 4 --noAssert`,
  { cwd: root, stdio: 'inherit' }
)
console.log('Compiled: wasm/decrypt.wasm')

function encodeLEB128(value) {
  const bytes = []
  do {
    let byte = value & 0x7F
    value >>>= 7
    if (value !== 0) byte |= 0x80
    bytes.push(byte)
  } while (value !== 0)
  return Buffer.from(bytes)
}

const wasmBuf = readFileSync(resolve(root, 'wasm/decrypt.wasm'))
const junkSections = []

for (let i = 0; i < 8; i++) {
  const name = `.debug_${randomBytes(4).toString('hex')}`
  const nameBytes = Buffer.from(name)
  const data = randomBytes(64 + Math.floor(Math.random() * 128))

  const nameLenEncoded = encodeLEB128(nameBytes.length)
  const contentLen = nameLenEncoded.length + nameBytes.length + data.length
  const sizeEncoded = encodeLEB128(contentLen)

  const section = Buffer.concat([
    Buffer.from([0]),
    sizeEncoded,
    nameLenEncoded,
    nameBytes,
    data
  ])
  junkSections.push(section)
}

const patched = Buffer.concat([wasmBuf, ...junkSections])
writeFileSync(resolve(root, 'wasm/decrypt.wasm'), patched)
console.log('Post-processed: wasm/decrypt.wasm (junk sections added)')
