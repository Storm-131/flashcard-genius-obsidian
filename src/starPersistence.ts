import type { App } from 'obsidian'
import { TFile } from 'obsidian'
import { parseDeckMarkdown } from '@flashcard-genius/core'
import type { CardSource } from './vaultLoader'

export class StarPersistenceError extends Error {}

export class StarConflictError extends StarPersistenceError {}

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
  return value.replace(/\\\|/g, '|').replace(/<br\s*\/?>/gi, '\n').trim()
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)
}

function isDifficultyHeader(value: string): boolean {
  return value.replace(/[\uFE0E\uFE0F]/g, '').trim() === '⭐'
}

function flattenDocumentCards(markdown: string, fileName: string) {
  return parseDeckMarkdown(markdown, fileName).topics.flatMap(topic => topic.cards)
}

function replaceDifficultyCell(line: string, difficulty: number): string {
  const separators: number[] = []
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '|' && line[index - 1] !== '\\') separators.push(index)
  }
  if (separators.length < 3) throw new StarPersistenceError('The card row has no writable star column.')

  const cellStart = separators[separators.length - 2] + 1
  const cellEnd = separators[separators.length - 1]
  const originalCell = line.slice(cellStart, cellEnd)
  const leadingWhitespace = originalCell.match(/^\s*/)?.[0] ?? ''
  const trailingWhitespace = originalCell.match(/\s*$/)?.[0] ?? ''
  return `${line.slice(0, cellStart)}${leadingWhitespace}${difficulty}${trailingWhitespace}${line.slice(cellEnd)}`
}

function updateDifficultyInMarkdown(markdown: string, source: CardSource, difficulty: number): string {
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  let cardIndex = 0

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith('|') || !isTableDivider(lines[index + 1] ?? '')) continue

    const header = splitTableRow(lines[index])
    const hasDifficultyColumn = header.length >= 3 && isDifficultyHeader(header[header.length - 1])
    index += 2

    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const cells = splitTableRow(lines[index])
      const question = unescapeTableCell(cells[0] ?? '')
      const answerCells = hasDifficultyColumn ? cells.slice(1, -1) : cells.slice(1)
      const answer = unescapeTableCell(answerCells.join('|'))
      if (question && answer) {
        if (cardIndex === source.cardIndex) {
          if (!hasDifficultyColumn) throw new StarPersistenceError('This card table has no final ⭐ column.')
          lines[index] = replaceDifficultyCell(lines[index], difficulty)
          return lines.join(newline)
        }
        cardIndex += 1
      }
      index += 1
    }
    index -= 1
  }

  throw new StarPersistenceError('The card row could not be found in the Markdown file.')
}

export async function persistCardDifficulty(
  app: App,
  source: CardSource,
  expectedContent: string,
  difficulty: number,
): Promise<string> {
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    throw new StarPersistenceError('The difficulty must be a number from 1 to 5.')
  }

  const abstractFile = app.vault.getAbstractFileByPath(source.filePath)
  if (!(abstractFile instanceof TFile)) throw new StarPersistenceError('The source Markdown file no longer exists.')

  const currentContent = await app.vault.cachedRead(abstractFile)
  if (currentContent !== expectedContent) {
    throw new StarConflictError('The Markdown file changed outside Flashcard Genius. The deck was reloaded without writing your star change.')
  }

  const cards = flattenDocumentCards(currentContent, abstractFile.name)
  const currentCard = cards[source.cardIndex]
  if (
    !currentCard
    || currentCard.question !== source.question
    || currentCard.answer !== source.answer
    || currentCard.difficulty !== source.difficulty
  ) {
    throw new StarConflictError('The card changed outside Flashcard Genius. The deck was reloaded without writing your star change.')
  }

  const updatedContent = updateDifficultyInMarkdown(currentContent, source, difficulty)
  await app.vault.modify(abstractFile, updatedContent)
  return updatedContent
}
