export interface SocketLike {
  onopen: (() => void) | null
  onclose: (() => void) | null
  onmessage: ((ev: { data: string }) => void) | null
  close(): void
}

export type SocketFactory = (url: string) => SocketLike

export interface ConnectionCallbacks {
  onUp(): void
  onDown(attempt: number): void
  onMessage(data: string): void
}

export interface ReconnectOptions {
  createSocket?: SocketFactory
  baseDelayMs?: number
  maxDelayMs?: number
}

const defaultFactory: SocketFactory = (url) => new WebSocket(url) as unknown as SocketLike

/**
 * Сырой WebSocket-слой: коннект, реконнект с exponential backoff.
 * Не знает про стакан и формат сообщений.
 */
export class ReconnectingSocket {
  private socket: SocketLike | null = null
  private attempt = 0
  private stopped = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly url: string,
    private readonly callbacks: ConnectionCallbacks,
    private readonly opts: ReconnectOptions = {},
  ) {}

  connect(): void {
    if (this.stopped) return
    const create = this.opts.createSocket ?? defaultFactory
    const socket = create(this.url)
    this.socket = socket
    socket.onopen = () => {
      this.attempt = 0
      this.callbacks.onUp()
    }
    socket.onmessage = (ev) => this.callbacks.onMessage(ev.data)
    socket.onclose = () => {
      if (!this.stopped) this.scheduleReconnect()
    }
  }

  close(): void {
    this.stopped = true
    if (this.timer !== null) clearTimeout(this.timer)
    this.socket?.close()
  }

  private scheduleReconnect(): void {
    this.attempt += 1
    this.callbacks.onDown(this.attempt)
    const base = this.opts.baseDelayMs ?? 1000
    const max = this.opts.maxDelayMs ?? 30000
    const delay = Math.min(base * 2 ** (this.attempt - 1), max)
    this.timer = setTimeout(() => this.connect(), delay)
  }
}
