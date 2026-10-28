import { describe, expect, it } from 'vitest'
import templateMarkdown from '../../../docs/Template.md?raw'
import { ImportExportError } from './errors'
import { materializeDeckDocuments } from './importService'
import { parseDeckMarkdown } from './markdownParser'
import { buildDeckDocument, serializeDeckMarkdown, uniqueDeckFileNames } from './markdownSerializer'
import type { DeckDocument } from './types'

describe('Markdown deck format', () => {
  it('retains mixed rating support and answer positions through materialisation and export', () => {
    const document = parseDeckMarkdown('# Mixed\n## Topic\n| Q | A | Number |\n| --- | --- | --- |\n| One | Answer | 5 |\n\n| Q | A | Stars |\n| --- | --- | --- |\n| Two | Answer | 3 |\n\n| Q | Name | Species | Notes |\n| --- | --- | --- | --- |\n| Three | | Second | Final |')
    const imported = materializeDeckDocuments([document])
    expect(imported.cards.map(card => card.hasDifficultyColumn)).toEqual([false, true, false])
    const exported = buildDeckDocument(imported.decks[0], imported.cards, imported.topics, imported.cardOrderByDeck[imported.decks[0].id])
    const markdown = serializeDeckMarkdown(exported)
    expect(parseDeckMarkdown(markdown)).toEqual(document)
    expect(markdown.match(/⭐️/g)).toHaveLength(1)
    expect(markdown).toContain('| One | Answer | 5 |')
    expect(markdown).toContain('| Three |  | Second | Final |')
  })

  it('exports cards without ratings without adding a difficulty column or storing stars', () => {
    const document = parseDeckMarkdown('# Deck\n| Q | A |\n| --- | --- |\n| Question | Answer |')
    // A stale in-memory rating must not enable a column during export.
    document.topics[0].cards[0].difficulty = 5
    const markdown = serializeDeckMarkdown(document)
    expect(markdown).toContain('| Question | Answer |\n')
    expect(markdown).not.toContain('⭐')
    expect(markdown).not.toContain('5')
    expect(parseDeckMarkdown(markdown).topics[0].cards[0]).toMatchObject({ difficulty: 0, hasDifficultyColumn: false })
  })

  it('continues exporting older in-memory cards with their ratings', () => {
    const document: DeckDocument = { title: 'Deck', topics: [{ name: 'Topic', cards: [{ question: 'Q', answer: 'A', difficulty: 4 }] }] }
    expect(parseDeckMarkdown(serializeDeckMarkdown(document)).topics[0].cards[0]).toMatchObject({ difficulty: 4, hasDifficultyColumn: true })
  })

  it('parses the required Template.md table structure', () => {
    const document = parseDeckMarkdown(templateMarkdown, 'Template.md')

    expect(document.title).toBe('Machine Learning 📊')
    expect(document.topics.map(topic => topic.name)).toContain('1. 🧠 Kernkonzepte & Datengrundlagen')
    expect(document.topics.flatMap(topic => topic.cards)).not.toHaveLength(0)
    expect(document.topics[0].cards[0].question).toContain('parametrischem')
    expect(document.topics[0].cards[0].answer).toContain('Parametrisches Lernen')
  })

  it('accepts compact two-dash table dividers', () => {
    const document = parseDeckMarkdown(`# Compact table
## Topic
| Question | Answer | ⭐️ |
| :-- | :-- | :-- |
| Question | Answer | 3 |
`)

    expect(document.topics[0].cards[0].difficulty).toBe(3)
  })

  it('serializes table cards for a lossless re-import', () => {
    const document: DeckDocument = {
      title: 'Biologie',
      topics: [{
        name: 'Zellen',
        cards: [{
          question: 'Was ist **ATP**?',
          answer: 'Ein Energieträger.\n\n- Punkt 1\n- Punkt 2\n\n![Schema](img/schema.png)',
          difficulty: 4,
          hasDifficultyColumn: true,
        }],
      }],
    }

    const serialized = serializeDeckMarkdown(document)
    expect(serialized).toContain('# Biologie\n## Zellen\n| Question | Answer | ⭐️ |\n| :--- | :--- | :--- |\n')
    expect(parseDeckMarkdown(serialized)).toEqual(document)
  })

  it('imports star ratings and defaults legacy tables to zero', () => {
    const document = parseDeckMarkdown(`# Deck
## Thema
| Frage | Antwort | ⭐️ |
| :--- | :--- | :--- |
| Frage 1 | Antwort 1 | 5 |
| Frage 2 | Antwort 2 | 0 |
`)

    expect(document.topics[0].cards.map(card => card.difficulty)).toEqual([5, 0])
    expect(parseDeckMarkdown(`# Legacy
## Thema
| Frage | Antwort |
| :--- | :--- |
| Frage | Antwort |
    `).topics[0].cards[0].difficulty).toBe(0)

    const invalidRating = parseDeckMarkdown(`# Invalid rating
## Thema
| Frage | Antwort | ⭐️ |
| :--- | :--- | :--- |
| Frage | Antwort | 6 |
`)
    expect(invalidRating.topics[0].cards[0].difficulty).toBe(0)
  })

  it('keeps raw pipes in answers while importing the final star column', () => {
    const document = parseDeckMarkdown(`# Deck
## Topic
| Question | Answer | ⭐️ |
| :--- | :--- | :--- |
| Conditional probability | $P(A|B) = P(A \\cap B) / P(B)$ | 5 |
`)

    expect(document.topics[0].cards[0]).toEqual({
      question: 'Conditional probability',
      answer: '$P(A|B) = P(A \\cap B) / P(B)$',
      difficulty: 5,
      hasDifficultyColumn: true,
    })
  })

  it('turns the first folder level into an imported deck category', () => {
    const imported = materializeDeckDocuments([
      {
        title: 'Networks',
        categoryName: 'Computer Science',
        topics: [{ name: 'Basics', cards: [{ question: 'Q', answer: 'A', difficulty: 2 }] }],
      },
      {
        title: 'Loose deck',
        topics: [{ name: 'Basics', cards: [{ question: 'Q', answer: 'A', difficulty: 0 }] }],
      },
    ])

    expect(imported.categories.map(category => category.name)).toEqual(['Computer Science'])
    expect(imported.decks.map(deck => deck.categoryId)).toEqual([imported.categories[0].id, null])
    expect(imported.cards[0].difficulty).toBe(2)
  })

  it('returns useful validation errors', () => {
    expect(() => parseDeckMarkdown('## Thema\n- - -\n#### **Frage**\n\nAntwort\n- - -', 'kaputt.md'))
      .toThrowError(ImportExportError)
    try {
      parseDeckMarkdown('# Nur ein Titel', 'leer.md')
      throw new Error('Validierungsfehler erwartet')
    } catch (error) {
      expect(error).toBeInstanceOf(ImportExportError)
      expect((error as ImportExportError).details).toContain('No cards were found in Markdown tables.')
    }
  })

  it('bewahrt Workspace-Dateinamen und löst Deck-Kollisionen stabil auf', () => {
    const documents: DeckDocument[] = [
      { title: 'Erstes Deck', sourceFileName: 'My Deck.md', topics: [] },
      { title: 'Zweites Deck', sourceFileName: 'My Deck.md', topics: [] },
    ]

    expect(uniqueDeckFileNames(documents)).toEqual(['My Deck.md', 'My Deck-2.md'])
  })
})
