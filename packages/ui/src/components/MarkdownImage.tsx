import { useEffect, useRef, useState } from 'react'
import { useImageAssets } from '../images/ImageAssetsContext'
import ImageOverlay from './ImageOverlay'

interface Props {
  path: string
  alt: string
}

export default function MarkdownImage({ path, alt }: Props) {
  const { resolver } = useImageAssets()
  const [src, setSrc] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const accessibleAlt = alt || 'Flashcard image'

  useEffect(() => {
    const resolved = resolver.resolve(path)
    setSrc(resolved.src)
    setMissing(resolved.missing)
    return resolved.release
  }, [path, resolver])

  const closeOverlay = () => {
    setOverlayOpen(false)
    window.requestAnimationFrame(() => imageRef.current?.focus())
  }

  if (missing || !src) {
    return (
      <span className="markdown-image-missing" role="img" aria-label={`Missing image: ${accessibleAlt}`}>
        <span aria-hidden="true">▧</span>
        Image "{accessibleAlt}" is unavailable.
      </span>
    )
  }

  return (
    <span className="markdown-image">
      <img
        ref={imageRef}
        src={src}
        alt={accessibleAlt}
        onError={() => setMissing(true)}
      />
      <button
        type="button"
        className="markdown-image-zoom"
        aria-label={`Enlarge image: ${accessibleAlt}`}
        title="Enlarge image"
        onClick={event => {
          event.stopPropagation()
          setOverlayOpen(true)
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
          <circle cx="4.7" cy="4.7" r="3" stroke="currentColor" strokeWidth="1.1" />
          <path d="M7 7l2.4 2.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>
      {overlayOpen && <ImageOverlay src={src} alt={accessibleAlt} onClose={closeOverlay} />}
    </span>
  )
}
