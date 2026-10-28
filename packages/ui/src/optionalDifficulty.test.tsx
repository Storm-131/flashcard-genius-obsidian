import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { materializeDeckDocuments, parseDeckMarkdown } from '@flashcard-genius/core'
import ReadonlyFlashcardApp from './ReadonlyFlashcardApp'
import { StudyCard } from './components/StudyMode'
import StatsMode from './components/StatsMode'

function mixedDeck() {
  return materializeDeckDocuments([parseDeckMarkdown('# Mixed\n| Q | A | Details |\n| --- | --- | --- |\n| Unrated | Answer | Unique detail 5 |\n\n| Q | A | Stars |\n| --- | --- | --- |\n| Rated | Answer | 3 |')])
}

describe('optional difficulty controls', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
  })
  afterEach(() => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView
    vi.unstubAllGlobals()
  })

  it.each(['Library', 'Study'])('disables the Stars toolbar button in %s and explains the required column', mode => {
    const data = materializeDeckDocuments([parseDeckMarkdown('# Unrated\n| Q | A | Notes |\n| --- | --- | --- |\n| Question | Answer | Details |')])
    const onPersistDifficulty = vi.fn()
    render(<ReadonlyFlashcardApp {...data} onPersistDifficulty={onPersistDifficulty} />)
    if (mode === 'Study') fireEvent.click(screen.getByRole('button', { name: 'Study', exact: true }))
    if (!screen.queryByRole('button', { name: 'Stars', exact: true })) {
      fireEvent.click(screen.getByRole('button', { name: 'Open study controls' }))
    }
    const button = screen.getByRole('button', { name: 'Stars', exact: true })
    expect(button).toBeDisabled()
    expect(button).toHaveStyle({ color: '#9B9488', opacity: '0.6' })
    fireEvent.click(button)
    expect(screen.queryAllByRole('group', { name: 'Difficulty rating' })).toHaveLength(0)
    expect(onPersistDifficulty).not.toHaveBeenCalled()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.mouseEnter(button.parentElement!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('These decks have no rating column. Name the last column ⭐, *, or Difficulty.')
    fireEvent.mouseLeave(button.parentElement!)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.focus(button.parentElement!)
    expect(screen.getByRole('tooltip')).toBeVisible()
    fireEvent.keyDown(button.parentElement!, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('enables the toolbar when a rating-free deck is replaced by a mixed deck', () => {
    const data = mixedDeck()
    const app = render(<ReadonlyFlashcardApp {...data} cards={[data.cards[0]]} />)
    expect(screen.getByRole('button', { name: 'Stars', exact: true })).toBeDisabled()
    app.rerender(<ReadonlyFlashcardApp {...data} />)
    expect(screen.getByRole('button', { name: 'Stars', exact: true })).toBeEnabled()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('disables only rating-free library cards and persists ratings on the other cards', async () => {
    const data = mixedDeck()
    const onPersistDifficulty = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<ReadonlyFlashcardApp {...data} onPersistDifficulty={onPersistDifficulty} />)
    fireEvent.click(screen.getByRole('button', { name: 'Stars', exact: true }))
    const cards = container.querySelectorAll<HTMLElement>('.workspace-card')
    const disabledStars = within(cards[0]).getAllByRole('button', { name: '0 out of 5 stars' })
    expect(disabledStars).toHaveLength(5)
    for (const star of disabledStars) {
      expect(star).toBeDisabled()
      fireEvent.click(star)
    }
    expect(onPersistDifficulty).not.toHaveBeenCalled()
    expect(cards[0]).toHaveTextContent('Unique detail 5')
    const enabledStar = within(cards[1]).getByRole('button', { name: 'Set difficulty to 5 out of 5' })
    expect(enabledStar).toBeEnabled()
    fireEvent.click(enabledStar)
    await waitFor(() => expect(onPersistDifficulty).toHaveBeenCalledWith(data.cards[1], 5))
    await waitFor(() => expect(enabledStar).toHaveAttribute('aria-pressed', 'true'))
    expect(data.cards[0].difficulty).toBe(0)
    fireEvent.change(screen.getByPlaceholderText('Search cards…'), { target: { value: 'Unique detail 5' } })
    expect(container.querySelectorAll('.workspace-card')).toHaveLength(1)
    expect(container.querySelector('.workspace-card')).toHaveTextContent('Unrated')
    expect(container.querySelector('.workspace-card')).toHaveTextContent('Unique detail 5')
  })

  it.each([false, true, undefined])('respects rating support %j on both study card faces', hasDifficultyColumn => {
    const onChange = vi.fn()
    render(<StudyCard
      card={{ ...mixedDeck().cards[1], hasDifficultyColumn, difficulty: hasDifficultyColumn === false ? 0 : 3 }}
      isFlipped={false}
      onClick={vi.fn()}
      onDifficultyChange={onChange}
      cardHeight={240}
      squareCards={false}
      showStars
      immutable
      allowDifficultyChanges
    />)
    const groups = screen.getAllByRole('group', { name: 'Difficulty rating' })
    expect(groups).toHaveLength(2)
    for (const group of groups) {
      const star = within(group).getAllByRole('button')[4]
      if (hasDifficultyColumn === false) expect(star).toBeDisabled()
      else expect(star).toBeEnabled()
      fireEvent.click(star)
    }
    expect(onChange).toHaveBeenCalledTimes(hasDifficultyColumn === false ? 0 : 2)
  })

  it('sorts and filters mixed cards as unrated or rated without dropping answer contents', () => {
    const data = mixedDeck()
    const onStudyCards = vi.fn()
    const { container } = render(<StatsMode cards={data.cards} decks={data.decks} onStudyCards={onStudyCards} />)
    fireEvent.click(screen.getByRole('button', { name: /^Difficulty/ }))
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0]).toHaveTextContent('Unrated')
    expect(rows[0]).toHaveTextContent('Unique detail 5')
    expect(rows[1]).toHaveTextContent('Rated')
    fireEvent.click(screen.getByRole('button', { name: /^Difficulty/ }))
    expect(container.querySelector('tbody tr')).toHaveTextContent('Rated')
    const slices = screen.getByRole('img', { name: 'Difficulty distribution' }).querySelectorAll('path')
    fireEvent.click(slices[0])
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1)
    expect(container.querySelector('tbody tr')).toHaveTextContent('Unrated')
    expect(container.querySelector('tbody tr')).toHaveTextContent('Unique detail 5')
    fireEvent.click(screen.getByRole('button', { name: 'Study filtered cards' }))
    expect(onStudyCards).toHaveBeenCalledWith([data.cards[0]])
  })
})
