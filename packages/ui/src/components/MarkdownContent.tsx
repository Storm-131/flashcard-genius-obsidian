import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import MarkdownImage from './MarkdownImage'
import ImageOverlay from './ImageOverlay'
import { stripMarkdownImages } from '../images/markdownImages'
import type { MarkdownRenderContext } from '../markdownRenderer'

interface Props {
  content: string
  style?: CSSProperties
  className?: string
  allowImages?: boolean
  markdownContext?: MarkdownRenderContext
  sourcePath?: string
}

const inlinePattern = /(!\[[^\]]*\]\([^\)\n]+\)|\*\*[^*]+\*\*|__[^_]+__|\+\+[^+]+\+\+|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]*\))/g

function stripRemoteImages(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)\n]+)\)/g, (raw, alt: string, path: string) => (
    /^https?:\/\//i.test(path.trim()) ? alt : raw
  ))
}

function renderInline(text: string, allowImages: boolean): ReactNode[] {
  return text.split(inlinePattern).filter(Boolean).map((part, index) => {
    if (part.startsWith('![')) {
      const match = part.match(/^!\[([^\]]*)\]\([^\)\n]+\)$/)
      if (!match || !allowImages) return part
      const path = part.slice(match[0].indexOf('](') + 2, -1)
      return <MarkdownImage key={index} alt={match[1].trim()} path={path.trim()} />
    }
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{renderInline(part.slice(2, -2), allowImages)}</strong>
    if (part.startsWith('__') && part.endsWith('__')) return <strong key={index}>{renderInline(part.slice(2, -2), allowImages)}</strong>
    if (part.startsWith('++') && part.endsWith('++')) return <u key={index}>{renderInline(part.slice(2, -2), allowImages)}</u>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{renderInline(part.slice(1, -1), allowImages)}</em>
    if (part.startsWith('_') && part.endsWith('_')) return <em key={index}>{renderInline(part.slice(1, -1), allowImages)}</em>
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} style={{ fontFamily: 'var(--font-monospace)', fontSize: '0.9em' }}>{part.slice(1, -1)}</code>
    }
    if (part.startsWith('[')) {
      const match = part.match(/^\[([^\]]+)\]\([^)]*\)$/)
      if (match) return renderInline(match[1], allowImages)
    }
    return part
  })
}

function renderFallback(content: string, allowImages: boolean): ReactNode[] {
  const lines = content.split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const unordered = line.match(/^[-*+]\s+(.+)/)
    const ordered = line.match(/^\d+\.\s+(.+)/)

    if (unordered || ordered) {
      const isOrdered = Boolean(ordered)
      const items: ReactNode[] = []
      while (index < lines.length) {
        const item = lines[index].match(isOrdered ? /^\d+\.\s+(.+)/ : /^[-*+]\s+(.+)/)
        if (!item) break
        items.push(<li key={index}>{renderInline(item[1], allowImages)}</li>)
        index += 1
      }
      const List = isOrdered ? 'ol' : 'ul'
      blocks.push(
        <List
          key={`list-${index}`}
          style={{
            margin: '0 0 8px',
            paddingLeft: '20px',
            listStyleType: isOrdered ? 'decimal' : 'disc',
            listStylePosition: 'outside',
          }}
        >
          {items}
        </List>,
      )
      continue
    }

    if (line.trim()) blocks.push(<p key={index} style={{ margin: '0 0 8px' }}>{renderInline(line, allowImages)}</p>)
    index += 1
  }

  return blocks
}

function addImageZoomControls(element: HTMLElement, onOpen: (src: string, alt: string) => void): () => void {
  const cleanups: Array<() => void> = []

  for (const image of Array.from(element.querySelectorAll('img'))) {
    if (image.closest('.markdown-image')) continue
    const parent = image.parentNode
    if (!parent) continue

    const wrapper = document.createElement('span')
    wrapper.className = 'markdown-image'
    parent.insertBefore(wrapper, image)
    wrapper.appendChild(image)

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'markdown-image-zoom'
    const alt = image.alt || 'Flashcard image'
    button.setAttribute('aria-label', `Enlarge image: ${alt}`)
    button.title = 'Enlarge image'
    button.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><circle cx="4.7" cy="4.7" r="3" stroke="currentColor" stroke-width="1.1"></circle><path d="M7 7l2.4 2.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path></svg>'
    const openOverlay = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const src = image.currentSrc || image.src
      if (src) onOpen(src, alt)
    }
    button.addEventListener('click', openOverlay)
    wrapper.appendChild(button)
    cleanups.push(() => button.removeEventListener('click', openOverlay))
  }

  return () => cleanups.forEach(cleanup => cleanup())
}

export default function MarkdownContent({ content, style, className, allowImages = true, markdownContext, sourcePath = '' }: Props) {
  const markdownElementRef = useRef<HTMLDivElement>(null)
  const [overlayImage, setOverlayImage] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    const element = markdownElementRef.current
    if (!element || !markdownContext) return

    let disposed = false
    let removeImageZoomControls: () => void = () => {}
    const renderComponent = markdownContext.createComponent?.() ?? markdownContext.component
    if (renderComponent !== markdownContext.component) markdownContext.component.addChild(renderComponent)
    element.replaceChildren()
    const markdown = allowImages ? stripRemoteImages(content) : stripMarkdownImages(content)
    void Promise.resolve().then(() => {
      if (disposed) return
      return markdownContext.render(markdownContext.app, markdown, element, sourcePath, renderComponent)
    }).then(() => {
      if (!disposed && allowImages) removeImageZoomControls = addImageZoomControls(element, (src, alt) => setOverlayImage({ src, alt }))
    }).catch(() => {
      if (!disposed) element.textContent = content
    })

    return () => {
      disposed = true
      removeImageZoomControls()
      element.replaceChildren()
      if (renderComponent !== markdownContext.component) markdownContext.component.removeChild(renderComponent)
    }
  }, [allowImages, content, markdownContext, sourcePath])

  if (markdownContext) {
    return (
      <>
        <div ref={markdownElementRef} className={`markdown-content${className ? ` ${className}` : ''}`} style={style} />
        {overlayImage && <ImageOverlay src={overlayImage.src} alt={overlayImage.alt} onClose={() => setOverlayImage(null)} />}
      </>
    )
  }

  return <div className={`markdown-content${className ? ` ${className}` : ''}`} style={style}>{renderFallback(content, allowImages)}</div>
}
