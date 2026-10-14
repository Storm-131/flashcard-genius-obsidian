import { describe, expect, it } from 'vitest'
import { parseDeckMarkdown } from '@flashcard-genius/core'
import { cardReferenceName } from './cardLabels'

describe('explorer card names', () => {
  it.each(['![[app://vault/Sperber.webp|100]]', '![Sperber](app://vault/Sperber.webp)'])('uses the second column for image question %s', question => {
    const card = parseDeckMarkdown(`# Birds\n| Image | Name | Species | Rating |\n| --- | --- | --- | --- |\n| ${question} | **Sperber** | *Accipiter nisus* | 2 |`).topics[0].cards[0]
    expect(cardReferenceName({ ...card, id: 'card', deckId: 'deck', tags: [] })).toBe('Sperber')
    expect(card.question).toBe(question)
    expect(card.answer).toBe('**Sperber**\n\n*Accipiter nisus*')
  })

  it('keeps text questions and image-deck titles as names', () => {
    expect(cardReferenceName({ id: 'card', deckId: 'deck', question: '**Text question**', answer: 'Answer', tags: [] })).toBe('Text question')
    expect(cardReferenceName({ id: 'card', deckId: 'deck', question: 'Bird', answer: '![Bird](img/bird.webp)', imageAsQuestion: true, tags: [] })).toBe('Bird')
  })
})
