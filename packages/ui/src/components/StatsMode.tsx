import { useMemo, useState } from 'react'
import MarkdownContent from './MarkdownContent'
import type { Card, Deck } from '../types'
import type { MarkdownRenderContext } from '../markdownRenderer'

interface Props {
  cards: Card[]
  decks: Deck[]
  onStudyCards: (cards: Card[]) => void
  markdownContext?: MarkdownRenderContext
  cardSourcePaths?: Record<string, string>
}

const difficultyColors = ['#94A3B8', '#38BDF8', '#22C55E', '#FACC15', '#FB923C', '#F43F5E']

function polarPoint(angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180
  return { x: 50 + 42 * Math.cos(radians), y: 50 + 42 * Math.sin(radians) }
}

function PieChart({ counts, onSelect }: { counts: number[]; onSelect: (difficulty: number) => void }) {
  const total = counts.reduce((sum, count) => sum + count, 0)
  let angle = 0

  if (total === 0) {
    return <div style={{ width: '112px', height: '112px', borderRadius: '50%', background: '#F0EDE6' }} />
  }

  return (
    <svg width="112" height="112" viewBox="0 0 100 100" role="img" aria-label="Difficulty distribution">
      {counts.map((count, index) => {
        const start = angle
        const sweep = (count / total) * 360
        angle += sweep
        if (count === 0) return null
        if (sweep >= 359.99) {
          return <circle key={index} cx="50" cy="50" r="42" fill={difficultyColors[index]} onClick={() => onSelect(index)} style={{ cursor: 'pointer' }} />
        }
        const startPoint = polarPoint(start)
        const endPoint = polarPoint(start + sweep)
        const largeArc = sweep > 180 ? 1 : 0
        return (
          <path
            key={index}
            d={`M 50 50 L ${startPoint.x} ${startPoint.y} A 42 42 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`}
            fill={difficultyColors[index]}
            stroke="#FFFFFF"
            strokeWidth="1"
            onClick={() => onSelect(index)}
            style={{ cursor: 'pointer' }}
          />
        )
      })}
    </svg>
  )
}

export default function StatsMode({ cards, decks, onStudyCards, markdownContext, cardSourcePaths }: Props) {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null)
  const [sort, setSort] = useState<{ column: 'question' | 'answer' | 'difficulty'; direction: 'asc' | 'desc' }>({ column: 'question', direction: 'asc' })

  const filteredCards = useMemo(() => {
    const filtered = cards.filter(card =>
      (selectedDeckId === null || card.deckId === selectedDeckId) &&
      (selectedDifficulty === null || (card.difficulty ?? 0) === selectedDifficulty)
    )
    return [...filtered].sort((a, b) => {
      const left = sort.column === 'difficulty' ? a.difficulty ?? 0 : a[sort.column]
      const right = sort.column === 'difficulty' ? b.difficulty ?? 0 : b[sort.column]
      const result = typeof left === 'number' ? left - (right as number) : String(left).localeCompare(String(right))
      return sort.direction === 'asc' ? result : -result
    })
  }, [cards, selectedDeckId, selectedDifficulty, sort])

  const toggleSort = (column: 'question' | 'answer' | 'difficulty') => {
    setSort(previous => ({
      column,
      direction: previous.column === column && previous.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleDeckSelection = (deckId: string) => {
    setSelectedDeckId(previous => previous === deckId ? null : deckId)
    setSelectedDifficulty(null)
  }

  return (
    <main className="stats-mode" style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--flashcard-genius-main, #F7F6F2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'calc(20px * var(--app-ui-font-scale, 1.125))', color: '#111110' }}>Difficulty statistics</h1>
          <p style={{ margin: '4px 0 0', fontSize: 'calc(12px * var(--app-ui-font-scale, 1.125))', color: '#6B6560' }}>Click a set to filter its cards. Click it again to clear the selection.</p>
        </div>
        {(selectedDeckId !== null || selectedDifficulty !== null) && (
          <button onClick={() => { setSelectedDeckId(null); setSelectedDifficulty(null) }} style={{ padding: '7px 10px', border: '1px solid #E2DED4', borderRadius: '6px', background: '#FFFFFF', color: '#6B6560', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'calc(12px * var(--app-ui-font-scale, 1.125))' }}>
            Clear filter
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {decks.map(deck => {
          const deckCards = cards.filter(card => card.deckId === deck.id)
          const counts = [0, 1, 2, 3, 4, 5].map(difficulty => deckCards.filter(card => (card.difficulty ?? 0) === difficulty).length)
          const isSelected = selectedDeckId === deck.id
          return (
            <section
              key={deck.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} set ${deck.name}`}
              onClick={() => toggleDeckSelection(deck.id)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggleDeckSelection(deck.id)
                }
              }}
              style={{ background: isSelected ? 'var(--app-accent-soft, #EEF2FF)' : '#FFFFFF', border: isSelected ? '2px solid var(--app-accent, #4F46E5)' : '1px solid #E2DED4', borderRadius: '10px', padding: isSelected ? '13px' : '14px', cursor: 'pointer', boxShadow: isSelected ? '0 0 0 2px color-mix(in srgb, var(--app-accent, #4F46E5) 16%, transparent)' : 'none', transition: 'all 0.15s' }}
            >
              <h2 style={{ margin: '0 0 10px', fontSize: 'calc(13px * var(--app-ui-font-scale, 1.125))', color: '#111110' }}>{deck.name}</h2>
              <div onClick={event => event.stopPropagation()} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <PieChart counts={counts} onSelect={difficulty => { setSelectedDeckId(deck.id); setSelectedDifficulty(difficulty) }} />
                <div style={{ display: 'grid', gap: '3px', fontSize: 'calc(11px * var(--app-ui-font-scale, 1.125))', color: '#6B6560' }}>
                  {counts.map((count, index) => <span key={index}><span style={{ color: difficultyColors[index] }}>●</span> {index} {index === 1 ? 'star' : 'stars'}: {count}</span>)}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <section className="stats-table-panel" style={{ background: '#FFFFFF', color: '#111110', border: '1px solid #E2DED4', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--app-panel-border, #E2DED4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'calc(13px * var(--app-ui-font-scale, 1.125))', fontWeight: 600, color: '#111110' }}>{filteredCards.length} cards</span>
          <button disabled={filteredCards.length === 0} onClick={() => onStudyCards(filteredCards)} style={{ padding: '7px 10px', border: 'none', borderRadius: '6px', background: filteredCards.length ? '#4F46E5' : '#E2DED4', color: '#FFFFFF', cursor: filteredCards.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 'calc(12px * var(--app-ui-font-scale, 1.125))', fontWeight: 600 }}>
            Study filtered cards
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'calc(12px * var(--app-ui-font-scale, 1.125))', color: '#111110', background: '#FFFFFF' }}>
            <thead style={{ background: '#FFFFFF' }}>
              <tr>
                {([['question', 'Front'], ['answer', 'Back'], ['difficulty', 'Difficulty']] as const).map(([column, label]) => (
                  <th key={column} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <button onClick={() => toggleSort(column)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                      {label}{sort.column === column ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCards.map(card => (
                <tr key={card.id} style={{ borderTop: '1px solid var(--app-panel-border, #F0EDE6)' }}>
                  <td style={{ padding: '10px 16px', minWidth: '220px' }}><MarkdownContent className="stats-markdown" content={card.question} allowImages={false} markdownContext={markdownContext} sourcePath={cardSourcePaths?.[card.id] ?? ''} style={{ fontSize: '12px', color: 'inherit' }} /></td>
                  <td style={{ padding: '10px 16px', minWidth: '260px' }}><MarkdownContent className="stats-markdown" content={card.answer} markdownContext={markdownContext} sourcePath={cardSourcePaths?.[card.id] ?? ''} style={{ fontSize: '12px', color: 'inherit' }} /></td>
                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{'★'.repeat(card.difficulty ?? 0)}{'☆'.repeat(5 - (card.difficulty ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
