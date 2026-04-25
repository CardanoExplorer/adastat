import { networkParams } from '@/config.ts'
import cbor from 'cbor'
import net from 'node:net'

let payload: Buffer

export const pingNode = (
  host: string,
  port: number
): Promise<{ alive: true; version: number | null } | { alive: false; error: string }> =>
  new Promise((resolve) => {
    const socket = new net.Socket()

    const done = (alive: boolean, versionOrError: number | string | null) => {
      socket.destroy()

      resolve(alive ? { alive, version: versionOrError as number } : { alive, error: versionOrError as string })
    }

    if (!payload) {
      payload = cbor.encode([
        0,
        new Map([
          [12, [networkParams.magic, false, 0, false]],
          [13, [networkParams.magic, false, 0, false]],
          [14, [networkParams.magic, false, 0, false]],
          [15, [networkParams.magic, false, 0, false]],
        ]),
      ])
    }

    let chunks = Buffer.alloc(0)

    socket.setTimeout(5 * 1000) // Connect timeout 5 seconds

    socket.connect(port, host, () => {
      socket.setTimeout(60 * 1000) // Response timeout 60 seconds

      const header = Buffer.alloc(8)

      header.writeUInt16BE(0, 4)
      header.writeUInt16BE(payload.length, 6)
      header.writeUInt32BE(Number(process.hrtime.bigint() / 1000n) % 0x100000000, 0)

      socket.write(Buffer.concat([header, payload]))
    })

    socket.on('data', (data) => {
      chunks = Buffer.concat([chunks, data])

      if (chunks.length >= 8) {
        const protocolId = chunks.readUInt16BE(4)

        if (protocolId === 0x8000) {
          const payloadLen = chunks.readUInt16BE(6)

          if (chunks.length >= 8 + payloadLen) {
            let version: number | null = null

            try {
              const decoded = cbor.decodeFirstSync(chunks.subarray(8, 8 + payloadLen))

              if (decoded[0] === 1) {
                version = decoded[1]
              }
            } catch {}

            done(true, version)
          }
        } else {
          done(false, `Invalid Protocol ID: ${protocolId}`)
        }
      }
    })

    socket.on('timeout', () => {
      done(false, 'Timeout')
    })

    socket.on('error', (err) => {
      done(false, err.message)
    })
  })
