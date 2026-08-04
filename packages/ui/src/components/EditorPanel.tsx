import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import DifficultyStars from './DifficultyStars'
import { useImageAssets } from '../images/ImageAssetsContext'
import { extractMarkdownImages, hasMarkdownImages, removeMarkdownImage, type MarkdownImageReference } from '../images/markdownImages'
import type { Card } from '../types'
import MarkdownImage from './MarkdownImage'

interface Props {
  card: Card | null
  onSave: (updated: Card) => void
  onDelete: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function IconImage() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="7.5" r="1.5" fill="currentColor" opacity="0.5" />
      <path d="M2 14L6 10L9 13L13 8L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 3.5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 3.5V2H8V3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 3.5L4 10.5H9L9.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconChevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d={direction === 'left' ? 'M8.5 2.5L4 7L8.5 11.5' : 'M5.5 2.5L10 7L5.5 11.5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type MarkdownAction = 'bold' | 'italic' | 'underline' | 'bullet' | 'ordered' | 'link' | 'code'

function MarkdownToolbar({ onFormat }: { onFormat: (action: MarkdownAction) => void }) {
  const buttons: { action: MarkdownAction; label: string; title: string }[] = [
    { action: 'bold', label: 'B', title: 'Bold' },
    { action: 'italic', label: 'I', title: 'Italic' },
    { action: 'underline', label: 'U', title: 'Underline' },
    { action: 'bullet', label: '•', title: 'Bullet list' },
    { action: 'ordered', label: '1.', title: 'Numbered list' },
    { action: 'link', label: '↗', title: 'Link' },
    { action: 'code', label: '</>', title: 'Code' },
  ]

  return (
    <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
      {buttons.map(button => (
        <button
          className="editor-collapse-control"
          key={button.action}
          type="button"
          title={button.title}
          aria-label={button.title}
          onMouseDown={event => event.preventDefault()}
          onClick={() => onFormat(button.action)}
          style={{ minWidth: '25px', height: '24px', padding: '0 5px', borderRadius: '5px', border: '1px solid #E2DED4', background: '#FAFAF8', color: '#6B6560', cursor: 'pointer', fontSize: button.action === 'italic' ? '13px' : '11px', fontStyle: button.action === 'italic' ? 'italic' : 'normal', fontWeight: button.action === 'bold' ? 700 : 500, fontFamily: 'inherit' }}
        >
          {button.label}
        </button>
      ))}
    </div>
  )
}

function toggleInline(text: string, prefix: string, suffix = prefix): string {
  return text.startsWith(prefix) && text.endsWith(suffix) && text.length >= prefix.length + suffix.length
    ? text.slice(prefix.length, -suffix.length)
    : `${prefix}${text}${suffix}`
}

function toggleList(text: string, ordered: boolean): string {
  const lines = text.split('\n')
  const pattern = ordered ? /^\d+\.\s+/ : /^[-*+]\s+/
  if (lines.every(line => pattern.test(line))) return lines.map(line => line.replace(pattern, '')).join('\n')
  return lines.map((line, index) => ordered ? `${index + 1}. ${line}` : `- ${line}`).join('\n')
}

export default function EditorPanel({ card, onSave, onDelete, collapsed, onToggleCollapse }: Props) {
  const { storage } = useImageAssets()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [difficulty, setDifficulty] = useState(0)
  const [imageAsQuestion, setImageAsQuestion] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const answerRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftRef = useRef({ question: '', answer: '', difficulty: 0, imageAsQuestion: false })
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (card) {
      setQuestion(card.question)
      setAnswer(card.answer)
      setDifficulty(card.difficulty ?? 0)
      setImageAsQuestion(card.imageAsQuestion ?? false)
      setUploadError(null)
      draftRef.current = {
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty ?? 0,
        imageAsQuestion: card.imageAsQuestion ?? false,
      }
      dirtyRef.current = false
    }
  }, [card?.id, card?.question, card?.answer, card?.difficulty, card?.imageAsQuestion])

  const persistDraft = () => {
    if (!card || !dirtyRef.current) return
    onSave({ ...card, ...draftRef.current })
    dirtyRef.current = false
  }

  useEffect(() => {
    const cardToSave = card
    return () => {
      if (cardToSave && dirtyRef.current) {
        onSave({ ...cardToSave, ...draftRef.current })
        dirtyRef.current = false
      }
    }
  }, [card?.id])

  const handleToggleCollapse = () => {
    persistDraft()
    onToggleCollapse()
  }

  const applyMarkdown = (field: 'question' | 'answer', action: MarkdownAction) => {
    const textarea = field === 'question' ? questionRef.current : answerRef.current
    const value = field === 'question' ? question : answer
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end) || 'text'
    let replacement = selected

    if (action === 'bold') replacement = toggleInline(selected, '**')
    if (action === 'italic') {
      replacement = selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**') && !selected.endsWith('**')
        ? selected.slice(1, -1)
        : `*${selected}*`
    }
    if (action === 'underline') replacement = toggleInline(selected, '++')
    if (action === 'code') replacement = toggleInline(selected, '`')
    if (action === 'link') {
      const existingLink = selected.match(/^\[([^\]]+)\]\([^)]+\)$/)
      if (existingLink) replacement = existingLink[1]
      else {
        const url = window.prompt('Link URL:')
        if (!url) return
        replacement = `[${selected}](${url})`
      }
    }
    if (action === 'bullet') replacement = toggleList(selected, false)
    if (action === 'ordered') replacement = toggleList(selected, true)

    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`
    if (field === 'question') {
      setQuestion(nextValue)
      draftRef.current.question = nextValue
    } else {
      setAnswer(nextValue)
      draftRef.current.answer = nextValue
    }
    dirtyRef.current = true

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + replacement.length)
    })
  }

  const addImageToAnswer = (file: File) => {
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
    if (!allowedTypes.has(file.type)) {
      setUploadError('Choose a PNG, JPG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('The image must not exceed 5 MB.')
      return
    }

    const asset = storage.store(file, file.name)
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const altText = baseName.replace(/[-_]+/g, ' ').trim() || 'Flashcard image'
    const markdown = `![${altText}](${asset.path})`
    const textarea = answerRef.current
    const start = textarea?.selectionStart ?? answer.length
    const end = textarea?.selectionEnd ?? answer.length
    const before = answer.slice(0, start)
    const after = answer.slice(end)
    const leadingBreak = before && !before.endsWith('\n') ? '\n\n' : ''
    const trailingBreak = after && !after.startsWith('\n') ? '\n\n' : ''
    const insertion = `${leadingBreak}${markdown}${trailingBreak}`
    const nextAnswer = `${before}${insertion}${after}`

    setAnswer(nextAnswer)
    draftRef.current.answer = nextAnswer
    dirtyRef.current = true
    setUploadError(null)

    requestAnimationFrame(() => {
      textarea?.focus()
      const cursor = start + insertion.length
      textarea?.setSelectionRange(cursor, cursor)
    })
  }

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) addImageToAnswer(file)
    event.target.value = ''
  }

  const handleImageDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) addImageToAnswer(file)
  }

  const deleteImageFromAnswer = (image: MarkdownImageReference) => {
    const nextAnswer = removeMarkdownImage(answer, image)
    setAnswer(nextAnswer)
    draftRef.current.answer = nextAnswer
    if (!extractMarkdownImages(nextAnswer).some(remainingImage => remainingImage.path === image.path)) {
      storage.delete(image.path)
    }
    if (!hasMarkdownImages(nextAnswer)) {
      setImageAsQuestion(false)
      draftRef.current.imageAsQuestion = false
    }
    dirtyRef.current = true
  }

  if (collapsed) {
    return (
      <aside
        style={{
          width: '36px',
          flexShrink: 0,
          background: '#FFFFFF',
          borderLeft: '1px solid #E2DED4',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '10px',
        }}
      >
        <button
          className="editor-collapse-control"
          onClick={handleToggleCollapse}
          title="Expand card editor"
          aria-label="Expand card editor"
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            border: '1px solid #E2DED4',
            background: '#FFFFFF',
            color: '#6B6560',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconChevron direction="right" />
        </button>
      </aside>
    )
  }

  if (!card) {
    return (
      <aside
        style={{
          width: '288px',
          flexShrink: 0,
          background: '#FFFFFF',
          borderLeft: '1px solid #E2DED4',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '24px',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: '#F0EDE6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="#C8C4B8" strokeWidth="1.5" />
            <line x1="8" y1="10" x2="16" y2="10" stroke="#C8C4B8" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="14" x2="13" y2="14" stroke="#C8C4B8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p style={{ fontSize: '12.5px', color: '#9B9488', textAlign: 'center', lineHeight: '1.5', margin: 0 }}>
          Select a card to<br />edit its contents
        </p>
        <button
          onClick={handleToggleCollapse}
          title="Collapse card editor"
          aria-label="Collapse card editor"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            border: '1px solid #E2DED4',
            background: 'transparent',
            color: '#6B6560',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconChevron direction="left" />
        </button>
      </aside>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: '7px',
    border: '1px solid #E2DED4',
    padding: '8px 10px',
    fontSize: '12.5px',
    color: '#111110',
    background: '#FAFAF8',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    resize: 'none' as const,
    transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '10.5px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: '#9B9488',
    marginBottom: '5px',
    display: 'block',
  }
  const cardHasImage = hasMarkdownImages(answer)
  const answerImages = extractMarkdownImages(answer)

  return (
    <aside
      style={{
        width: '288px',
        flexShrink: 0,
        background: '#FFFFFF',
        borderLeft: '1px solid #E2DED4',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #F0EDE6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#111110' }}>Card Editor</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="editor-collapse-control"
            onClick={handleToggleCollapse}
            title="Collapse card editor"
            aria-label="Collapse card editor"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: '1px solid #E2DED4',
              background: 'transparent',
              color: '#6B6560',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconChevron direction="left" />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Question */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Question</label>
          <MarkdownToolbar onFormat={action => applyMarkdown('question', action)} />
          <textarea
            ref={questionRef}
            rows={3}
            value={question}
            aria-label="Question"
            onChange={e => {
              const value = e.target.value
              setQuestion(value)
              draftRef.current.question = value
              dirtyRef.current = true
            }}
            style={inputStyle}
            onFocus={e => ((e.target as HTMLElement).style.borderColor = '#4F46E5')}
            onBlur={e => ((e.target as HTMLElement).style.borderColor = '#E2DED4')}
          />
        </div>

        {/* Answer */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Answer</label>
          <MarkdownToolbar onFormat={action => applyMarkdown('answer', action)} />
          <textarea
            ref={answerRef}
            rows={5}
            value={answer}
            aria-label="Answer"
            onChange={e => {
              const value = e.target.value
              setAnswer(value)
              draftRef.current.answer = value
              if (!hasMarkdownImages(value) && draftRef.current.imageAsQuestion) {
                setImageAsQuestion(false)
                draftRef.current.imageAsQuestion = false
              }
              dirtyRef.current = true
            }}
            style={inputStyle}
            onFocus={e => ((e.target as HTMLElement).style.borderColor = '#4F46E5')}
            onBlur={e => ((e.target as HTMLElement).style.borderColor = '#E2DED4')}
          />
        </div>

        {/* Image upload */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileSelection}
            style={{ display: 'none' }}
            aria-label="Choose image file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={event => event.preventDefault()}
            onDrop={handleImageDrop}
            style={{
              width: '100%',
              border: '1.5px dashed #D8D4C8',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: '#FAFAF8',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#9B9488'
              el.style.background = '#F0EDE6'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#D8D4C8'
              el.style.background = '#FAFAF8'
            }}
          >
            <span style={{ color: '#C8C4B8' }}>
              <IconImage />
            </span>
            <span style={{ fontSize: '11.5px', color: '#9B9488', textAlign: 'center' }}>
              Drop image or click to upload
            </span>
            <span style={{ fontSize: '10.5px', color: '#C8C4B8' }}>PNG, JPG, WebP up to 5MB</span>
          </button>
          {uploadError && (
            <p role="alert" style={{ margin: '6px 0 0', color: '#DC2626', fontSize: '10.5px', lineHeight: 1.4 }}>
              {uploadError}
            </p>
          )}
          {answerImages.length > 0 && (
            <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
              <span style={{ ...labelStyle, margin: 0 }}>Images in this answer</span>
              {answerImages.map(image => (
                <div key={`${image.start}-${image.path}`} style={{ position: 'relative', border: '1px solid #E2DED4', borderRadius: '8px', padding: '5px', background: '#FFFFFF' }}>
                  <MarkdownImage path={image.path} alt={image.alt} />
                  <button
                    type="button"
                    onClick={() => deleteImageFromAnswer(image)}
                    aria-label={`Delete image: ${image.alt || image.path}`}
                    title="Delete image"
                    style={{
                      position: 'absolute',
                      right: '11px',
                      top: '11px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1px solid #FCA5A5',
                      background: 'rgba(255, 255, 255, 0.92)',
                      color: '#DC2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconTrash />
                  </button>
                  <span style={{ display: 'block', padding: '1px 4px 3px', color: '#6B6560', fontSize: '10.5px', overflowWrap: 'anywhere' }}>
                    {image.path}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Difficulty</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DifficultyStars
              value={difficulty}
              onChange={value => {
                setDifficulty(value)
                draftRef.current.difficulty = value
                dirtyRef.current = true
              }}
            />
            <button
              type="button"
              onClick={() => { setDifficulty(0); draftRef.current.difficulty = 0; dirtyRef.current = true }}
              disabled={difficulty === 0}
              style={{ height: '26px', padding: '0 8px', borderRadius: '5px', border: '1px solid #E2DED4', background: 'transparent', color: difficulty === 0 ? '#C8C4B8' : '#6B6560', cursor: difficulty === 0 ? 'not-allowed' : 'pointer', fontSize: '11px', fontFamily: 'inherit' }}
            >
              Clear stars
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #F0EDE6',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={persistDraft}
          style={{
            flex: 1,
            height: '34px',
            borderRadius: '7px',
            border: 'none',
            background: '#4F46E5',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          Save card
        </button>
        <button
          type="button"
          onClick={() => onDelete(card.id)}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '7px',
            border: '1px solid #E2DED4',
            background: 'transparent',
            color: '#9B9488',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#FEF2F2'
            el.style.borderColor = '#FCA5A5'
            el.style.color = '#DC2626'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.borderColor = '#E2DED4'
            el.style.color = '#9B9488'
          }}
          title="Delete card"
          aria-label="Delete card"
        >
          <IconTrash />
        </button>
        {cardHasImage && (
          <button
            type="button"
            role="switch"
            aria-checked={imageAsQuestion}
            onClick={() => {
              const nextValue = !imageAsQuestion
              setImageAsQuestion(nextValue)
              draftRef.current.imageAsQuestion = nextValue
              onSave({ ...card, ...draftRef.current })
              dirtyRef.current = false
            }}
            style={{
              minHeight: '34px',
              padding: '0 10px',
              borderRadius: '7px',
              border: `1px solid ${imageAsQuestion ? '#4F46E5' : '#E2DED4'}`,
              background: imageAsQuestion ? '#EEF2FF' : 'transparent',
              color: imageAsQuestion ? '#4338CA' : '#6B6560',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '24px',
                height: '14px',
                padding: '2px',
                boxSizing: 'border-box',
                borderRadius: '999px',
                background: imageAsQuestion ? '#4F46E5' : '#C8C4B8',
                display: 'flex',
                justifyContent: imageAsQuestion ? 'flex-end' : 'flex-start',
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFFFFF' }} />
            </span>
            Image as question
          </button>
        )}
      </div>
    </aside>
  )
}
