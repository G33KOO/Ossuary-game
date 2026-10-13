import type { ReactNode } from 'react'

export type DropSpec<T> = { key: string; accepts: boolean; actions: T[]; over: boolean }

/** Shared drop behavior; only event handlers commit actions or touch drag state. */
export function DropTarget<T>({ as: Element = 'div', target, className, children, labelledBy, onHover, onCommit }: {
  as?: 'div' | 'section'
  target: DropSpec<T> | null
  className: string
  children: ReactNode
  labelledBy?: string
  onHover: (key: string | null) => void
  onCommit: (actions: T[]) => void
}) {
  const classes = target?.accepts ? ` is-target${target.over ? ' is-over' : ''}` : ''
  return <Element className={className + classes} aria-labelledby={labelledBy}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onHover(null) }}
    onDragOver={(event) => { if (target?.accepts) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; onHover(target.key) } }}
    onDrop={(event) => { if (target?.accepts) { event.preventDefault(); event.stopPropagation(); onHover(null); onCommit(target.actions) } }}>
    {children}
  </Element>
}
