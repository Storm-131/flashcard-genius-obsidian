export { materializeDeckDocuments } from '@flashcard-genius/core'
import type { ImageStorage } from '@flashcard-genius/ui/images/imageStorage'
import { extractMarkdownImages, rewriteMarkdownImagePaths } from '@flashcard-genius/ui/images/markdownImages'
import { ImportExportError } from './errors'
import { parseDeckMarkdown } from './markdownParser'
import type { DeckDocument, ImportBundle, MarkdownSourceFile } from './types'


export function parseMarkdownSources(files: MarkdownSourceFile[]): DeckDocument[] {
  return files.map(file => parseDeckMarkdown(file.content, file.name))
}

export function validateImportBundleImages(bundle: ImportBundle): void {
  const availableImages = new Set(bundle.images.map(image => image.path.replace(/^\.\//, '').replace(/^\//, '')))
  const missingImages = bundle.decks.flatMap(deck => deck.topics.flatMap(topic => topic.cards.flatMap(card =>
    [...extractMarkdownImages(card.question), ...extractMarkdownImages(card.answer)]
      .map(image => image.path.replace(/^\.\//, '').replace(/^\//, ''))
      .filter(path => path.startsWith('img/') && !availableImages.has(path)))))

  if (missingImages.length > 0) {
    throw new ImportExportError('The import contains Markdown references to missing images.', [...new Set(missingImages)])
  }
}

export function installImportedImages(bundle: ImportBundle, storage: ImageStorage): ImportBundle {
  const pathMapping = new Map<string, string>()

  for (const image of bundle.images) {
    const normalizedPath = image.path.replace(/^\.\//, '').replace(/^\//, '')
    const fileName = normalizedPath.split('/').pop() || 'image'
    const stored = storage.store(image.blob, fileName)
    pathMapping.set(image.path, stored.path)
    pathMapping.set(normalizedPath, stored.path)
  }

  return {
    images: bundle.images,
    decks: bundle.decks.map(deck => ({
      ...deck,
      topics: deck.topics.map(topic => ({
        ...topic,
        cards: topic.cards.map(card => ({
          ...card,
          question: rewriteMarkdownImagePaths(card.question, pathMapping),
          answer: rewriteMarkdownImagePaths(card.answer, pathMapping),
          answerParts: card.answerParts?.map(part => ({
            ...part,
            content: rewriteMarkdownImagePaths(part.content, pathMapping),
          })),
        })),
      })),
    })),
  }
}
