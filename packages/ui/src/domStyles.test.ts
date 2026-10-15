import { describe, expect, it, vi } from 'vitest'
import { setCssProps } from './domStyles'

describe('host CSS properties', () => {
  it('uses the native Obsidian API when it is available', () => {
    const element = document.createElement('div')
    const native = vi.fn()
    element.setCssProps = native
    setCssProps(element, { '--answer-fit-scale': '0.75' })
    expect(native).toHaveBeenCalledWith({ '--answer-fit-scale': '0.75' })
  })

  it('keeps the standalone preview equivalent, including clearing a property', () => {
    const element = document.createElement('div')
    setCssProps(element, { '--answer-fit-scale': '0.75' })
    expect(element.style.getPropertyValue('--answer-fit-scale')).toBe('0.75')
    setCssProps(element, { '--answer-fit-scale': '' })
    expect(element.style.getPropertyValue('--answer-fit-scale')).toBe('')
  })
})
