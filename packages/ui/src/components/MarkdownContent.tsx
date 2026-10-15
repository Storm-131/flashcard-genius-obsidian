import { useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import MarkdownImage from './MarkdownImage'
import { extractMarkdownImages, stripMarkdownImages } from '../images/markdownImages'
import ImageOverlay from './ImageOverlay'
import { FallbackMathContext, type FallbackMathRenderer, type MarkdownRenderContext } from '../markdownRenderer'

interface Props {
  content: string
  style?: CSSProperties
  className?: string
  allowImages?: boolean
  markdownContext?: MarkdownRenderContext
  sourcePath?: string
}

const inlinePattern = /(!\[\[[^\]\n]+\]\]|!\[[^\]]*\]\([^)\n]+\)|\*\*[^*]+\*\*|__[^_]+__|\+\+[^+]+\+\+|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\)|\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g

function renderInlineMath(part: string, index: number, renderMath: FallbackMathRenderer | null): ReactNode | null {
  const expression = part.startsWith('\\(') && part.endsWith('\\)')
    ? part.slice(2, -2)
    : part.startsWith('$') && part.endsWith('$')
      ? part.slice(1, -1)
      : null

  if (expression === null || !renderMath) return null

  return <span key={index} className="inline-math">{renderMath(expression)}</span>
}

function renderInline(text: string, allowImages: boolean, renderMath: FallbackMathRenderer | null): ReactNode[] {
  return text.split(inlinePattern).filter(Boolean).map((part, index) => {
    const math = renderInlineMath(part, index, renderMath)
    if (math) return math
    if (part.startsWith('![')) {
      const image = extractMarkdownImages(part)[0]
      if (!image || !allowImages) return part
      return <MarkdownImage key={index} alt={image.alt} path={image.path} />
    }
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{renderInline(part.slice(2, -2), allowImages, renderMath)}</strong>
    if (part.startsWith('__') && part.endsWith('__')) return <strong key={index}>{renderInline(part.slice(2, -2), allowImages, renderMath)}</strong>
    if (part.startsWith('++') && part.endsWith('++')) return <u key={index}>{renderInline(part.slice(2, -2), allowImages, renderMath)}</u>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{renderInline(part.slice(1, -1), allowImages, renderMath)}</em>
    if (part.startsWith('_') && part.endsWith('_')) return <em key={index}>{renderInline(part.slice(1, -1), allowImages, renderMath)}</em>
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9em' }}>{part.slice(1, -1)}</code>
    }
    if (part.startsWith('[')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (match) {
        const [, label, href] = match
        const safeHref = /^(https?:|mailto:|\/)/i.test(href) ? href : undefined
        return safeHref ? (
          <a key={index} href={safeHref} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>
            {renderInline(label, allowImages, renderMath)}
          </a>
        ) : label
      }
    }
    return part
  })
}

function renderFallback(content: string, allowImages: boolean, renderMath: FallbackMathRenderer | null) {
  const lines = content.split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      const gapStart = index
      while (index < lines.length && !lines[index].trim()) index += 1
      if (blocks.length > 0 && index < lines.length) {
        blocks.push(<div key={`gap-${gapStart}`} className="markdown-paragraph-gap" aria-hidden="true" style={{ height: '0.75em', flexShrink: 0 }} />)
      }
      continue
    }
    const unordered = line.match(/^[-*+]\s+(.+)/)
    const ordered = line.match(/^\d+\.\s+(.+)/)

    if (unordered || ordered) {
      const isOrdered = Boolean(ordered)
      const items: ReactNode[] = []
      while (index < lines.length) {
        const item = lines[index].match(isOrdered ? /^\d+\.\s+(.+)/ : /^[-*+]\s+(.+)/)
        if (!item) break
        items.push(<li key={index}>{renderInline(item[1], allowImages, renderMath)}</li>)
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
        </List>
      )
      continue
    }

    if (line.trim()) {
      blocks.push(<p key={index} style={{ margin: '0 0 8px' }}>{renderInline(line, allowImages, renderMath)}</p>)
    }
    index += 1
  }

  return blocks
}

function stripRemoteImages(markdown: string): string {
  const images = extractMarkdownImages(markdown)
  for (const image of images.reverse()) {
    if (!/^https?:/i.test(image.path)) continue
    markdown = `${markdown.slice(0, image.start)}${image.alt}${markdown.slice(image.end)}`
  }
  return markdown
}

function prepareNativeMarkdown(markdown: string): string {
  // Obsidian wiki embeds expect vault paths, not resolved resource URLs.
  for (const image of extractMarkdownImages(markdown).reverse()) {
    if (!image.raw.startsWith('![[') || !/^(app:|capacitor:|blob:|data:)/i.test(image.path)) continue
    const alt = image.alt.replace(/[[\]]/g, '')
    markdown = `${markdown.slice(0, image.start)}![${alt}](${image.path})${markdown.slice(image.end)}`
  }
  return stripRemoteImages(markdown)
}

function addImageZoomControls(element: HTMLElement, onOpen: (src: string, alt: string) => void): () => void {
  const cleanups: Array<() => void> = []

  for (const image of Array.from(element.querySelectorAll('img'))) {
    if (image.closest('.markdown-image')) continue
    const parent = image.parentNode
    if (!parent) continue

    const wrapper = createSpan()
    wrapper.className = 'markdown-image'
    image.removeAttribute('width')
    image.removeAttribute('height')
    for (const property of ['width', 'height', 'max-width', 'max-height']) image.style.removeProperty(property)
    const embed = image.closest<HTMLElement>('.internal-embed.image-embed')
    if (embed) {
      embed.removeAttribute('width')
      embed.removeAttribute('height')
      for (const property of ['width', 'height', 'max-width', 'max-height']) embed.style.removeProperty(property)
    }
    parent.insertBefore(wrapper, image)
    wrapper.appendChild(image)

    const button = createEl('button')
    button.className = 'markdown-image-zoom'
    button.type = 'button'
    const alt = image.alt || 'Flashcard image'
    button.setAttribute('aria-label', `Enlarge image: ${alt}`)
    button.title = 'Enlarge image'
    button.textContent = '⤢'
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
  const renderMath = useContext(FallbackMathContext)
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
    const markdown = allowImages ? prepareNativeMarkdown(content) : stripMarkdownImages(content)
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

  return <div className={`markdown-content${className ? ` ${className}` : ''}`} style={style}>{renderFallback(content, allowImages, renderMath)}</div>
}
