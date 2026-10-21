import type { FeedStatus } from '../domain/types'

const VARIANTS: Record<FeedStatus, { label: string; className: string }> = {
  loading: { label: 'loading…', className: 'border-border text-muted' },
  live: { label: '● Live', className: 'border-accent/30 bg-accent/12 text-accent' },
  demo: { label: 'Demo data · Binance unavailable', className: 'border-muted text-text' },
}

export function StatusBadge({ status }: { status: FeedStatus }) {
  const { label, className } = VARIANTS[status]
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] md:px-2.5 md:text-xs ${className}`}>{label}</span>
}
