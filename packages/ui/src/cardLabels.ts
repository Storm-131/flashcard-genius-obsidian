import type { Card } from './types'
import { hasMarkdownImages } from './images/markdownImages'

function plainText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|\+\+|`/g, '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cardReferenceName(card: Card): string {
  if (!hasMarkdownImages(card.question)) return plainText(card.question)
  // The parser places the second column first in the merged answer.
  return plainText(card.answer.split('\n\n')[0]) || 'Image card'
}
