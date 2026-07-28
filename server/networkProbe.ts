import { lookup as dnsLookup } from 'node:dns/promises'
import { connect as openSocket } from 'node:net'

interface Dependencies {
  lookup: (hostname: string) => Promise<{ address: string; family: number }>
  connect: (address: string, port: number, timeoutMs: number) => Promise<void>
}

function connect(address: string, port: number, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const socket = openSocket({ host: address, port })
    const finish = (error?: Error) => {
      socket.destroy()
      if (error) reject(error)
      else resolve()
    }
    socket.setTimeout(timeoutMs, () => finish(new Error('company network timeout')))
    socket.once('connect', () => finish())
    socket.once('error', finish)
  })
}

export async function probeCompanyNetwork(
  baseUrl: string,
  dependencies: Dependencies = {
    lookup: (hostname) => dnsLookup(hostname),
    connect,
  },
) {
  const target = new URL(baseUrl)
  const resolved = await dependencies.lookup(target.hostname)
  const port = target.port
    ? Number(target.port)
    : target.protocol === 'https:'
      ? 443
      : 80
  await dependencies.connect(resolved.address, port, 5000)
}
