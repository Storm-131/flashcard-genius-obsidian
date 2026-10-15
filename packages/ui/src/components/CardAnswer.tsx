import type { CSSProperties } from "react"
import type { Card } from "../types"
import type { MarkdownRenderContext } from "../markdownRenderer"
import MarkdownContent from "./MarkdownContent"
import useFitAnswerText, { useFitStudyAnswerText } from "./useFitAnswerText"

interface Props {
  card: Card
  content: string
  imageQuestion: boolean
  fontScale: number
  markdownContext?: MarkdownRenderContext
  sourcePath: string
  answerVisible?: boolean
  studyImageAnswer?: boolean
}

// Only split simple names (optionally enclosed in one emphasis marker). Leave
// structured Markdown, code, links and math to the original renderer intact.
export function trailingNameLines(content: string): string[] | null {
  const emphasis = content.match(/^(\*\*|__|\*|_)([^\n]+)\1$/)
  const marker = emphasis?.[1] ?? ""
  const text = emphasis?.[2] ?? content
  if (/[\n\r[\]<>`$\\*_]/.test(text)) return null
  const end = text.trimEnd().length
  if (text[end - 1] !== ")") return null
  let depth = 0
  for (let index = end - 1; index >= 0; index--) {
    if (text[index] === ")") depth++
    if (text[index] !== "(") continue
    if (--depth !== 0) continue
    if (index === 0 || !/\s/.test(text[index - 1]) || !text.slice(0, index).trim())
      return null
    return [text.slice(0, index).trimEnd(), text.slice(index)].map(
      (line) => `${marker}${line}${marker}`,
    )
  }
  return null
}

function AnswerPart({
  content,
  columnIndex,
  imageQuestion,
  fontScale,
  markdownContext,
  sourcePath,
  studyImageAnswer,
}: Omit<Props, "card"> & { columnIndex?: number }) {
  const isAdditionalImageColumn = imageQuestion && (columnIndex ?? 0) >= 2
  const ref = useFitAnswerText(
    content,
    imageQuestion && !isAdditionalImageColumn && !studyImageAnswer,
    fontScale,
  )
  // Column positions remain metadata on text cards, but only image cards use
  // the responsive 2 : 1.5 : 1 hierarchy and width fitting.
  const factor = !imageQuestion
    ? "1"
    : columnIndex === 0
      ? "var(--card-answer-primary-scale)"
      : columnIndex === 1
        ? "var(--card-answer-secondary-scale)"
        : "var(--card-answer-other-scale)"
  const lines = studyImageAnswer && (columnIndex ?? 0) === 0
    ? trailingNameLines(content)
    : null
  return (
    <div
      ref={ref}
      className={`card-answer-part${isAdditionalImageColumn ? " image-answer-additional-column" : ""}`}
      data-column-index={columnIndex}
      style={{ "--answer-column-scale": factor } as CSSProperties}
    >
      {(lines ?? [content]).map((line, index) => <MarkdownContent
        key={index}
        content={line}
        markdownContext={markdownContext}
        sourcePath={sourcePath}
        className={imageQuestion
          ? `image-question-answer-part${lines ? " study-name-line" : ""}`
          : undefined}
        style={{ fontSize: "inherit", color: "inherit", lineHeight: "inherit" }}
      />)}
    </div>
  )
}

export default function CardAnswer(props: Props) {
  const { card, content, imageQuestion } = props
  const studyImageAnswer = Boolean(imageQuestion && props.studyImageAnswer)
  const ref = useFitStudyAnswerText(content, studyImageAnswer, props.fontScale, props.answerVisible)
  // Stale metadata is ignored after editing; paragraph breaks are never treated
  // as column boundaries. Old cards without metadata remain one Markdown block.
  const parts =
    card.answerParts?.length &&
    card.answerParts.map((part) => part.content).join("\n\n") === content
      ? card.answerParts
      : [{ content, columnIndex: 0 }]
  const visibleParts = parts.filter((part) => part.content.trim())
  const renderParts = (items: typeof parts) => items.map((part, index) => (
    <AnswerPart
      {...props}
      studyImageAnswer={studyImageAnswer}
      key={`${part.columnIndex ?? "legacy"}-${index}`}
      content={part.content}
      columnIndex={part.columnIndex}
    />
  ))
  const additionalParts = visibleParts.filter((part) => (part.columnIndex ?? 0) >= 2)
  return (
    <div
      ref={ref}
      className={`card-answer-group ${
        imageQuestion ? "image-question-answer" : "text-question-answer"
      }${studyImageAnswer ? " study-image-answer" : ""}`}
      tabIndex={studyImageAnswer ? 0 : undefined}
      role={studyImageAnswer ? "region" : undefined}
      aria-label={studyImageAnswer ? "Image answer; scroll for additional information" : undefined}
    >
      {studyImageAnswer ? <>
        <div className="study-answer-names">
          <div className="study-answer-name-content">
            {renderParts(visibleParts.filter((part) => (part.columnIndex ?? 0) < 2))}
          </div>
        </div>
        {additionalParts.length > 0 && <div className="study-answer-info">
          {renderParts(additionalParts)}
        </div>}
      </> : renderParts(visibleParts)}
    </div>
  )
}
