import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { ModalHeader } from './ModalHeader'
import './modal.css'

/** Native focus trapping and consistent centering for app and game dialogs. */
export function Modal({ id, title, children, onClose, closeLabel, className = '', describedBy }: {
  id: string
  title: ReactNode
  children: ReactNode
  onClose?: () => void
  closeLabel?: string
  className?: string
  describedBy?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className={`app-modal sim-modal ${className}`} aria-labelledby={id} aria-describedby={describedBy}
    onCancel={(event) => { event.preventDefault(); onClose?.() }}
    onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose?.() } }}>
    <ModalHeader id={id} title={title} onClose={onClose} closeLabel={closeLabel} />
    {children}
  </dialog>
}
