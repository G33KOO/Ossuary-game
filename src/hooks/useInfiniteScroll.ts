import { useEffect, useRef } from 'react'

type UseInfiniteScrollOptions = {
  enabled: boolean
  onReachEnd: () => void
}

export function useInfiniteScroll({ enabled, onReachEnd }: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onReachEnd)

  useEffect(() => {
    callbackRef.current = onReachEnd
  }, [onReachEnd])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!enabled || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callbackRef.current()
      },
      { rootMargin: '600px 0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled, onReachEnd])

  return sentinelRef
}
