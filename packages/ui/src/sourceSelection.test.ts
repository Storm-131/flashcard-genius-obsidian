import { describe, expect, it } from 'vitest'
import { resolveMarkdownSource } from './sourceSelection'
import type { Card, Deck } from './types'

const deck: Deck = { id: 'deck', name: 'Deck', categoryId: null, color: '#059669', sourceFileName: 'Deck.md' }
const cards: Card[] = ['a', 'b'].map(id => ({ id, deckId: deck.id, question: id, answer: id, tags: [] }))

describe('Edit source selection', () => {
  it('uses the selected card source and never substitutes a source for a card without one', () => {
    expect(resolveMarkdownSource(cards, 'b', deck, { a: 'First.md', b: 'Second.md' })).toBe('Second.md')
    expect(resolveMarkdownSource(cards, 'b', deck, { a: 'First.md' })).toBeNull()
  })
  it('uses a single deck source without requiring a card selection', () => {
    expect(resolveMarkdownSource(cards, null, deck, { a: 'Deck.md', b: 'Deck.md' })).toBe('Deck.md')
    expect(resolveMarkdownSource([], null, deck)).toBe('Deck.md')
  })
  it('refuses ambiguous or unavailable sources, including across decks', () => {
    expect(resolveMarkdownSource(cards, null, deck, { a: 'First.md', b: 'Second.md' })).toBeNull()
    expect(resolveMarkdownSource(cards, null, null)).toBeNull()
    expect(resolveMarkdownSource([...cards, { ...cards[0], id: 'other', deckId: 'other' }], null, null, { a: 'Deck.md', other: 'Other.md' })).toBeNull()
  })
})
