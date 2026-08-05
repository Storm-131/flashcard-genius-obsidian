import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

cleanup()
afterEach(cleanup)

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: vi.fn(() => `blob:test-${Math.random()}`),
})

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(window, 'requestAnimationFrame', {
  configurable: true,
  value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
})

globalThis.createEl = ((tag: keyof HTMLElementTagNameMap, options?: DomElementInfo | string) => {
  const element = document.createElement(tag)
  if (typeof options === 'string') element.className = options
  else if (options) {
    if (options.cls) element.className = Array.isArray(options.cls) ? options.cls.join(' ') : options.cls
    if (options.type) element.setAttribute('type', options.type)
  }
  return element
}) as typeof createEl

globalThis.createSpan = ((options?: DomElementInfo | string) => createEl('span', options)) as typeof createSpan

function createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K, options?: SvgElementInfo | string): SVGElementTagNameMap[K] {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag)
  if (typeof options === 'string') element.setAttribute('class', options)
  else if (options) {
    if (options.cls) element.setAttribute('class', Array.isArray(options.cls) ? options.cls.join(' ') : options.cls)
    for (const [name, value] of Object.entries(options.attr ?? {})) {
      if (value !== null) element.setAttribute(name, String(value))
    }
    options.parent?.appendChild(element)
  }
  return element
}

globalThis.createSvg = createSvgElement
HTMLElement.prototype.createSvg = createSvgElement
SVGElement.prototype.createSvg = createSvgElement
