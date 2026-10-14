import { describe, expect, it } from 'vitest'
import { extractMarkdownImages, hasMarkdownImages, rewriteMarkdownImagePaths, stripMarkdownImages } from './markdownImages'

describe('Obsidian image references', () => {
  it.each(['100', '250', '300x200', '42x99'])('extracts the vault path without size %s', size => {
    const raw = `![[Sperber.webp|${size}]]`
    expect(extractMarkdownImages(raw)).toEqual([{ alt: 'Sperber.webp', path: 'Sperber.webp', raw, start: 0, end: raw.length }])
    expect(hasMarkdownImages(raw)).toBe(true)
  })

  it('resolves wiki paths while preserving original Markdown and size syntax', () => {
    const content = '**Bird**\n\n![[birds/Sperber.webp|300x200]]'
    expect(rewriteMarkdownImagePaths(content, new Map([['birds/Sperber.webp', 'app://vault/bird.webp']])))
      .toBe('**Bird**\n\n![[app://vault/bird.webp|300x200]]')
    expect(rewriteMarkdownImagePaths(content, new Map())).toBe(content)
    expect(stripMarkdownImages(content)).toBe('**Bird**')
  })

  it('supports escaped size delimiters and regular Markdown images together', () => {
    const content = '![[Sperber.webp\\|100]] ![Diagram](img/diagram.png)'
    expect(extractMarkdownImages(content).map(image => image.path)).toEqual(['Sperber.webp', 'img/diagram.png'])
    expect(rewriteMarkdownImagePaths(content, new Map([['Sperber.webp', 'app://bird']])))
      .toBe('![[app://bird\\|100]] ![Diagram](img/diagram.png)')
  })
})
