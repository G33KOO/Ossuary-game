import type { ReactNode } from 'react'
import './modal-header.css'

export function ModalHeader({ id, title, onClose, closeLabel }: {
  id: string
  title: ReactNode
  onClose?: () => void
  closeLabel?: string
}) {
  return <header className="app-modal-header">
    <h2 id={id} className="app-modal-title">{title}</h2>
    {onClose ? <button className="modal-close" aria-label={closeLabel} title={closeLabel} type="button" onClick={onClose}>×</button> : null}
  </header>
}
