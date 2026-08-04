import { useEffect, useRef, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageOverlay({ src, alt, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div
      ref={dialogRef}
      className="image-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Enlarged view: ${alt}`}
      tabIndex={-1}
      onClick={closeFromBackdrop}
    >
      <div className="image-overlay-content">
        <img src={src} alt={alt} onClick={onClose} />
      </div>
    </div>,
    document.querySelector('.flashcard-genius-root') ?? document.body,
  )
}
