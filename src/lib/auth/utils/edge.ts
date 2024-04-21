import 'server-only'
import { sha256 } from 'oslo/crypto'
import { encodeHex } from 'oslo/encoding'
/**
 * This is what Payload does when you set secret in the config so we need to do the same for it to work.
 * This function is Edge compatible.
 */
export async function getPayloadSecret(): Promise<string> {
  const data = new TextEncoder().encode(process.env.AUTH_SECRET)
  const hashBuffer = await sha256(data)
  const hashHex = encodeHex(hashBuffer)
  return hashHex.slice(0, 32)
}

export async function generateRandomBytesHex(size: number): Promise<string> {
  const randomBuffer = crypto.getRandomValues(new Uint8Array(size))
  const hexString = Array.from(randomBuffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hexString
}
