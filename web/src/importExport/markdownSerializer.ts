import type { Card, Deck, DeckTopic } from '../types'
import type { DeckDocument } from './types'

export function sanitizeFileName(value: string, extension = ''): string {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const safe = normalized
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\.{2,}/g, '.')
  return `${safe || 'deck'}${extension}`
}

export function buildDeckDocument(
  deck: Deck,
  cards: Card[],
  topics: DeckTopic[],
  cardOrder?: string[],
): DeckDocument {
  const order = new Map((cardOrder ?? []).map((id, index) => [id, index]))
  const deckCards = cards
    .filter(card => card.deckId === deck.id)
    .sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER))
  const deckTopics = topics.filter(topic => topic.deckId === deck.id)
  const knownTopicIds = new Set(deckTopics.map(topic => topic.id))
  const documentTopics = deckTopics
    .map(topic => ({
      name: topic.name,
      cards: deckCards
        .filter(card => card.topicId === topic.id)
        .map(card => ({ question: card.question, answer: card.answer, difficulty: card.difficulty ?? 0 })),
    }))
    .filter(topic => topic.cards.length > 0)
  const unassignedCards = deckCards
    .filter(card => !card.topicId || !knownTopicIds.has(card.topicId))
    .map(card => ({ question: card.question, answer: card.answer, difficulty: card.difficulty ?? 0 }))

  if (unassignedCards.length > 0) documentTopics.push({ name: 'General', cards: unassignedCards })

  return {
    title: deck.name,
    topics: documentTopics,
    sourceFileName: deck.sourceFileName,
  }
}

export function serializeDeckMarkdown(document: DeckDocument): string {
  const lines: string[] = [`# ${document.title.trim()}`]

  for (const topic of document.topics) {
    lines.push(`## ${topic.name.trim() || 'General'}`)
    lines.push('| Question | Answer | ⭐️ |', '| :--- | :--- | :--- |')
    for (const card of topic.cards) {
      const question = card.question.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim()
      const answer = card.answer.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim()
      const difficulty = Number.isInteger(card.difficulty) && card.difficulty >= 0 && card.difficulty <= 5 ? card.difficulty : 0
      lines.push(`| ${question} | ${answer} | ${difficulty} |`)
    }
  }

  return `${lines.join('\n')}\n`
}

export function uniqueDeckFileNames(documents: DeckDocument[]): string[] {
  const used = new Set<string>()
  return documents.map(document => {
    const sourceFileName = document.sourceFileName?.split(/[\\/]/).pop()?.trim()
    const requested = sourceFileName?.toLowerCase().endsWith('.md')
      ? sourceFileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/^\.+$/, 'deck.md')
      : sanitizeFileName(document.title, '.md')
    const dotIndex = requested.toLowerCase().endsWith('.md') ? requested.length - 3 : requested.length
    const stem = requested.slice(0, dotIndex)
    const extension = requested.slice(dotIndex) || '.md'
    let candidate = `${stem}${extension}`
    let suffix = 2
    while (used.has(candidate.toLowerCase())) {
      candidate = `${stem}-${suffix}${extension}`
      suffix += 1
    }
    used.add(candidate.toLowerCase())
    return candidate
  })
}
