import type { DeckDocumentCard } from "./importExportTypes"

export interface TableCell {
  value: string
  start: number
  end: number
}

// Keep cell offsets so the plugin can update ratings without rewriting Markdown.
export function tableCells(line: string): TableCell[] {
  const separators: number[] = []
  for (let index = 0; index < line.length; index += 1) {
    let tokenEnd = -1
    if (line.startsWith("[[", index)) {
      const closing = line.indexOf("]]", index + 2)
      if (closing >= 0) tokenEnd = closing + 2
    } else if (line[index] === "[") {
      const link = line.slice(index).match(/^\[[^\]\n]*\]\([^)\n]*\)/)
      if (link) tokenEnd = index + link[0].length
    } else if (line[index] === "`") {
      const marker = line.slice(index).match(/^`+/)![0]
      const closing = line.indexOf(marker, index + marker.length)
      if (closing >= 0) tokenEnd = closing + marker.length
    } else if (line[index] === "$") {
      const closing = line.indexOf("$", index + 1)
      if (closing >= 0) tokenEnd = closing + 1
    } else if (line.startsWith("\\(", index)) {
      const closing = line.indexOf("\\)", index + 2)
      if (closing >= 0) tokenEnd = closing + 2
    }
    if (tokenEnd >= 0) {
      index = tokenEnd - 1
      continue
    }
    if (line[index] === "\\") {
      index += 1
      continue
    }
    if (line[index] === "|") separators.push(index)
  }

  let start = 0
  let end = line.length
  if (separators[0] === line.search(/\S/)) start = separators.shift()! + 1
  if (separators[separators.length - 1] === line.trimEnd().length - 1)
    end = separators.pop()!
  const cells: TableCell[] = []
  for (const separator of [...separators, end]) {
    cells.push({
      value: line.slice(start, separator).trim(),
      start,
      end: separator,
    })
    start = separator + 1
  }
  return cells
}

export function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)
}

export function unescapeTableCell(value: string): string {
  return value
    .replace(/\\\|/g, "|")
    .replace(/<br\s*\/?>/gi, "\n")
    .trim()
}

export function parseTableCard(
  line: string,
  columnCount: number,
): DeckDocumentCard | null {
  const cells = tableCells(line).map((cell) => cell.value)
  if (cells.every((cell) => !unescapeTableCell(cell))) return null

  const hasDifficulty = columnCount >= 3
  const hasDifficultyCell = hasDifficulty && cells.length >= columnCount
  const answerCells = cells.slice(1, hasDifficultyCell ? -1 : undefined)
  // Older single-answer tables allowed unescaped pipes in answer text.
  const answers = columnCount <= 3 ? [answerCells.join("|")] : answerCells
  const rating = hasDifficultyCell
    ? Number(unescapeTableCell(cells[cells.length - 1]))
    : 0
  const question = unescapeTableCell(cells[0] ?? "")
  const answerParts = answers
    .map((cell, columnIndex) => ({
      content: unescapeTableCell(cell),
      columnIndex,
    }))
    .filter((part) => part.content)
  const card: DeckDocumentCard = {
    question,
    answer: answerParts.map((part) => part.content).join("\n\n"),
    difficulty:
      Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0,
  }
  if (
    columnCount > 3 ||
    /!\[\[[^\]]+\]\]|!\[[^\]]*\]\([^)]+\)/.test(question)
  ) {
    card.answerParts = answerParts
  }
  return card
}
