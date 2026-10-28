import { useId, useState, type CSSProperties } from 'react'
import type { Card } from '../types'

interface Props {
  cards: Card[]
  showStars: boolean
  onClick: () => void
  style: CSSProperties
}

const missingColumnHint = 'These decks have no rating column. Name the last column ⭐, *, or Difficulty.'

export default function StarsToggleButton({ cards, showStars, onClick, style }: Props) {
  const disabled = !cards.some(card => card.hasDifficultyColumn !== false)
  const hintId = useId()
  const [hintVisible, setHintVisible] = useState(false)

  return (
    <span
      tabIndex={disabled ? 0 : undefined}
      aria-label={disabled ? 'Stars unavailable' : undefined}
      aria-describedby={disabled ? hintId : undefined}
      onMouseEnter={() => setHintVisible(true)}
      onMouseLeave={() => setHintVisible(false)}
      onFocus={() => setHintVisible(true)}
      onBlur={() => setHintVisible(false)}
      onKeyDown={event => { if (event.key === 'Escape') setHintVisible(false) }}
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={!disabled && showStars}
        aria-describedby={disabled ? hintId : undefined}
        title={disabled ? undefined : showStars ? 'Hide card stars' : 'Show card stars'}
        onClick={() => { if (!disabled) onClick() }}
        style={{
          ...style,
          flex: 1,
          ...(disabled ? {
            background: '#FAFAF8',
            borderColor: '#E2DED4',
            color: '#9B9488',
            opacity: 0.6,
            cursor: 'not-allowed',
            pointerEvents: 'none',
          } : {}),
        }}
      >
        Stars
      </button>
      {disabled && (
        <span
          id={hintId}
          role="tooltip"
          hidden={!hintVisible}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 50,
            width: '240px',
            maxWidth: 'calc(100vw - 32px)',
            padding: '8px 10px',
            border: '1px solid #E2DED4',
            borderRadius: '6px',
            background: '#FFFFFF',
            color: '#6B6560',
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            fontSize: 'calc(11px * var(--app-ui-font-scale, 1.125))',
            fontWeight: 400,
            lineHeight: 1.4,
            whiteSpace: 'normal',
          }}
        >
          {missingColumnHint}
        </span>
      )}
    </span>
  )
}
