import { useLayoutEffect, useRef } from 'react'

/** Bring a new table decision into view without scrolling the page or hand. */
export function useBoardFocus(identity: string | number) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const section = ref.current
    const table = section?.closest<HTMLElement>('.gb-table')
    const arena = section?.closest<HTMLElement>('.gb-arena')
    if (!table || !arena || window.innerWidth > 760) return
    table.scrollTo({ top: table.scrollTop + arena.getBoundingClientRect().top - table.getBoundingClientRect().top - 8, behavior: 'instant' })
  }, [identity])
  return ref
}
