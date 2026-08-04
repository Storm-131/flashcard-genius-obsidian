import { ImportExportError } from './errors'
import type { DeckDocument, DeckDocumentTopic } from './importExportTypes'

function splitTableRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  const normalized = line.trim().replace(/^\||\|$/g, '')
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]
    if (character === '\\' && normalized[index + 1] === '|') {
      current += '\\|'
      index += 1
      continue
    }
    if (character === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += character
  }
  cells.push(current.trim())
  return cells
}

function unescapeTableCell(value: string): string {
  return value
    .replace(/\\\|/g, '|')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim()
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)
}

function isDifficultyHeader(value: string): boolean {
  return value.replace(/[\uFE0E\uFE0F]/g, '').trim() === '⭐'
}

function normalizeTopicName(value: string): string {
  const trimmed = value.trim()
  return trimmed.toLocaleLowerCase() === 'allgemein' ? 'General' : trimmed
}

function parseDifficulty(value: string): number {
  const normalized = value.trim()
  if (!normalized) return 0
  const difficulty = Number(normalized)
  return Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5 ? difficulty : 0
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
    if (currentQuestion.trim() && answer) ensureTopic().cards.push({ question: currentQuestion.trim(), answer, difficulty: 0 })
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

    const header = splitTableRow(lines[index])
    if (header.length < 2) {
      problems.push('A card table requires Question and Answer columns.')
      continue
    }
    const difficultyColumnIndex = header.length >= 3 && isDifficultyHeader(header[header.length - 1])
      ? header.length - 1
      : -1
    index += 2
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const cells = splitTableRow(lines[index])
      if (cells.length < 2) {
        problems.push('A table row does not contain both a question and an answer.')
      } else {
        const question = unescapeTableCell(cells[0])
        const answerCells = difficultyColumnIndex >= 0 ? cells.slice(1, -1) : cells.slice(1)
        const answer = unescapeTableCell(answerCells.join('|'))
        const difficulty = difficultyColumnIndex >= 0
          ? parseDifficulty(unescapeTableCell(cells[cells.length - 1] ?? ''))
          : 0
        if (!question) problems.push('A card has no question.')
        if (!answer) problems.push(`The card "${question || 'Untitled'}" has no answer.`)
        if (question && answer) currentTopic.cards.push({ question, answer, difficulty })
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
