import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MarkdownRenderContext } from '../markdownRenderer'
import MarkdownContent from './MarkdownContent'

interface Props {
  content: string
  overflow: boolean
  markdownContext?: MarkdownRenderContext
  sourcePath?: string
}

export default function CardQuestion({ content, overflow, markdownContext, sourcePath }: Props) {
  const [expanded, setExpanded] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  useEffect(() => { if (expanded) dialogRef.current?.focus() }, [expanded])
  const close = () => { setExpanded(false); buttonRef.current?.focus() }
  return (
    <div ref={rootRef} className={`question-fit-slot${overflow ? ' is-overflowing' : ''}`}>
      <div data-fit-question className="card-question-text">
        <MarkdownContent content={content} markdownContext={markdownContext} sourcePath={sourcePath} style={{ fontSize: 'inherit', color: 'inherit', lineHeight: 'inherit' }} />
      </div>
      {overflow && <button ref={buttonRef} type="button" className="question-overflow-button" onClick={event => { event.stopPropagation(); setExpanded(true) }}>Read full question</button>}
      {expanded && createPortal(
        <div className="question-dialog-backdrop" onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) close() }}>
          <div ref={dialogRef} className="question-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
            <h2 id={titleId}>Full question</h2>
            <button type="button" onClick={close} aria-label="Close full question">Close</button>
            <MarkdownContent content={content} markdownContext={markdownContext} sourcePath={sourcePath} />
          </div>
        </div>, rootRef.current?.closest('.flashcard-genius-root') ?? document.body,
      )}
    </div>
  )
}
