import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CardAnswer from './CardAnswer'
import type { Card } from '../types'

const card: Card = {
  id: 'card', deckId: 'deck', question: '![[bird.webp]]', tags: [],
  answer: '**Blauer Drache**\n\n*Glaucus atlanticus*\n\nMeeresschnecke\nDetails',
  answerParts: [
    { content: '**Blauer Drache**', columnIndex: 0 },
    { content: '*Glaucus atlanticus*', columnIndex: 1 },
    { content: 'Meeresschnecke\nDetails', columnIndex: 2 },
  ],
}

describe('answer column rendering', () => {
  it('uses the text renderer for image answers with the first answer above the divider', () => {
    const { container } = render(<CardAnswer card={card} content={card.answer} imageQuestion fontScale={1.5} sourcePath="" />)
    const group = container.querySelector('.text-question-answer')!
    const parts = group.querySelectorAll<HTMLElement>('.card-answer-part')
    expect(Array.from(parts).map(part => part.dataset.columnIndex)).toEqual(['0', '1', '2'])
    expect(group.querySelector('.answer-column-divider')?.previousElementSibling).toBe(parts[0])
    expect(group.querySelector('.answer-column-divider')?.nextElementSibling).toBe(parts[1])
    expect(group.querySelector('strong')).toHaveTextContent('Blauer Drache')
    expect(group.querySelector('em')).toHaveTextContent('Glaucus atlanticus')
    expect(Array.from(parts[2].querySelectorAll('p')).map(node => node.textContent)).toEqual(['Meeresschnecke', 'Details'])
    expect(group.querySelector('img')).toBeNull()
    expect(group.querySelector('.image-question-answer, .study-answer-info')).toBeNull()
    for (const part of parts) {
      expect(part.style.getPropertyValue('--answer-fit-scale')).toBe('')
      expect(part.style.getPropertyValue('--answer-column-scale')).toBe('')
    }
  })

  it('adds column dividers to text cards without changing text or font rendering', () => {
    const { container } = render(<CardAnswer card={card} content={card.answer} imageQuestion={false} fontScale={1} sourcePath="" />)
    expect(container.querySelectorAll('.card-answer-part')).toHaveLength(3)
    expect(container.querySelectorAll('.answer-column-divider')).toHaveLength(2)
    expect(container.querySelector('.answer-column-divider.is-primary')).toBeInTheDocument()
    expect(container.querySelector('.answer-column-divider.is-secondary')).toBeInTheDocument()
    expect(container).toHaveTextContent('Meeresschnecke')
  })

  it('skips empty cells without changing column order or splitting paragraphs into columns', () => {
    const answer = '**First**\n\nParagraph\n\n*Last*'
    const value = { ...card, answer, answerParts: [{ content: '**First**\n\nParagraph', columnIndex: 1 }, { content: '*Last*', columnIndex: 3 }] }
    const { container } = render(<CardAnswer card={value} content={answer} imageQuestion fontScale={1} sourcePath="" />)
    expect(Array.from(container.querySelectorAll<HTMLElement>('.card-answer-part')).map(part => part.dataset.columnIndex)).toEqual(['1', '3'])
    expect(container.querySelectorAll('.markdown-paragraph-gap')).toHaveLength(1)
    expect(container.querySelectorAll('.answer-column-divider')).toHaveLength(1)
    expect(value.answer).toBe(answer)
  })

  it('keeps legacy answers and edited answers as one Markdown block', () => {
    const answer = 'Updated answer\n\nAnother paragraph'
    const { container } = render(<CardAnswer card={card} content={answer} imageQuestion fontScale={1} sourcePath="" />)
    expect(container.querySelectorAll('.card-answer-part')).toHaveLength(1)
    expect(container.querySelector('.answer-column-divider')).toBeNull()
    expect(container).not.toHaveTextContent('Blauer Drache')
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })
})
