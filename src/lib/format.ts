export function formatPercent(value: number | null, digits = 2): string {
  if (value === null) return "—"
  return `${value.toFixed(digits)}%`
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return "—"
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`
  return `${ms} ms`
}

export function formatCount(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(iso)) + " UTC"
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso))
}

export function formatRelative(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—"
  const diffMs = now.getTime() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} d ago`
}
