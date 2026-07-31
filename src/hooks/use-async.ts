import { useEffect, useState } from "react"

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: boolean
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: false,
  })

  useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: false })
    load()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: false })
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: true })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
