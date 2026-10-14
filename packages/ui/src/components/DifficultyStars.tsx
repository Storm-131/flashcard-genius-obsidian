interface Props {
  value: number
  onChange: (value: number) => void
  className?: string
  darkBackground?: boolean
  readOnly?: boolean
}

export default function DifficultyStars({ value, onChange, className, darkBackground = false, readOnly = false }: Props) {
  const ratingColors = ['#16A34A', '#65A30D', '#D97706', '#EA580C', '#DC2626']
  return (
    <div
      className={className}
      role="group"
      aria-label="Difficulty rating"
      style={{ display: 'flex', gap: '1px', alignItems: 'center' }}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const selected = star <= value
        return (
          <button
            key={star}
            type="button"
            aria-label={readOnly ? `${value} out of 5 stars` : `Set difficulty to ${star} out of 5`}
            aria-pressed={selected}
            disabled={readOnly}
            onClick={event => {
              event.stopPropagation()
              if (!readOnly) onChange(star)
            }}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '1px',
              cursor: readOnly ? 'default' : 'pointer',
              color: selected ? ratingColors[Math.max(0, Math.min(4, value - 1))] : darkBackground ? 'rgba(255,255,255,0.42)' : '#D8D4C8',
              fontSize: 'calc(17px * var(--app-ui-font-scale, 1.125))',
              lineHeight: 1,
            }}
          >
            {selected ? '★' : '☆'}
          </button>
        )
      })}
    </div>
  )
}
