import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Card, Deck } from '../types'
import StatsMode from './StatsMode'

const decks: Deck[] = [
  { id: 'deck-a', name: 'Alpha', categoryId: null, color: '#4F46E5' },
  { id: 'deck-b', name: 'Beta', categoryId: null, color: '#0EA5E9' },
]

const cards: Card[] = [
  { id: 'a-1', deckId: 'deck-a', question: 'Alpha 1', answer: 'Antwort A1', tags: [], difficulty: 2 },
  { id: 'a-2', deckId: 'deck-a', question: 'Alpha 2', answer: 'Antwort A2', tags: [], difficulty: 4 },
  { id: 'b-1', deckId: 'deck-b', question: 'Beta 1', answer: 'Antwort B1', tags: [], difficulty: 1 },
]

describe('StatsMode deck filter', () => {
  it('filters cards by clicking a deck and clears the filter on a second click', () => {
    const { container } = render(<StatsMode cards={cards} decks={decks} onStudyCards={vi.fn()} />)

    expect(container.querySelector('.stats-mode')).toBeInTheDocument()
    expect(container.querySelector('.stats-table-panel')).toBeInTheDocument()

    const alpha = screen.getByRole('button', { name: 'Select set Alpha' })
    expect(screen.getByText('3 cards')).toBeInTheDocument()

    fireEvent.click(alpha)
    expect(alpha).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('2 cards')).toBeInTheDocument()
    expect(screen.queryByText('Beta 1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Deselect set Alpha' }))
    expect(screen.getByText('3 cards')).toBeInTheDocument()
  })
})
