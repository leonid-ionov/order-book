import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReconnectingSocket, type SocketLike, type ConnectionCallbacks } from './connection'

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  closed = false
  close() {
    this.closed = true
  }
}

function setup(opts: { baseDelayMs?: number; maxDelayMs?: number } = {}) {
  const sockets: FakeSocket[] = []
  const callbacks: ConnectionCallbacks = {
    onUp: vi.fn(),
    onDown: vi.fn(),
    onMessage: vi.fn(),
  }
  const conn = new ReconnectingSocket('ws://test', callbacks, {
    createSocket: () => {
      const s = new FakeSocket()
      sockets.push(s)
      return s
    },
    baseDelayMs: opts.baseDelayMs ?? 1000,
    maxDelayMs: opts.maxDelayMs ?? 30000,
  })
  return { conn, sockets, callbacks }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('ReconnectingSocket', () => {
  it('reports onUp and forwards messages', () => {
    const { conn, sockets, callbacks } = setup()
    conn.connect()
    sockets[0]!.onopen!()
    sockets[0]!.onmessage!({ data: 'hello' })
    expect(callbacks.onUp).toHaveBeenCalledTimes(1)
    expect(callbacks.onMessage).toHaveBeenCalledWith('hello')
  })

  it('reconnects after close with exponential backoff', () => {
    const { conn, sockets, callbacks } = setup()
    conn.connect()
    sockets[0]!.onclose!()
    expect(callbacks.onDown).toHaveBeenCalledWith(1)
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(2)

    sockets[1]!.onclose!()
    expect(callbacks.onDown).toHaveBeenCalledWith(2)
    vi.advanceTimersByTime(1999)
    expect(sockets).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(3) // задержка удвоилась: 2000ms
  })

  it('caps the delay at maxDelayMs', () => {
    const { conn, sockets } = setup({ baseDelayMs: 1000, maxDelayMs: 3000 })
    conn.connect()
    for (let i = 0; i < 4; i++) {
      sockets[sockets.length - 1]!.onclose!()
      vi.advanceTimersByTime(3000) // 4-я попытка была бы 8000 без капа
    }
    expect(sockets).toHaveLength(5)
  })

  it('resets attempt counter after successful open', () => {
    const { conn, sockets, callbacks } = setup()
    conn.connect()
    sockets[0]!.onclose!()
    vi.advanceTimersByTime(1000)
    sockets[1]!.onopen!()
    sockets[1]!.onclose!()
    expect(callbacks.onDown).toHaveBeenLastCalledWith(1)
    vi.advanceTimersByTime(1000) // снова базовая задержка
    expect(sockets).toHaveLength(3)
  })

  it('close() stops reconnecting and closes the socket', () => {
    const { conn, sockets } = setup()
    conn.connect()
    sockets[0]!.onclose!()
    conn.close()
    vi.advanceTimersByTime(60000)
    expect(sockets).toHaveLength(1)

    const second = setup()
    second.conn.connect()
    second.conn.close()
    expect(second.sockets[0]!.closed).toBe(true)
    second.sockets[0]!.onclose!()
    vi.advanceTimersByTime(60000)
    expect(second.sockets).toHaveLength(1)
  })
})
