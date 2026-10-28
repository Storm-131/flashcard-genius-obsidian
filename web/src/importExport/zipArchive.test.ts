import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { InMemoryImageStorage } from '@flashcard-genius/ui/images/imageStorage'
import { installImportedImages, validateImportBundleImages } from './importService'
import { parseDeckMarkdown } from './markdownParser'
import { serializeDeckMarkdown } from './markdownSerializer'
import type { DeckDocument, ImportBundle } from './types'
import { createDeckZip, importDeckZip } from './zipArchive'

const markdown = `# Geografie
## Karten
- - -
#### **Wo liegt Berlin?**

In Deutschland.\n\n![Karte](img/karte.png)
- - -
`

describe('ZIP import and export', () => {
  it('preserves wiki image questions and merged answers through a ZIP roundtrip and image collisions', async () => {
    const document = parseDeckMarkdown('# Birds\n| Front | Name | Species | Rating |\n| --- | --- | --- | --- |\n| ![[img/Sperber.webp\\|300x200]] | **Sperber** | *Accipiter nisus* | 4 |', 'Birds.md')
    const storage = new InMemoryImageStorage()
    storage.store(new Blob(['old']), 'Sperber.webp')
    const bundle = { decks: [document], images: [{ path: 'img/Sperber.webp', blob: new Blob(['bird'], { type: 'image/webp' }) }] }
    validateImportBundleImages(bundle)
    const installed = installImportedImages(bundle, storage)
    expect(installed.decks[0].topics[0].cards[0].question).toBe('![[img/Sperber-2.webp|300x200]]')
    const imported = await importDeckZip(await createDeckZip(installed.decks, storage))
    // Preserve the answer column metadata along with the Markdown contents.
    expect(imported.decks.map(serializeDeckMarkdown)).toEqual(installed.decks.map(serializeDeckMarkdown))
    expect(imported.decks[0].topics[0].cards[0].answer).toBe(installed.decks[0].topics[0].cards[0].answer)
    expect(imported.images.map(image => image.path)).toEqual(['img/Sperber-2.webp'])
  })

  it('preserves rating-free answer columns and images through ZIP import and export', async () => {
    const document = parseDeckMarkdown('# Deck\n| Q | A | Details |\n| --- | --- | --- |\n| Question | ![Map](img/map.png) | 5 |', 'Deck.md')
    const storage = new InMemoryImageStorage()
    storage.store(new Blob(['existing']), 'map.png')
    const installed = installImportedImages({ decks: [document], images: [{ path: 'img/map.png', blob: new Blob(['map'], { type: 'image/png' }) }] }, storage)
    expect(installed.decks[0].topics[0].cards[0].answerParts?.[0].content).toBe('![Map](img/map-2.png)')
    const imported = await importDeckZip(await createDeckZip(installed.decks, storage))
    expect(imported.decks[0].topics[0].cards).toEqual(installed.decks[0].topics[0].cards)
    expect(imported.images.map(image => image.path)).toEqual(['img/map-2.png'])
  })

  it('validates missing images in the question column too', () => {
    const document = parseDeckMarkdown('# Birds\n| Front | Answer | Rating |\n| --- | --- | --- |\n| ![[img/Sperber.webp\\|100]] | Bird | 1 |')
    expect(() => validateImportBundleImages({ decks: [document], images: [] })).toThrow('missing images')
  })

  it('exportiert Deck-Dateien und gemeinsam verwendete Bilder in der geforderten Struktur', async () => {
    const storage = new InMemoryImageStorage()
    storage.store(new Blob(['map'], { type: 'image/png' }), 'karte.png')
    const document = parseDeckMarkdown(markdown, 'Geografie.md')

    const blob = await createDeckZip([document], storage)
    const zip = await JSZip.loadAsync(blob)

    expect(zip.file('Geografie.md')).not.toBeNull()
    expect(zip.file('img/karte.png')).not.toBeNull()
    expect(await zip.file('Geografie.md')?.async('string')).toBe(serializeDeckMarkdown(document))
  })

  it('vermeidet Bildkollisionen beim Import und aktualisiert Markdown-Referenzen', () => {
    const storage = new InMemoryImageStorage()
    storage.store(new Blob(['existing']), 'karte.png')
    const bundle: ImportBundle = {
      decks: [parseDeckMarkdown(markdown, 'Geografie.md')],
      images: [{ path: 'img/karte.png', blob: new Blob(['imported']) }],
    }

    const installed = installImportedImages(bundle, storage)

    expect(installed.decks[0].topics[0].cards[0].answer).toContain('](img/karte-2.png)')
    expect(storage.get('img/karte-2.png')).toBeDefined()
  })

  it('führt einen vollständigen Markdown → ZIP → Markdown Roundtrip ohne Inhaltsverlust aus', async () => {
    const sourceDocument: DeckDocument = parseDeckMarkdown(markdown, 'Geografie.md')
    const storage = new InMemoryImageStorage()
    const installed = installImportedImages({
      decks: [sourceDocument],
      images: [{ path: 'img/karte.png', blob: new Blob(['map'], { type: 'image/png' }) }],
    }, storage)

    const exportedZip = await createDeckZip(installed.decks, storage)
    const importedAgain = await importDeckZip(exportedZip)

    expect(importedAgain.decks).toHaveLength(1)
    expect(importedAgain.images.map(image => image.path)).toEqual(['img/karte.png'])
    expect(serializeDeckMarkdown(importedAgain.decks[0])).toBe(serializeDeckMarkdown(sourceDocument))
  })
})
