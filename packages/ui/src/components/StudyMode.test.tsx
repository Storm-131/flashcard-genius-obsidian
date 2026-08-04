import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageAssetsProvider } from '../images/ImageAssetsContext'
import { InMemoryImageStorage } from '../images/imageStorage'
import type { Card } from '../types'
import { StudyCard } from './StudyMode'

function renderStudyCard(imageAsQuestion: boolean) {
  const storage = new InMemoryImageStorage()
  const asset = storage.store(new Blob(['image'], { type: 'image/png' }), 'schema.png')
  const onClick = vi.fn()
  const card: Card = {
    id: 'card-1',
    deckId: 'deck-1',
    question: 'Was zeigt das Schema?',
    answer: `Die Gradientenrichtung.\n\n![Gradienten-Schema](${asset.path})`,
    tags: [],
    imageAsQuestion,
  }

  const result = render(
    <ImageAssetsProvider storage={storage}>
      <StudyCard
        card={card}
        isFlipped={false}
        onClick={onClick}
        onDifficultyChange={vi.fn()}
        cardHeight={240}
        squareCards={false}
      />
    </ImageAssetsProvider>,
  )
  return { ...result, onClick }
}

describe('StudyCard image question', () => {
  it('shows matching mirrored image faces when image-as-question is active', async () => {
    const { container } = renderStudyCard(true)

    expect(await screen.findAllByRole('img', { name: 'Gradienten-Schema' })).toHaveLength(2)
    expect(screen.getByText('Image question')).toBeInTheDocument()
    expect(screen.getByText('Tap to reveal')).toBeInTheDocument()
    expect(screen.getByText('Was zeigt das Schema?')).toBeInTheDocument()
    expect(screen.queryByText('Die Gradientenrichtung.')).not.toBeInTheDocument()
    expect(container.querySelector('.image-question-preview')).toBeInTheDocument()
  })

  it('does not flip the card when the image zoom button is clicked', async () => {
    const { onClick } = renderStudyCard(true)

    const zoomButtons = await screen.findAllByRole('button', { name: 'Enlarge image: Gradienten-Schema' })
    fireEvent.click(zoomButtons[0])

    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Enlarged view: Gradienten-Schema' })).toBeInTheDocument()
  })

  it('behält bei deaktivierter Option die normale Frage-Antwort-Reihenfolge', async () => {
    renderStudyCard(false)

    expect(screen.getAllByText('Was zeigt das Schema?')).toHaveLength(2)
    expect(screen.getByText('Die Gradientenrichtung.')).toBeInTheDocument()
    expect(await screen.findAllByRole('img', { name: 'Gradienten-Schema' })).toHaveLength(1)
  })
})
