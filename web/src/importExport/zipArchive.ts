import JSZip from 'jszip'
import type { ImageStorage } from '@flashcard-genius/ui/images/imageStorage'
import { ImportExportError } from './errors'
import { prepareDeckExport } from './exportPreparation'
import { validateImportBundleImages } from './importService'
import { parseDeckMarkdown } from './markdownParser'
import { serializeDeckMarkdown, uniqueDeckFileNames } from './markdownSerializer'
import type { DeckDocument, ImportBundle } from './types'

export async function createDeckZip(documents: DeckDocument[], storage: ImageStorage): Promise<Blob> {
  if (documents.length === 0) throw new ImportExportError('No decks are available for export.')
  const prepared = prepareDeckExport(documents, storage)
  const deckFileNames = uniqueDeckFileNames(prepared.documents)
  const zip = new JSZip()

  prepared.documents.forEach((document, index) => {
    zip.file(deckFileNames[index], serializeDeckMarkdown(document))
  })
  for (const [path, asset] of prepared.images) zip.file(path, asset.blob)

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

export async function importDeckZip(blob: Blob): Promise<ImportBundle> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(blob)
  } catch {
    throw new ImportExportError('The selected ZIP archive is damaged or invalid.')
  }

  const markdownEntries = Object.values(zip.files).filter(entry => !entry.dir && entry.name.toLowerCase().endsWith('.md'))
  if (markdownEntries.length === 0) throw new ImportExportError('The ZIP archive contains no Markdown decks.')

  const decks = await Promise.all(markdownEntries.map(async entry => {
    const fileName = entry.name.split('/').pop() || entry.name
    return parseDeckMarkdown(await entry.async('string'), fileName)
  }))
  const imageEntries = Object.values(zip.files).filter(entry => !entry.dir && /(^|\/)img\/[^/]+$/i.test(entry.name))
  const images = await Promise.all(imageEntries.map(async entry => ({
    path: `img/${entry.name.split('/').pop()}`,
    blob: await entry.async('blob'),
  })))

  const bundle = { decks, images }
  validateImportBundleImages(bundle)
  return bundle
}
