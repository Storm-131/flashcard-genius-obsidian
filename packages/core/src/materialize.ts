import type { Card, Category, Deck, DeckTopic } from './types'
import type { DeckDocument } from './importExportTypes'

const deckColors = ['#4F46E5', '#0EA5E9', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2']

function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

export interface MaterializedDecks {
  categories: Category[]
  decks: Deck[]
  topics: DeckTopic[]
  cards: Card[]
  cardOrderByDeck: Record<string, string[]>
}

export function materializeDeckDocuments(documents: DeckDocument[]): MaterializedDecks {
  const categories: Category[] = []
  const categoryIdsByName = new Map<string, string>()
  const decks: Deck[] = []
  const topics: DeckTopic[] = []
  const cards: Card[] = []
  const cardOrderByDeck: Record<string, string[]> = {}

  for (const document of documents) {
    const deckId = createId('deck')
    const rawCategoryName = document.categoryName?.trim()
    const categoryName = rawCategoryName?.toLocaleLowerCase() === 'allgemein' ? 'General' : rawCategoryName
    let categoryId: string | null = null
    if (categoryName) {
      const categoryKey = categoryName.toLocaleLowerCase()
      categoryId = categoryIdsByName.get(categoryKey) ?? null
      if (!categoryId) {
        categoryId = createId('category')
        categoryIdsByName.set(categoryKey, categoryId)
        categories.push({ id: categoryId, name: categoryName })
      }
    }

    const deck: Deck = {
      id: deckId,
      name: document.title,
      categoryId,
      color: deckColors[decks.length % deckColors.length],
      sourceFileName: document.sourceFileName,
    }
    decks.push(deck)
    cardOrderByDeck[deckId] = []

    for (const documentTopic of document.topics) {
      const topicId = createId('topic')
      topics.push({ id: topicId, deckId, name: documentTopic.name })
      for (const documentCard of documentTopic.cards) {
        const card: Card = {
          id: createId('card'),
          deckId,
          topicId,
          question: documentCard.question,
          answer: documentCard.answer,
          imageAsQuestion: false,
          tags: [],
          difficulty: documentCard.difficulty,
        }
        cards.push(card)
        cardOrderByDeck[deckId].push(card.id)
      }
    }
  }

  return { categories, decks, topics, cards, cardOrderByDeck }
}
