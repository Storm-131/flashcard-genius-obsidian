import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MaterializedDecks } from '@flashcard-genius/core'
import ReadonlyFlashcardApp from './ReadonlyFlashcardApp'

const data: MaterializedDecks = {
  categories: [], topics: [],
  decks: [{ id: 'deck', name: 'Deck', categoryId: null, color: '#059669' }],
  cards: [1, 5, 0, 4, 2, 3].map((difficulty, index) => ({
    id: `c${index + 1}`, deckId: 'deck', question: `Card ${index + 1}`,
    answer: index % 2 ? 'Even answer' : 'Odd answer', tags: [], difficulty,
    hasDifficultyColumn: index !== 2,
  })),
  cardOrderByDeck: { deck: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] },
}

function mountApp(sourcePaths = Object.fromEntries(data.cards.map(card => [card.id, "Deck.md"]))) {
  const onPersistDifficulty = vi.fn().mockResolvedValue(undefined)
  const onOpenMarkdownSource = vi.fn()
  const result = render(<ReadonlyFlashcardApp {...data} onPersistDifficulty={onPersistDifficulty} onOpenMarkdownSource={onOpenMarkdownSource} cardSourcePaths={sourcePaths} />)
  const card = (id: string) => result.container.querySelector<HTMLElement>(`[data-card-id="${id}"]`)!
  const selected = () => result.container.querySelector<HTMLElement>('[data-card-id].is-card-selected')?.dataset.cardId
  return { ...result, card, selected, onPersistDifficulty, onOpenMarkdownSource }
}

function changeToStudy() {
  fireEvent.click(screen.getByRole('button', { name: 'Study', exact: true }))
}

describe('shared card selection and keyboard navigation', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1440)
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView
  })

  it('synchronises selection while keeping Finder navigation independent of Study flips', () => {
    const app = mountApp()
    fireEvent.click(app.card('c2'))
    expect(app.selected()).toBe('c2')
    expect(app.card('c2')).toHaveAttribute('aria-current', 'true')
    const finder = app.container.querySelector('[data-sidebar-card-id="c2"]')!
    expect(finder).toHaveClass('is-card-selected')
    expect(app.container.querySelector('textarea')).toBeNull()
    fireEvent.click(app.container.querySelector('[data-sidebar-card-id="c4"]')!)
    expect(app.selected()).toBe('c4')
    changeToStudy()
    expect(app.selected()).toBe('c4')
    fireEvent.click(app.card('c5'))
    expect(app.selected()).toBe('c5')
    expect(app.card('c5').querySelector('.is-flipped')).toBeInTheDocument()
    fireEvent.click(app.container.querySelector('[data-sidebar-card-id="c1"]')!)
    expect(app.selected()).toBe('c1')
    expect(app.card('c1')).toHaveClass('flip-card')
    fireEvent.click(screen.getByRole('button', { name: 'Library', exact: true }))
    expect(app.selected()).toBe('c1')
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
  })

  it('navigates grid rows and keeps Space, selection and persisted ratings independent', async () => {
    const app = mountApp()
    fireEvent.click(app.card('c2'))
    fireEvent.keyDown(app.card('c2'), { key: 'ArrowDown' })
    expect(app.selected()).toBe('c6')
    fireEvent.keyDown(app.card('c6'), { key: 'ArrowUp' })
    expect(app.selected()).toBe('c2')
    expect(fireEvent.keyDown(app.card('c2'), { key: ' ' })).toBe(false)
    changeToStudy()
    expect(fireEvent.keyDown(app.card('c2'), { key: ' ' })).toBe(false)
    expect(app.card('c2').querySelector('.is-flipped')).toBeInTheDocument()
    fireEvent.keyDown(app.card('c2'), { key: 'ArrowRight' })
    expect(app.selected()).toBe('c3')
    expect(app.card('c2').querySelector('.is-flipped')).toBeInTheDocument()
    expect(app.card('c3').querySelector('.is-flipped')).toBeNull()
    fireEvent.keyDown(app.card('c3'), { key: '4' })
    expect(app.onPersistDifficulty).not.toHaveBeenCalled()
    fireEvent.keyDown(app.card('c3'), { key: 'ArrowLeft' })
    fireEvent.keyDown(app.card('c2'), { key: ' ' })
    expect(app.card('c2').querySelector('.is-flipped')).toBeNull()
    fireEvent.keyDown(app.card('c2'), { key: '5' })
    await waitFor(() => expect(app.onPersistDifficulty).toHaveBeenCalledWith(data.cards[1], 5))
  })

  it('uses the displayed sort and filter order for navigation', () => {
    const app = mountApp()
    fireEvent.click(app.card('c1'))
    fireEvent.click(screen.getByRole('button', { name: 'Sort By', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: '★ 5 → 1' }))
    fireEvent.keyDown(app.card('c1'), { key: 'ArrowRight' })
    expect(app.selected()).toBe('c3')
    fireEvent.change(screen.getByPlaceholderText('Search cards…'), { target: { value: 'Even' } })
    expect(app.selected()).toBe('c2')
    fireEvent.keyDown(app.card('c2'), { key: 'ArrowRight' })
    expect(app.selected()).toBe('c4')
    expect(app.container.querySelectorAll('[data-card-id]')).toHaveLength(3)
  })

  it('leaves typing, dialogs, controls and events outside the application untouched', () => {
    const app = mountApp()
    fireEvent.click(app.card('c1'))
    changeToStudy()
    const root = app.container.querySelector('.flashcard-genius-root')!
    const search = screen.getByPlaceholderText('Search cards…')
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    editable.setAttribute('contenteditable', 'true')
    root.append(editable)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    root.append(dialog)
    const outside = document.createElement('div')
    document.body.append(outside)
    for (const target of [search, editable, dialog, outside, screen.getByRole('button', { name: 'Study', exact: true })]) {
      for (const key of ['ArrowRight', ' ', '5']) expect(fireEvent.keyDown(target, { key })).toBe(true)
    }
    expect(app.selected()).toBe('c1')
    expect(app.card('c1').querySelector('.is-flipped')).toBeNull()
    expect(app.onPersistDifficulty).not.toHaveBeenCalled()
    const externalMode = document.createElement('button')
    externalMode.className = 'topbar-mode-button'
    outside.append(externalMode)
    externalMode.focus()
    app.rerender(<ReadonlyFlashcardApp {...data} cards={data.cards.map(card => ({ ...card }))} />)
    expect(externalMode).toHaveFocus()
    outside.remove()
  })

  it('requires a card selection when several Markdown files belong to the current deck', () => {
    const app = mountApp({ c1: 'First.md', c2: 'Second.md' })
    const edit = screen.getByRole('button', { name: 'Edit', exact: true })
    expect(edit).toBeDisabled()
    fireEvent.click(edit)
    expect(app.onOpenMarkdownSource).not.toHaveBeenCalled()
    fireEvent.click(app.card('c2'))
    expect(edit).toBeEnabled()
    fireEvent.click(edit)
    expect(app.onOpenMarkdownSource).toHaveBeenCalledWith('Second.md')
  })

  it('opens a source directly from Edit without changing later Library card clicks', () => {
    const app = mountApp()
    const edit = screen.getByRole('button', { name: 'Edit', exact: true })
    fireEvent.click(edit)
    expect(app.onOpenMarkdownSource).toHaveBeenCalledWith('Deck.md')
    expect(edit).not.toHaveAttribute('aria-pressed')
    expect(screen.queryByRole('button', { name: 'Open Markdown source' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit card' })).not.toBeInTheDocument()
    fireEvent.click(app.card('c4'))
    expect(app.selected()).toBe('c4')
    expect(app.onOpenMarkdownSource).toHaveBeenCalledTimes(1)
    fireEvent.click(edit)
    expect(app.onOpenMarkdownSource).toHaveBeenCalledTimes(2)
    expect(app.container.querySelector('textarea')).toBeNull()
    changeToStudy()
    fireEvent.click(app.card('c2'))
    expect(app.onOpenMarkdownSource).toHaveBeenCalledTimes(2)
    expect(app.card('c2').querySelector('.is-flipped')).toBeInTheDocument()
    fireEvent.click(app.card('c2'))
    expect(app.card('c2').querySelector('.is-flipped')).toBeNull()
  })
})
