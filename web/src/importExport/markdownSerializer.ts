import type { Card, Deck, DeckTopic } from '../types'
import type { DeckDocument, DeckDocumentCard } from './types'

function buildDocumentCard(card: Card): DeckDocumentCard {
  return {
    question: card.question,
    answer: card.answer,
    difficulty: card.hasDifficultyColumn === false ? 0 : card.difficulty ?? 0,
    hasDifficultyColumn: card.hasDifficultyColumn,
    answerParts: card.answerParts,
  }
}

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
        .map(buildDocumentCard),
    }))
    .filter(topic => topic.cards.length > 0)
  const unassignedCards = deckCards
    .filter(card => !card.topicId || !knownTopicIds.has(card.topicId))
    .map(buildDocumentCard)

  if (unassignedCards.length > 0) documentTopics.push({ name: 'General', cards: unassignedCards })

  return {
    title: deck.name,
    topics: documentTopics,
    sourceFileName: deck.sourceFileName,
  }
}

export function serializeDeckMarkdown(document: DeckDocument): string {
  const lines: string[] = [`# ${document.title.trim()}`]
  const escapeCell = (value: string) => value.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim()

  for (const topic of document.topics) {
    lines.push(`## ${topic.name.trim() || 'General'}`)
    let previousSchema = ''
    for (const card of topic.cards) {
      // An edited answer may have replaced the original column contents.
      const parts = card.answerParts?.map(part => part.content).join('\n\n') === card.answer
        ? card.answerParts : undefined
      const answerCount = Math.max(1, ...(parts ?? []).map(part => part.columnIndex + 1))
      const answers = Array<string>(answerCount).fill('')
      if (parts) {
        for (const part of parts) answers[part.columnIndex] = part.content
      } else {
        answers[0] = card.answer
      }
      const hasDifficulty = card.hasDifficultyColumn !== false
      const schema = `${answerCount}:${hasDifficulty}`
      if (schema !== previousSchema) {
        if (previousSchema) lines.push('')
        const header = ['Question', ...answers.map((_, index) => index === 0 ? 'Answer' : `Answer ${index + 1}`)]
        if (hasDifficulty) header.push('⭐️')
        lines.push(`| ${header.join(' | ')} |`, `| ${header.map(() => ':---').join(' | ')} |`)
        previousSchema = schema
      }
      const difficulty = Number.isInteger(card.difficulty) && card.difficulty >= 0 && card.difficulty <= 5 ? card.difficulty : 0
      const cells = [card.question, ...answers].map(escapeCell)
      if (hasDifficulty) cells.push(String(difficulty))
      lines.push(`| ${cells.join(' | ')} |`)
    }
  }

  return `${lines.join('\n')}\n`
}

export function uniqueDeckFileNames(documents: DeckDocument[]): string[] {
  const used = new Set<string>()
  return documents.map(document => {
    const sourceFileName = document.sourceFileName?.split(/[\\/]/).pop()?.trim()
    const requested = sourceFileName?.toLowerCase().endsWith('.md')
      ? Array.from(sourceFileName, character =>
        character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character,
      ).join('').replace(/^\.+$/, 'deck.md')
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
