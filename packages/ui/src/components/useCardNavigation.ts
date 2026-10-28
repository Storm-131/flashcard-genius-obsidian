import { useEffect, type RefObject } from 'react'
import type { Card } from '../types'

interface Options {
  containerRef: RefObject<HTMLElement | null>
  groups: Card[][]
  columns: number
  selectedCardId?: string | null
  onSelectCard?: (id: string) => void
  onFlip?: (id: string) => void
  onRate?: (card: Card, value: number) => void
}

// Listen on this application root only, including its Finder, never on document.
export default function useCardNavigation({ containerRef, groups, columns, selectedCardId, onSelectCard, onFlip, onRate }: Options) {
  useEffect(() => {
    // Selection changes start each card at the top, on either face.
    containerRef.current?.querySelectorAll<HTMLElement>('.card-content-viewport, .card-heading').forEach(element => {
      element.scrollTop = 0
    })
  }, [containerRef, selectedCardId])

  useEffect(() => {
    const panel = containerRef.current
    const root = panel?.closest('.flashcard-genius-root') ?? panel
    if (!root || !onSelectCard) return
    const rows = groups.flatMap(cards => Array.from(
      { length: Math.ceil(cards.length / columns) },
      (_, index) => cards.slice(index * columns, (index + 1) * columns),
    ))
    const cards = rows.flat()
    const handleKeyDown = (event: Event) => {
      const key = event as KeyboardEvent
      const target = key.target
      if (key.defaultPrevented || key.isComposing || key.altKey || key.ctrlKey || key.metaKey || key.shiftKey || !(target instanceof Element)) return
      if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], .cm-editor, .monaco-editor, [role="dialog"], dialog, .modal')) return
      if (target.closest('a, button') && !target.closest('.sidebar-card-preview')) return
      const index = cards.findIndex(card => card.id === selectedCardId)
      if (index < 0) return
      const card = cards[index]
      let next: Card | undefined
      if (key.key === 'ArrowLeft') next = cards[index - 1]
      else if (key.key === 'ArrowRight') next = cards[index + 1]
      else if (key.key === 'ArrowUp' || key.key === 'ArrowDown') {
        const rowIndex = rows.findIndex(row => row.some(item => item.id === card.id))
        const column = rows[rowIndex].findIndex(item => item.id === card.id)
        const nextRow = rows[rowIndex + (key.key === 'ArrowUp' ? -1 : 1)]
        next = nextRow?.[Math.min(column, nextRow.length - 1)]
      } else if (key.key === ' ') {
        key.preventDefault()
        key.stopPropagation()
        if (!key.repeat) onFlip?.(card.id)
        return
      } else if (/^[1-5]$/.test(key.key) && onRate) {
        key.preventDefault()
        key.stopPropagation()
        if (!key.repeat) onRate(card, Number(key.key))
        return
      } else return
      key.preventDefault()
      key.stopPropagation()
      if (next) onSelectCard(next.id)
    }
    root.addEventListener('keydown', handleKeyDown)
    return () => root.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, groups, columns, selectedCardId, onSelectCard, onFlip, onRate])

  useEffect(() => {
    const panel = containerRef.current
    const root = panel?.closest('.flashcard-genius-root') ?? panel
    const selected = Array.from(panel?.querySelectorAll<HTMLElement>('[data-card-id]') ?? [])
      .find(element => element.dataset.cardId === selectedCardId)
    selected?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    if (root?.contains(document.activeElement) && document.activeElement?.matches('[data-card-id], .topbar-mode-button')) {
      selected?.focus({ preventScroll: true })
    }
  }, [containerRef, selectedCardId, groups])
}
