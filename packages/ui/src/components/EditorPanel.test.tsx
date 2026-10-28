import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageAssetsProvider } from '../images/ImageAssetsContext'
import { InMemoryImageStorage } from '../images/imageStorage'
import type { Card } from '../types'
import EditorPanel from './EditorPanel'

const baseCard: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  question: 'Frage',
  answer: 'Antwort',
  tags: [],
  imageAsQuestion: false,
}

function renderEditor(card: Card = baseCard) {
  const storage = new InMemoryImageStorage()
  const onSave = vi.fn()
  render(
    <ImageAssetsProvider storage={storage}>
      <EditorPanel
        card={card}
        onSave={onSave}
        onDelete={vi.fn()}
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />
    </ImageAssetsProvider>,
  )
  return { storage, onSave }
}

describe('EditorPanel image upload', () => {
  it('disables rating controls for cards imported without a difficulty column', () => {
    const { onSave } = renderEditor({ ...baseCard, hasDifficultyColumn: false, difficulty: 0 })
    const stars = screen.getAllByRole('button', { name: '0 out of 5 stars' })
    expect(stars).toHaveLength(5)
    for (const star of stars) {
      expect(star).toBeDisabled()
      fireEvent.click(star)
    }
    expect(screen.getByRole('button', { name: 'Clear stars' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'Updated answer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save card' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ hasDifficultyColumn: false, difficulty: 0, answer: 'Updated answer' }))
  })

  it('speichert ein Bild und fügt die Markdown-Referenz nur in die Antwort ein', () => {
    const { storage } = renderEditor()
    const file = new File(['png'], 'Lern Grafik.png', { type: 'image/png' })

    fireEvent.change(screen.getByLabelText('Choose image file'), { target: { files: [file] } })

    expect(screen.getByLabelText('Question')).toHaveValue('Frage')
    expect(screen.getByLabelText('Answer')).toHaveValue('Antwort\n\n![Lern Grafik](img/Lern-Grafik.png)')
    expect(storage.get('img/Lern-Grafik.png')?.blob).toBe(file)
    expect(screen.getByRole('switch', { name: 'Image as question' })).toBeInTheDocument()
  })

  it('zeigt hochgeladene Bilder im Editor und entfernt Bilddatei sowie Markdown beim Löschen', () => {
    const { storage } = renderEditor()
    const file = new File(['png'], 'Skizze.png', { type: 'image/png' })

    fireEvent.change(screen.getByLabelText('Choose image file'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete image: Skizze' }))

    expect(screen.getByLabelText('Answer')).toHaveValue('Antwort')
    expect(storage.get('img/Skizze.png')).toBeUndefined()
    expect(screen.queryByText('Images in this answer')).not.toBeInTheDocument()
  })

  it('speichert Änderungen über den Save-Button', () => {
    const { onSave } = renderEditor()

    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'Aktualisierte Antwort' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save card' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ answer: 'Aktualisierte Antwort' }))
  })

  it('schaltet Formatierungs-Markup beim zweiten Klick wieder aus', () => {
    renderEditor()
    const answer = screen.getByLabelText('Answer') as HTMLTextAreaElement
    const boldButtons = screen.getAllByRole('button', { name: 'Bold' })

    answer.focus()
    answer.setSelectionRange(0, answer.value.length)
    fireEvent.click(boldButtons[1])
    expect(answer).toHaveValue('**Antwort**')

    answer.setSelectionRange(0, answer.value.length)
    fireEvent.click(boldButtons[1])
    expect(answer).toHaveValue('Antwort')
  })

  it('speichert Bild als Frage als eigenes Kartenfeld', () => {
    const card = { ...baseCard, answer: 'Text\n\n![Skizze](img/skizze.png)' }
    const { onSave } = renderEditor(card)

    fireEvent.click(screen.getByRole('switch', { name: 'Image as question' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ imageAsQuestion: true }))
  })
})
