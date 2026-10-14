import { useEffect, useState } from 'react'

const storageKey = 'flashcard-genius.card-font-size'

function normalizeFontSize(value: number): number {
  return Number.isFinite(value) ? Math.min(160, Math.max(70, value)) : 100
}

export function useCardFontSize() {
  const [fontSize, setFontSize] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      return saved === null ? 100 : normalizeFontSize(Number(saved))
    } catch {
      return 100
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(fontSize))
    } catch {
      // Storage may be unavailable in the host.
    }
  }, [fontSize])

  return [fontSize, (value: number) => setFontSize(normalizeFontSize(value))] as const
}

export default function CardFontSizeControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label style={{ display: 'grid', gap: '4px', marginTop: '12px', fontSize: 'calc(11px * var(--app-ui-font-scale, 1.125))', color: '#6B6560' }}>
      Font size: {value}%
      <input
        type="range" min="70" max="160" step="5" value={value}
        aria-label="Card font size"
        onChange={event => onChange(Number(event.target.value))}
        style={{ width: '100%', accentColor: 'var(--app-accent, #059669)' }}
      />
    </label>
  )
}
