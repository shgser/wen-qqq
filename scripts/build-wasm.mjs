import { writeFileSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const keyConfig = JSON.parse(readFileSync(resolve(root, 'wasm-key.json'), 'utf-8'))
const key = keyConfig.key
const b64 = Buffer.from(key).toString('base64')

console.log(`Key length: ${key.length}`)
console.log(`Base64: ${b64}`)

writeFileSync(
  resolve(root, 'crypto-key.js'),
  `export const KEY_B64 = "${b64}"\n`
)
console.log('Generated: crypto-key.js')
