import type { ImageStorage, StoredImageAsset } from '@flashcard-genius/ui/images/imageStorage'
import { extractMarkdownImages, rewriteMarkdownImagePaths } from '@flashcard-genius/ui/images/markdownImages'
import { ImportExportError } from './errors'
import { sanitizeFileName } from './markdownSerializer'
import type { DeckDocument } from './types'

function uniqueImagePath(fileName: string, used: Set<string>): string {
  const safeName = sanitizeFileName(fileName)
  const dotIndex = safeName.lastIndexOf('.')
  const stem = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName
  const extension = dotIndex > 0 ? safeName.slice(dotIndex) : ''
  let candidate = `img/${safeName}`
  let suffix = 2

  while (used.has(candidate.toLowerCase())) {
    candidate = `img/${stem}-${suffix}${extension}`
    suffix += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

export function prepareDeckExport(documents: DeckDocument[], storage: ImageStorage) {
  const usedImagePaths = new Set<string>()
  const exportedImages = new Map<string, StoredImageAsset>()
  const pathMapping = new Map<string, string>()
  const missingImages: string[] = []

  for (const document of documents) {
    for (const topic of document.topics) {
      for (const card of topic.cards) {
        for (const image of [...extractMarkdownImages(card.question), ...extractMarkdownImages(card.answer)]) {
          const normalizedPath = image.path.replace(/^\.\//, '')
          if (pathMapping.has(normalizedPath)) continue
          const asset = storage.get(normalizedPath)
          if (!asset) {
            missingImages.push(normalizedPath)
            continue
          }
          const exportedPath = uniqueImagePath(normalizedPath.split('/').pop() || asset.originalName, usedImagePaths)
          pathMapping.set(image.path, exportedPath)
          pathMapping.set(normalizedPath, exportedPath)
          exportedImages.set(exportedPath, asset)
        }
      }
    }
  }

  if (missingImages.length > 0) {
    throw new ImportExportError('The export was cancelled because referenced images are missing.', [...new Set(missingImages)])
  }

  const rewrittenDocuments = documents.map(document => ({
    ...document,
    topics: document.topics.map(topic => ({
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
  }))

  return { documents: rewrittenDocuments, images: exportedImages }
}
