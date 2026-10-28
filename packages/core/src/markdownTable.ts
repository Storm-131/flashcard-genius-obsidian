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

// Match only an explicit final header, never the contents of a card row.
export function hasDifficultyColumn(header: readonly TableCell[]): boolean {
  if (header.length < 3) return false
  const name = header[header.length - 1].value
    .replace(/[\uFE0E\uFE0F]/g, "")
    .trim()
    .toLowerCase()
  return ["⭐", "★", "*", "sterne", "stars", "schwierigkeit", "difficulty", "rating"].includes(name)
}

export function parseTableCard(
  line: string,
  header: readonly TableCell[],
): DeckDocumentCard | null {
  const cells = tableCells(line).map((cell) => cell.value)
  if (cells.every((cell) => !unescapeTableCell(cell))) return null

  const columnCount = header.length
  const hasDifficulty = hasDifficultyColumn(header)
  const answerColumnCount = columnCount - 1 - Number(hasDifficulty)
  const hasDifficultyCell = hasDifficulty && cells.length >= columnCount
  const answerCells = cells.slice(1, hasDifficultyCell ? -1 : undefined)
  // Older single-answer tables allowed unescaped pipes in answer text.
  const answers = answerColumnCount === 1 ? [answerCells.join("|")] : answerCells
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
    hasDifficultyColumn: hasDifficulty,
    difficulty:
      Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0,
  }
  if (
    answerColumnCount > 1 ||
    /!\[\[[^\]]+\]\]|!\[[^\]]*\]\([^)]+\)/.test(question)
  ) {
    card.answerParts = answerParts
  }
  return card
}
