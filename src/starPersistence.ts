import type { App } from 'obsidian'
import { TFile } from 'obsidian'
import { parseDeckMarkdown } from '@flashcard-genius/core'
import { isTableDivider, parseTableCard, tableCells } from '@flashcard-genius/core/markdownTable'
import type { CardSource } from './vaultLoader'

export class StarPersistenceError extends Error {}

export class StarConflictError extends StarPersistenceError {}

function flattenDocumentCards(markdown: string, fileName: string) {
  return parseDeckMarkdown(markdown, fileName).topics.flatMap(topic => topic.cards)
}

function replaceDifficultyCell(line: string, difficulty: number): string {
  const cell = tableCells(line).slice(-1)[0]
  if (!cell) throw new StarPersistenceError('The card row has no writable difficulty column.')
  const originalCell = line.slice(cell.start, cell.end)
  const [, leadingWhitespace, , trailingWhitespace] = originalCell.match(/^(\s*)(.*?)(\s*)$/)!
  return `${line.slice(0, cell.start)}${leadingWhitespace}${difficulty}${trailingWhitespace}${line.slice(cell.end)}`
}

function updateDifficultyInMarkdown(markdown: string, source: CardSource, difficulty: number): string {
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  let cardIndex = 0

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith('|') || !isTableDivider(lines[index + 1] ?? '')) continue

    const columnCount = tableCells(lines[index]).length
    const hasDifficultyColumn = columnCount >= 3
    index += 2

    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const card = parseTableCard(lines[index], columnCount)
      if (card?.question && card.answer) {
        if (cardIndex === source.cardIndex) {
          if (!hasDifficultyColumn || tableCells(lines[index]).length < columnCount) {
            throw new StarPersistenceError('This card table has no final difficulty cell. Add the missing column or cell in Obsidian first.')
          }
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
