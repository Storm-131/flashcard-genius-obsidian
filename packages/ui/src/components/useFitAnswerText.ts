import { useEffect, useRef, useState } from 'react'
import { setCssProps } from '../domStyles'

type FitKind = 'question' | 'image-answer'

// Measure the rendered Markdown, including asynchronous native rendering and
// font loading. A single pixel font is the reference; derived sizes never apply
// the manual scale a second time.
export default function useFitAnswerText(content: string, enabled: boolean, fontScale: number, kind: FitKind = 'image-answer') {
  const ref = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const root = ref.current
    if (!root || !enabled) return
    const property = kind === 'question' ? '--card-question-font-size' : '--image-primary-font-size'
    const viewport = root.closest<HTMLElement>('.card-content-viewport')
    const card = root.closest<HTMLElement>('.workspace-card, .flip-card') ?? root
    let frame = 0
    let disposed = false
    let viewportSize = ''

    const fit = () => {
      frame = 0
      const targets = Array.from(root.querySelectorAll<HTMLElement>(kind === 'question' ? '[data-fit-question]' : '.card-answer-part'))
      if (!targets.length || !targets[0].textContent?.trim()) return
      let heightLimit = Infinity
      if (kind === 'question') {
        for (const target of targets) {
          const slot = target.closest<HTMLElement>('.card-heading, .card-content-viewport')
          if (!slot) continue
          const style = getComputedStyle(slot)
          const maximum = parseFloat(style.maxHeight)
          const available = Number.isFinite(maximum) ? maximum : slot.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 4
          if (available > 0) heightLimit = Math.min(heightLimit, available)
        }
        if (Number.isFinite(heightLimit)) setCssProps(root, { '--card-question-height': `${heightLimit}px` })
      } else if (root.classList.contains('library-image-answer') && viewport) {
        const nextSize = `${viewport.clientWidth}:${viewport.clientHeight}`
        if (nextSize !== viewportSize) viewport.scrollTop = 0
        viewportSize = nextSize
        // Cancel the current scroll offset: the initial stage always describes
        // the unscrolled viewport, even while the user reads additional columns.
        const top = root.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop
        const reserve = parseFloat(getComputedStyle(viewport).paddingBottom) || 0
        const remaining = Math.max(0, viewport.clientHeight - top)
        // Keep essay-like legacy answers readable and naturally scrollable.
        if (targets[0].querySelectorAll('p').length <= 2 && !targets[0].querySelector('ul, ol, pre, table, blockquote')) {
          heightLimit = Math.max(1, remaining - reserve)
        }
        if (root.querySelector('.library-additional-answers')) {
          setCssProps(root, { '--library-answer-initial-height': `${remaining + 1}px`, '--library-answer-bottom-reserve': `${reserve}px` })
        }
      }
      if (!(targets[0].clientWidth > 0)) return
      root.style.removeProperty(property)
      const preferred = parseFloat(getComputedStyle(targets[0]).fontSize)
      if (!(preferred > 0)) return
      const minimum = kind === 'question' ? Math.min(preferred, 10) : Math.min(preferred, 1)
      const setFont = (font: number) => setCssProps(root, { [property]: `${font}px` })
      const fits = () => targets.every((target, index) =>
        target.scrollWidth <= target.clientWidth + 1 &&
        ((kind === 'question' || index === 0) ? target.scrollHeight <= heightLimit + 1 : true),
      )
      setFont(preferred)
      if (!fits()) {
        let lower = minimum
        let upper = preferred
        setFont(lower)
        if (fits()) {
          for (let iteration = 0; iteration < 14; iteration++) {
            const font = (lower + upper) / 2
            setFont(font)
            if (fits()) lower = font
            else upper = font
          }
        }
        setFont(lower)
      }
      setOverflow(!fits())
    }
    const schedule = () => { if (!disposed && !frame) frame = window.requestAnimationFrame(fit) }
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    resize?.observe(card)
    if (viewport && viewport !== card) resize?.observe(viewport)
    if (!resize) window.addEventListener('resize', schedule)
    const mutations = new MutationObserver(schedule)
    mutations.observe(root, { childList: true, subtree: true, characterData: true })
    const fonts = root.ownerDocument.fonts
    void fonts?.ready.then(schedule)
    fonts?.addEventListener('loadingdone', schedule)
    schedule()
    return () => {
      disposed = true
      if (frame) window.cancelAnimationFrame(frame)
      resize?.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', schedule)
      fonts?.removeEventListener('loadingdone', schedule)
      root.style.removeProperty(property)
      root.style.removeProperty('--card-question-height')
      root.style.removeProperty('--library-answer-initial-height')
      root.style.removeProperty('--library-answer-bottom-reserve')
    }
  }, [content, enabled, fontScale, kind])
  return { ref, overflow }
}
