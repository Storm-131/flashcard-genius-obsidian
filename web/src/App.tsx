import { ReadonlyFlashcardApp } from '@flashcard-genius/ui'
import { previewCards } from './previewFixtures'

// Exercise the same application component used by the Obsidian view.
export default function App() {
  return <ReadonlyFlashcardApp
    categories={[]}
    decks={[{ id: 'preview', name: 'Layout preview', categoryId: null, color: '#059669' }]}
    topics={[]}
    cards={previewCards}
    cardOrderByDeck={{ preview: previewCards.map(card => card.id) }}
  />
}
