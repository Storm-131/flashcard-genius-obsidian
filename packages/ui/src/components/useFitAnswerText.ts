import { useEffect, useLayoutEffect, useRef } from "react"
import { setCssProps } from "../domStyles"

// Study names wrap only between words. Fit the primary first, then derive
// the secondary font from its actual size before fitting the secondary itself.
// The existing per-column fitter below remains unchanged for the Library.
export function useFitStudyAnswerText(content: string, enabled: boolean, fontScale: number, visible = false) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (enabled && visible && ref.current) ref.current.scrollTop = 0
  }, [enabled, visible])
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    const names = element.querySelector<HTMLElement>(".study-answer-name-content")
    if (!names) return
    let frame = 0
    let disposed = false
    const updateScrollHint = () => {
      const moreBelow = element.scrollHeight - element.clientHeight - element.scrollTop > 2
      element.dataset.moreBelow = String(moreBelow)
      element.parentElement?.classList.toggle("has-more-answer-content", moreBelow)
    }
    const fit = () => {
      frame = 0
      const parts = Array.from(names.querySelectorAll<HTMLElement>(".card-answer-part"))
      const height = element.clientHeight
      if (!(element.clientWidth > 0 && height > 0)) return
      element.style.removeProperty("--study-secondary-font")
      for (const part of parts) setCssProps(part, { "--answer-fit-scale": "1" })
      const primary = parts.find((part) => (part.dataset.columnIndex ?? "0") === "0")
      const secondary = parts.find((part) => part.dataset.columnIndex === "1")
      const fitWidth = (part: HTMLElement) => {
        let lower = 0
        let upper = 1
        if (part.scrollWidth <= part.clientWidth) return 1
        // Words remain intact. No fixed minimum may force an overflowing word.
        for (let iteration = 0; iteration < 14; iteration++) {
          const scale = (lower + upper) / 2
          setCssProps(part, { "--answer-fit-scale": String(scale) })
          if (part.scrollWidth <= part.clientWidth) lower = scale
          else upper = scale
        }
        setCssProps(part, { "--answer-fit-scale": String(lower) })
        return lower
      }
      const primaryScale = primary ? fitWidth(primary) : 1
      const referenceFont = primary
        ? parseFloat(getComputedStyle(primary).fontSize)
        : secondary ? parseFloat(getComputedStyle(secondary).fontSize) / 0.75 : 0
      if (referenceFont > 0)
        setCssProps(element, { "--study-secondary-font": `${referenceFont * 0.75}px` })
      const secondaryScale = secondary ? fitWidth(secondary) : 1
      const setScale = (scale: number) => {
        if (primary) setCssProps(primary, { "--answer-fit-scale": String(primaryScale * scale) })
        if (secondary) setCssProps(secondary, { "--answer-fit-scale": String(secondaryScale * scale) })
      }
      // Keep simple names within the first viewport. Structured/legacy answers
      // stay readable and scrollable instead of shrinking an entire essay.
      const simpleNames = parts.every((part) =>
        part.querySelectorAll("p").length <= 2 &&
        !part.querySelector("img, pre, table, blockquote, ul, ol, .inline-math, .math"),
      )
      if (simpleNames && names.offsetHeight > height * 0.9) {
        let lower = 0
        let upper = 1
        for (let iteration = 0; iteration < 14; iteration++) {
          const scale = (lower + upper) / 2
          setScale(scale)
          if (names.offsetHeight <= height * 0.9) lower = scale
          else upper = scale
        }
        setScale(lower)
      }
      const fittedPrimaryFont = primary
        ? parseFloat(getComputedStyle(primary).fontSize)
        : referenceFont
      if (fittedPrimaryFont > 0)
        setCssProps(element, { "--study-primary-font": `${fittedPrimaryFont}px` })
      setCssProps(element, { "--study-info-gap": `${Math.max(16 * fontScale, fittedPrimaryFont * 0.65)}px` })
      updateScrollHint()
    }
    const schedule = () => {
      if (!disposed && !frame) frame = window.requestAnimationFrame(fit)
    }
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule)
    resize?.observe(element)
    if (!resize) window.addEventListener("resize", schedule)
    const mutations = new MutationObserver(schedule)
    mutations.observe(element, { childList: true, subtree: true, characterData: true })
    const fonts = element.ownerDocument.fonts
    void fonts?.ready.then(schedule)
    fonts?.addEventListener("loadingdone", schedule)
    element.addEventListener("scroll", updateScrollHint, { passive: true })
    schedule()
    return () => {
      disposed = true
      if (frame) window.cancelAnimationFrame(frame)
      resize?.disconnect()
      mutations.disconnect()
      window.removeEventListener("resize", schedule)
      fonts?.removeEventListener("loadingdone", schedule)
      element.removeEventListener("scroll", updateScrollHint)
      delete element.dataset.moreBelow
      element.parentElement?.classList.remove("has-more-answer-content")
      for (const part of names.querySelectorAll<HTMLElement>(".card-answer-part"))
        part.style.removeProperty("--answer-fit-scale")
      element.style.removeProperty("--study-secondary-font")
      element.style.removeProperty("--study-primary-font")
      element.style.removeProperty("--study-info-gap")
    }
  }, [content, enabled, fontScale])
  return ref
}

// Measure the rendered Markdown, including its bold/italic font metrics. Observe
// the fixed card viewport, not the fitted text height, to avoid resize feedback.
export default function useFitAnswerText(
  content: string,
  enabled: boolean,
  fontScale: number,
) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const reset = () => {
      element.style.removeProperty("--answer-fit-scale")
      element.style.removeProperty("--answer-part-spacing")
      delete element.dataset.fitMode
    }
    reset()
    if (!enabled) return
    const viewport = element.closest(".card-content-viewport")
    let frame = 0
    let disposed = false

    const fitText = () => {
      element.style.removeProperty("--answer-fit-scale")
      delete element.dataset.fitMode
      const markdown = element.querySelector<HTMLElement>(".markdown-content")
      if (
        !markdown ||
        markdown.querySelector(
          "img, br, pre, table, blockquote, .inline-math, .math",
        )
      )
        return
      const blocks = markdown.querySelectorAll<HTMLElement>(
        "p, h1, h2, h3, h4, h5, h6, li",
      )
      const measurableBlocks = Array.from(blocks).filter((block) =>
        block.textContent?.trim(),
      )
      if (!measurableBlocks.length && markdown.textContent?.trim())
        measurableBlocks.push(markdown)
      if (!measurableBlocks.length) return

      const style = getComputedStyle(element)
      const availableWidth =
        element.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight)
      const preferredFont = parseFloat(style.fontSize)
      if (!(availableWidth > 0 && preferredFont > 0)) return

      const measure = () => {
        const measuringClasses = measurableBlocks.map((block) =>
          block.classList.contains("card-answer-measure"),
        )
        try {
          return Math.max(
            ...measurableBlocks.map((block) => {
              block.classList.add("card-answer-measure")
              const range = document.createRange()
              range.selectNodeContents(block)
              const bounds = block.getBoundingClientRect()
              // Range also includes italic overhang; normalize its transformed
              // bounds to layout pixels so the flip animation cannot skew fitting.
              const textWidth =
                bounds.width > 0
                  ? (range.getBoundingClientRect().width * block.offsetWidth) /
                    bounds.width
                  : 0
              return Math.max(block.scrollWidth, textWidth)
            }),
          )
        } finally {
          measurableBlocks.forEach((block, index) => {
            block.classList.toggle("card-answer-measure", measuringClasses[index])
          })
        }
      }
      const naturalWidth = measure()
      if (!naturalWidth) return
      const minimumFont =
        (parseFloat(style.getPropertyValue("--card-answer-fit-min")) || 12) *
        fontScale
      const minimumScale = Math.min(1, minimumFont / preferredFont)
      let scale = Math.min(
        1,
        Math.max(minimumScale, (availableWidth - 2) / naturalWidth),
      )
      setCssProps(element, { "--answer-fit-scale": String(scale) })
      // Recheck the actual fitted glyphs to account for pixel rounding and
      // native Markdown elements whose metrics do not scale perfectly linearly.
      let fittedWidth = measure()
      if (fittedWidth > availableWidth && scale > minimumScale) {
        scale = Math.max(
          minimumScale,
          (scale * (availableWidth - 2)) / fittedWidth,
        )
        setCssProps(element, { "--answer-fit-scale": String(scale) })
        fittedWidth = measure()
      }
      // Preserve the existing no-wrap treatment for a single plain text block.
      // Structured Markdown shares the same fitted font but keeps its own wraps.
      const singlePlainBlock =
        measurableBlocks.length === 1 &&
        measurableBlocks[0].tagName !== "LI" &&
        measurableBlocks[0].textContent?.trim() === markdown.textContent?.trim()
      if (fittedWidth <= availableWidth && singlePlainBlock)
        element.dataset.fitMode = "single-line"
      // If even the readable minimum cannot fit, normal wrapping stays enabled.
    }
    const fit = () => {
      frame = 0
      fitText()
      // An unusually long first name can become smaller than the next column.
      // Keep both adjacent gaps relative to the smaller *fitted* font size.
      for (const current of [element, element.nextElementSibling]) {
        const previous = current?.previousElementSibling
        if (
          !(current instanceof HTMLElement) ||
          !(previous instanceof HTMLElement)
        )
          continue
        const currentStyle = getComputedStyle(current)
        const smallerFont = Math.min(
          parseFloat(currentStyle.fontSize),
          parseFloat(getComputedStyle(previous).fontSize),
        )
        const gap = parseFloat(
          currentStyle.getPropertyValue("--card-answer-part-gap"),
        )
        if (Number.isFinite(smallerFont * gap))
          setCssProps(current, { "--answer-part-spacing": `${smallerFont * gap}px` })
      }
    }
    const schedule = () => {
      if (!disposed && !frame) frame = window.requestAnimationFrame(fit)
    }
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule)
    if (viewport) resize?.observe(viewport)
    if (!resize) window.addEventListener("resize", schedule)
    // Obsidian renders Markdown asynchronously after the React commit.
    const mutations = new MutationObserver(schedule)
    mutations.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    const fonts = element.ownerDocument.fonts
    void fonts?.ready.then(schedule)
    fonts?.addEventListener("loadingdone", schedule)
    schedule()

    return () => {
      disposed = true
      reset()
      if (frame) window.cancelAnimationFrame(frame)
      resize?.disconnect()
      mutations.disconnect()
      window.removeEventListener("resize", schedule)
      fonts?.removeEventListener("loadingdone", schedule)
    }
  }, [content, enabled, fontScale])

  return ref
}
