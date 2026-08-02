import { useCallback, useEffect, useRef, useState } from "react"

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: boolean
  reload: () => void
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: false,
    reload: () => {},
  })

  const loadRef = useRef(load)
  loadRef.current = load

  const run = useCallback(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: false }))
    loadRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: false, reload: run })
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: true, reload: run })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cleanup = run()
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload: run }
}
