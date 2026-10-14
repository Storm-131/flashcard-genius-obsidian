import type { ImageStorage } from '@flashcard-genius/ui/images/imageStorage'
import { prepareDeckExport } from './exportPreparation'
import { serializeDeckMarkdown, uniqueDeckFileNames } from './markdownSerializer'
import type { StorageProvider } from './storageProvider'
import type { DeckDocument } from './types'

export async function saveDecksToWorkspace(
  provider: StorageProvider,
  documents: DeckDocument[],
  imageStorage: ImageStorage,
): Promise<void> {
  const prepared = prepareDeckExport(documents, imageStorage)
  const fileNames = uniqueDeckFileNames(prepared.documents)

  await Promise.all(prepared.documents.map((document, index) =>
    provider.saveMarkdown(fileNames[index], serializeDeckMarkdown(document))))
  await Promise.all([...prepared.images].map(([path, asset]) => provider.saveImage(path, asset.blob)))
}

export async function saveDeckToWorkspace(
  provider: StorageProvider,
  documents: DeckDocument[],
  targetIndex: number,
  imageStorage: ImageStorage,
): Promise<void> {
  const targetDocument = documents[targetIndex]
  if (!targetDocument) return
  const prepared = prepareDeckExport([targetDocument], imageStorage)
  const fileName = uniqueDeckFileNames(documents)[targetIndex]
  await provider.saveMarkdown(fileName, serializeDeckMarkdown(prepared.documents[0]))
  await Promise.all([...prepared.images].map(([path, asset]) => provider.saveImage(path, asset.blob)))
}

export async function deleteDecksFromWorkspace(
  provider: StorageProvider,
  allDocuments: DeckDocument[],
  targetIndexes: number[],
): Promise<void> {
  const fileNames = uniqueDeckFileNames(allDocuments)
  await Promise.all(targetIndexes.map(index => fileNames[index]).filter((fileName): fileName is string => Boolean(fileName)).map(fileName => provider.deleteMarkdown(fileName)))
}
