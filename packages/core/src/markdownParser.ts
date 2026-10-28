import { ImportExportError } from './errors'
import type { DeckDocument, DeckDocumentTopic } from './importExportTypes'
import { isTableDivider, parseTableCard, tableCells } from './markdownTable'

function normalizeTopicName(value: string): string {
  const trimmed = value.trim()
  return trimmed.toLocaleLowerCase() === 'allgemein' ? 'General' : trimmed
}

const legacyDelimiterPattern = /^\s*-\s+-\s+-\s*$/

function parseLegacyTopics(lines: string[]): DeckDocumentTopic[] {
  const topics: DeckDocumentTopic[] = []
  let currentTopic: DeckDocumentTopic | null = null
  let currentQuestion: string | null = null
  let answerLines: string[] = []

  const ensureTopic = () => {
    if (!currentTopic) {
      currentTopic = { name: 'General', cards: [] }
      topics.push(currentTopic)
    }
    return currentTopic
  }
  const finishCard = () => {
    if (currentQuestion === null) return
    const answer = answerLines.join('\n').trim()
    if (currentQuestion.trim() && answer) ensureTopic().cards.push({ question: currentQuestion.trim(), answer, difficulty: 0, hasDifficultyColumn: false })
    currentQuestion = null
    answerLines = []
  }

  for (const line of lines) {
    if (legacyDelimiterPattern.test(line)) {
      finishCard()
      continue
    }
    const topicMatch = line.match(/^##\s+(.+)$/)
    if (topicMatch && !line.startsWith('###')) {
      finishCard()
      currentTopic = { name: normalizeTopicName(topicMatch[1]) || 'General', cards: [] }
      topics.push(currentTopic)
      continue
    }
    const questionMatch = line.match(/^####\s+(.+)$/)
    if (questionMatch) {
      finishCard()
      const question = questionMatch[1].trim()
      currentQuestion = question.startsWith('**') && question.endsWith('**') ? question.slice(2, -2).trim() : question
      continue
    }
    if (currentQuestion !== null) answerLines.push(line)
  }
  finishCard()
  return topics.filter(topic => topic.cards.length > 0)
}

export function parseDeckMarkdown(markdown: string, sourceFileName?: string): DeckDocument {
  const lines = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')
  const titleLine = lines.find(line => /^#\s+/.test(line) && !/^##/.test(line))
  const title = titleLine?.replace(/^#\s+/, '').trim() ?? ''
  const problems: string[] = []

  if (!title) problems.push('An H1 heading for the deck title is missing.')

  const topics: DeckDocumentTopic[] = []
  let currentTopic: DeckDocumentTopic | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const topicMatch = lines[index].match(/^##\s+(.+)$/)
    if (topicMatch && !lines[index].startsWith('###')) {
      const name = normalizeTopicName(topicMatch[1])
      if (!name) problems.push('An H2 subtopic has no name.')
      currentTopic = { name: name || 'General', cards: [] }
      topics.push(currentTopic)
      continue
    }

    if (!lines[index].trim().startsWith('|') || !isTableDivider(lines[index + 1] ?? '')) continue
    if (!currentTopic) {
      currentTopic = { name: 'General', cards: [] }
      topics.push(currentTopic)
    }

    const header = tableCells(lines[index])
    if (header.length < 2) {
      problems.push('A card table requires Question and Answer columns.')
      continue
    }
    index += 2
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const card = parseTableCard(lines[index], header)
      if (card) {
        if (!card.question) problems.push('A card has no question.')
        if (!card.answer) problems.push(`The card "${card.question || 'Untitled'}" has no answer.`)
        if (card.question && card.answer) currentTopic.cards.push(card)
      }
      index += 1
    }
    index -= 1
  }

  let populatedTopics = topics.filter(topic => topic.cards.length > 0)
  if (populatedTopics.length === 0) populatedTopics = parseLegacyTopics(lines)
  if (populatedTopics.length === 0) problems.push('No cards were found in Markdown tables.')

  if (problems.length > 0) {
    throw new ImportExportError(
      sourceFileName ? `"${sourceFileName}" does not match the deck format.` : 'The Markdown does not match the deck format.',
      problems,
    )
  }

  return { title, topics: populatedTopics, sourceFileName }
}
