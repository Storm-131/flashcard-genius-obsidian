import { Fragment } from 'react'
import type { Card } from '../types'
import type { MarkdownRenderContext } from '../markdownRenderer'
import MarkdownContent from './MarkdownContent'
import useFitAnswerText from './useFitAnswerText'

interface Props {
  card: Card
  content: string
  imageQuestion: boolean
  fontScale: number
  libraryImageAnswer?: boolean
  markdownContext?: MarkdownRenderContext
  sourcePath: string
}

export default function CardAnswer({ card, content, imageQuestion, fontScale, libraryImageAnswer = false, markdownContext, sourcePath }: Props) {
  // Stale metadata is ignored after editing. Paragraphs inside a cell remain intact.
  const parts = card.answerParts?.length && card.answerParts.map(part => part.content).join('\n\n') === content
    ? card.answerParts
    : [{ content, columnIndex: 0 }]
  const visibleParts = parts.filter(part => part.content.trim())
  const { ref } = useFitAnswerText(content, imageQuestion, fontScale)
  const renderPart = (part: typeof visibleParts[number], index: number) => (
    <Fragment key={`${part.columnIndex}-${index}`}>
      {index > 0 && <div className={`answer-column-divider${index === 1 ? ' is-primary' : ' is-secondary'}`} aria-hidden="true" />}
      <div
        className={`card-answer-part${index === 0 ? ' is-primary-answer' : ''}`}
        data-column-index={part.columnIndex}
        style={imageQuestion ? { fontSize: `calc(var(--image-primary-font-size, var(--image-preferred-font)) * ${Math.pow(0.75, index)})` } : undefined}
      >
        <MarkdownContent content={part.content} markdownContext={markdownContext} sourcePath={sourcePath} style={{ fontSize: 'inherit', color: 'inherit', lineHeight: 'inherit' }} />
      </div>
    </Fragment>
  )
  return (
    <div ref={ref} className={`card-answer-group text-question-answer${imageQuestion ? ' image-card-answer' : ''}${libraryImageAnswer ? ' library-image-answer' : ''}`}>
      {libraryImageAnswer && visibleParts.length > 1 ? <>
        <div className="library-primary-answer">{renderPart(visibleParts[0], 0)}</div>
        <div className="library-additional-answers">{visibleParts.slice(1).map((part, index) => renderPart(part, index + 1))}</div>
      </> : visibleParts.map(renderPart)}
    </div>
  )
}
