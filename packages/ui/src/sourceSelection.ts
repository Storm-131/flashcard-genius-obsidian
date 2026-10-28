import type { Card, Deck } from './types'

// Never guess between several source files or substitute another card's source.
export function resolveMarkdownSource(
  cards: Card[],
  selectedCardId: string | null,
  deck: Deck | null,
  sourcePaths: Record<string, string> = {},
): string | null {
  if (selectedCardId) return sourcePaths[selectedCardId] ?? null
  const deckCards = deck ? cards.filter(card => card.deckId === deck.id) : cards
  const paths = new Set(deckCards.map(card => sourcePaths[card.id]).filter(Boolean))
  if (!paths.size && deck?.sourceFileName?.toLowerCase().endsWith('.md')) paths.add(deck.sourceFileName)
  return paths.size === 1 ? [...paths][0] : null
}
