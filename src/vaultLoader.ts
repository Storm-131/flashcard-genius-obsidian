import type { App, TAbstractFile } from "obsidian"
import { TFile, TFolder, normalizePath } from "obsidian"
import {
  materializeDeckDocuments,
  parseDeckMarkdown,
  type DeckDocument,
  type DeckDocumentCard,
  type MaterializedDecks,
} from "@flashcard-genius/core"
import {
  extractMarkdownImages,
  rewriteMarkdownImagePaths,
} from "@flashcard-genius/ui"

export interface VaultSelection {
  path: string
  kind: "file" | "folder"
}

export interface CardSource {
  filePath: string
  cardIndex: number
  question: string
  answer: string
  difficulty: number
  hasDifficultyColumn?: boolean
}

export interface VaultLoadResult extends MaterializedDecks {
  cardSources: Record<string, CardSource>
  sourceContents: Record<string, string>
  sourcePaths: string[]
  skippedFiles: string[]
  sourceLabel: string
}

interface LoadedDocument {
  document: DeckDocument
  originalDocument: DeckDocument
  filePath: string
  content: string
  isImageDeck?: boolean
}

const supportedImageExtensions = new Set([
  "avif",
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
])

export function createEmptyVaultLoadResult(): VaultLoadResult {
  return {
    categories: [],
    decks: [],
    topics: [],
    cards: [],
    cardOrderByDeck: {},
    cardSources: {},
    sourceContents: {},
    sourcePaths: [],
    skippedFiles: [],
    sourceLabel: "Flashcard Genius",
  }
}

function collectMarkdownFiles(target: TAbstractFile): TFile[] {
  if (target instanceof TFile)
    return target.extension.toLocaleLowerCase() === "md" ? [target] : []
  if (!(target instanceof TFolder)) return []

  return target.children
    .flatMap((child) => collectMarkdownFiles(child))
    .sort((left, right) => left.path.localeCompare(right.path))
}

export function isSupportedVaultImage(file: TFile): boolean {
  return supportedImageExtensions.has(file.extension.toLocaleLowerCase())
}

function collectImageFiles(target: TAbstractFile): TFile[] {
  if (target instanceof TFile)
    return isSupportedVaultImage(target) ? [target] : []
  if (!(target instanceof TFolder)) return []

  return target.children
    .flatMap((child) => collectImageFiles(child))
    .sort((left, right) => left.path.localeCompare(right.path))
}

function getCategoryName(
  target: TAbstractFile,
  file: TFile,
): string | undefined {
  if (target instanceof TFile) return file.parent?.name
  if (!(target instanceof TFolder)) return undefined

  const relativePath = file.path.slice(target.path.length).replace(/^\//, "")
  const segments = relativePath.split("/").filter(Boolean)
  return segments.length > 1 ? segments[0] : target.name
}

function getImageFolderLocation(
  target: TAbstractFile,
  file: TFile,
): { categoryName: string; deckName: string } {
  if (!(target instanceof TFolder)) {
    return {
      categoryName: file.parent?.name ?? "Images",
      deckName: file.basename,
    }
  }

  const relativePath = file.path.slice(target.path.length).replace(/^\//, "")
  const segments = relativePath.split("/").filter(Boolean)
  const folderSegments = segments.slice(0, -1)

  if (folderSegments.length >= 2) {
    return {
      categoryName: folderSegments[0],
      deckName: folderSegments[1],
    }
  }

  if (folderSegments.length === 1) {
    return {
      categoryName: target.name,
      deckName: folderSegments[0],
    }
  }

  return {
    categoryName: target.name,
    deckName: "Images",
  }
}

function resolveImagePath(
  app: App,
  imagePath: string,
  sourcePath: string,
): string | null {
  const withoutTitle = imagePath
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/\s+["'][^"']*["']\s*$/, "")
  if (/^(data:|blob:)/i.test(withoutTitle)) return withoutTitle

  const linkedFile = app.metadataCache.getFirstLinkpathDest(
    withoutTitle,
    sourcePath,
  )
  if (!(linkedFile instanceof TFile)) return null
  return app.vault.getResourcePath(linkedFile)
}

function resolveDocumentImages(
  app: App,
  document: DeckDocument,
  sourcePath: string,
): DeckDocument {
  return {
    ...document,
    topics: document.topics.map((topic) => ({
      ...topic,
      cards: topic.cards.map((card) => {
        const paths = new Map<string, string>()
        for (const image of [
          ...extractMarkdownImages(card.question),
          ...extractMarkdownImages(card.answer),
        ]) {
          const resolvedPath = resolveImagePath(app, image.path, sourcePath)
          if (resolvedPath) paths.set(image.path, resolvedPath)
        }
        return {
          ...card,
          question: rewriteMarkdownImagePaths(card.question, paths),
          answer: rewriteMarkdownImagePaths(card.answer, paths),
          answerParts: card.answerParts?.map((part) => ({
            ...part,
            content: rewriteMarkdownImagePaths(part.content, paths),
          })),
        }
      }),
    })),
  }
}

function flattenCards(document: DeckDocument): DeckDocumentCard[] {
  return document.topics.flatMap((topic) => topic.cards)
}

export function resolveVaultSelection(
  app: App,
  selection: VaultSelection,
): TAbstractFile | null {
  const target = app.vault.getAbstractFileByPath(normalizePath(selection.path))
  if (selection.kind === "file" && !(target instanceof TFile)) return null
  if (selection.kind === "folder" && !(target instanceof TFolder)) return null
  return target
}

export async function loadVaultSelections(
  app: App,
  selections: VaultSelection[],
): Promise<VaultLoadResult> {
  const loadedDocuments: LoadedDocument[] = []
  const skippedFiles: string[] = []
  const sourceContents: Record<string, string> = {}
  const seenMarkdownPaths = new Set<string>()
  const seenImagePaths = new Set<string>()

  for (const selection of selections) {
    const target = resolveVaultSelection(app, selection)
    if (!target) {
      skippedFiles.push(selection.path)
      continue
    }

    let loadedMarkdownCount = 0
    for (const file of collectMarkdownFiles(target)) {
      if (seenMarkdownPaths.has(file.path)) continue
      seenMarkdownPaths.add(file.path)

      try {
        const content = await app.vault.cachedRead(file)
        const originalDocument = parseDeckMarkdown(content, file.name)
        sourceContents[file.path] = content
        loadedDocuments.push({
          originalDocument,
          document: resolveDocumentImages(
            app,
            {
              ...originalDocument,
              categoryName: getCategoryName(target, file),
            },
            file.path,
          ),
          filePath: file.path,
          content,
        })
        loadedMarkdownCount += 1
      } catch {
        skippedFiles.push(file.path)
      }
    }

    if (loadedMarkdownCount === 0) {
      const imageFiles = collectImageFiles(target).filter((file) => {
        if (seenImagePaths.has(file.path)) return false
        seenImagePaths.add(file.path)
        return true
      })
      if (imageFiles.length > 0) {
        const imageGroups = new Map<
          string,
          { categoryName: string; deckName: string; files: TFile[] }
        >()
        for (const file of imageFiles) {
          const location = getImageFolderLocation(target, file)
          const key = `${location.categoryName}\u0000${location.deckName}`
          const group = imageGroups.get(key)
          if (group) group.files.push(file)
          else imageGroups.set(key, { ...location, files: [file] })
        }

        for (const group of imageGroups.values()) {
          const imageDeck: DeckDocument = {
            title: group.deckName,
            categoryName: group.categoryName,
            sourceFileName: group.files[0]?.path ?? target.path,
            topics: [
              {
                name: "Images",
                cards: group.files.map((file) => ({
                  question: file.basename,
                  answer: `![${file.basename}](${app.vault.getResourcePath(file)})`,
                  difficulty: 0,
                })),
              },
            ],
          }
          loadedDocuments.push({
            document: imageDeck,
            originalDocument: imageDeck,
            filePath: imageDeck.sourceFileName ?? target.path,
            content: "",
            isImageDeck: true,
          })
        }
      }
    }
  }

  if (loadedDocuments.length === 0) {
    if (selections.length === 0) return createEmptyVaultLoadResult()
    throw new Error(
      "No valid Flashcard Genius decks were found in the selected files or folders.",
    )
  }

  const materialized = materializeDeckDocuments(
    loadedDocuments.map((item) => item.document),
  )
  const cardSources: Record<string, CardSource> = {}
  let materializedCardIndex = 0

  for (const loaded of loadedDocuments) {
    for (const [cardIndex, card] of flattenCards(
      loaded.originalDocument,
    ).entries()) {
      const materializedCard = materialized.cards[materializedCardIndex]
      if (materializedCard) {
        if (loaded.isImageDeck) {
          materializedCard.imageAsQuestion = true
        } else {
          cardSources[materializedCard.id] = {
            filePath: loaded.filePath,
            cardIndex,
            question: card.question,
            answer: card.answer,
            difficulty: card.difficulty,
            hasDifficultyColumn: card.hasDifficultyColumn,
          }
        }
      }
      materializedCardIndex += 1
    }
  }

  return {
    ...materialized,
    cardSources,
    sourceContents,
    sourcePaths: Object.keys(sourceContents),
    skippedFiles,
    sourceLabel:
      loadedDocuments.length === 1
        ? loadedDocuments[0].document.title
        : "Flashcard Genius",
  }
}

export async function loadVaultSelection(
  app: App,
  selection: VaultSelection,
): Promise<VaultLoadResult> {
  return loadVaultSelections(app, [selection])
}
