import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Component, ItemView, MarkdownRenderer, MarkdownView, Notice, TFile, type App, type EditorPosition, type TAbstractFile, type WorkspaceLeaf } from 'obsidian'
import type { Card } from '@flashcard-genius/core'
import { ImageAssetsProvider, ReadonlyFlashcardApp, type MarkdownRenderContext } from '@flashcard-genius/ui'
import { VaultImageResolver } from './VaultImageResolver'
import { persistCardDifficulty, StarConflictError } from './starPersistence'
import {
  createEmptyVaultLoadResult,
  loadVaultSelections,
  type VaultLoadResult,
  type VaultSelection,
} from './vaultLoader'

export const FLASHCARD_GENIUS_VIEW_TYPE = 'flashcard-genius-view'

interface ContentProps {
  data: VaultLoadResult
  error: string | null
  loading: boolean
  onPersistDifficulty: (card: Card, difficulty: number) => Promise<void>
  onOpenCardSource: (card: Card) => void
  onClearDecksFromView: () => void
  markdownContext: MarkdownRenderContext
  cardSourcePaths: Record<string, string>
}

function splitTableRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  const normalized = line.trim().replace(/^\||\|$/g, '')
  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized[index] === '\\' && normalized[index + 1] === '|') {
      current += '\\|'
      index += 1
    } else if (normalized[index] === '|') {
      cells.push(current.trim())
      current = ''
    } else {
      current += normalized[index]
    }
  }
  cells.push(current.trim())
  return cells
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)
}

function findQuestionLine(markdown: string, question: string, cardIndex: number): number {
  const normalizedQuestion = question.trim().replace(/\\\|/g, '|')
  const lines = markdown.split(/\r?\n/)
  let parsedCardIndex = 0

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].trim().startsWith('|') || !isTableDivider(lines[index + 1])) continue
    index += 2
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const rawQuestion = splitTableRow(lines[index])[0]?.replace(/\\\|/g, '|').trim() ?? ''
      if (parsedCardIndex === cardIndex && rawQuestion === normalizedQuestion) return index
      parsedCardIndex += 1
      index += 1
    }
    index -= 1
  }

  const fallbackIndex = lines.findIndex(line => line.replace(/\\\|/g, '|').includes(normalizedQuestion))
  return fallbackIndex >= 0 ? fallbackIndex : 0
}

function ViewContent({ data, error, loading, onPersistDifficulty, onOpenCardSource, onClearDecksFromView, markdownContext, cardSourcePaths }: ContentProps) {
  if (loading && data.cards.length === 0) {
    return <div className="flashcard-genius-root flashcard-genius-view-message">Loading flashcards…</div>
  }
  if (error && data.cards.length === 0) {
    return <div className="flashcard-genius-root flashcard-genius-view-message">{error}</div>
  }

  return (
    <ImageAssetsProvider resolver={new VaultImageResolver()}>
      <ReadonlyFlashcardApp
        categories={data.categories}
        decks={data.decks}
        topics={data.topics}
        cards={data.cards}
        cardOrderByDeck={data.cardOrderByDeck}
        onPersistDifficulty={onPersistDifficulty}
        onOpenCardSource={onOpenCardSource}
        cardSourceKeys={Object.fromEntries(Object.entries(data.cardSources).map(([cardId, source]) => [cardId, `${source.cardIndex}:${source.question}`]))}
        cardSourcePaths={cardSourcePaths}
        markdownContext={markdownContext}
        onClearDecksFromView={onClearDecksFromView}
        onImageDeckActionBlocked={action => {
          new Notice(action === 'edit'
            ? 'Edit is not available for image decks.'
            : 'Stars are not available for image decks.')
        }}
        sidebarCollapseBreakpoint={1024}
      />
    </ImageAssetsProvider>
  )
}

export class FlashcardGeniusView extends ItemView {
  private reactRoot: Root | null = null
  private selections: VaultSelection[] = []
  private data: VaultLoadResult = createEmptyVaultLoadResult()
  private error: string | null = null
  private loading = false
  private initialized = false
  private sourceLeaf: WorkspaceLeaf | null = null
  private modifyTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private ownWriteTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private ownWritePaths = new Set<string>()

  constructor(leaf: WorkspaceLeaf, private readonly obsidianApp: App) {
    super(leaf)
  }

  getViewType(): string {
    return FLASHCARD_GENIUS_VIEW_TYPE
  }

  getDisplayText(): string {
    return this.data.sourceLabel ? `Flashcard Genius: ${this.data.sourceLabel}` : 'Flashcard Genius'
  }

  getIcon(): string {
    return 'brain-circuit'
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty()
    this.contentEl.addClass('flashcard-genius-obsidian-host')
    this.registerEvent(this.obsidianApp.vault.on('modify', file => {
      if (file instanceof TFile) this.handleVaultModify(file)
    }))
    this.registerEvent(this.obsidianApp.vault.on('rename', (file, oldPath) => { void this.handleVaultRename(file, oldPath) }))
    this.registerEvent(this.obsidianApp.vault.on('delete', file => { void this.handleVaultDelete(file) }))
    this.reactRoot = createRoot(this.contentEl)
    this.render()
  }

  async onClose(): Promise<void> {
    for (const timer of this.modifyTimers.values()) clearTimeout(timer)
    for (const timer of this.ownWriteTimers.values()) clearTimeout(timer)
    this.modifyTimers.clear()
    this.ownWriteTimers.clear()
    this.ownWritePaths.clear()
    this.reactRoot?.unmount()
    this.reactRoot = null
  }

  hasInitializedContent(): boolean {
    return this.initialized
  }

  async showEmpty(): Promise<void> {
    this.selections = []
    this.data = createEmptyVaultLoadResult()
    this.error = null
    this.loading = false
    this.initialized = true
    this.render()
    this.app.workspace.requestSaveLayout()
  }

  async openSelection(selection: VaultSelection): Promise<void> {
    await this.replaceSelections([selection])
  }

  async appendSelection(selection: VaultSelection): Promise<void> {
    await this.replaceSelections([...this.selections, selection])
  }

  async replaceSelections(selections: VaultSelection[]): Promise<void> {
    this.selections = this.uniqueSelections(selections)
    this.initialized = true
    await this.reloadSelections()
  }

  getState(): Record<string, unknown> {
    return this.selections.length > 0 ? { selections: this.selections } : {}
  }

  async setState(state: Record<string, unknown>): Promise<void> {
    const rawSelections = Array.isArray(state.selections)
      ? state.selections
      : state.selection ? [state.selection] : []
    const selections = rawSelections.filter((selection): selection is VaultSelection => (
      Boolean(selection)
      && typeof selection === 'object'
      && 'path' in selection
      && typeof selection.path === 'string'
      && 'kind' in selection
      && (selection.kind === 'file' || selection.kind === 'folder')
    ))

    if (selections.length > 0) await this.replaceSelections(selections)
  }

  private async persistDifficulty(card: Card, difficulty: number): Promise<void> {
    const source = this.data.cardSources[card.id]
    if (!source) {
      throw new Error('This card has no writable Markdown source.')
    }

    const expectedContent = this.data.sourceContents[source.filePath]
    if (expectedContent === undefined) {
      throw new Error('The source Markdown file is no longer loaded.')
    }

    try {
      this.markOwnWrite(source.filePath)
      const updatedContent = await persistCardDifficulty(this.obsidianApp, source, expectedContent, difficulty)
      this.data.sourceContents[source.filePath] = updatedContent
      this.data.cardSources[card.id] = { ...source, difficulty }
      this.data.cards = this.data.cards.map(item => item.id === card.id ? { ...item, difficulty } : item)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The star rating could not be saved.'
      new Notice(message)
      if (error instanceof StarConflictError) await this.reloadSelections()
      throw error
    }
  }

  private markOwnWrite(path: string): void {
    this.ownWritePaths.add(path)
    const previousTimer = this.ownWriteTimers.get(path)
    if (previousTimer) clearTimeout(previousTimer)
    const timer = setTimeout(() => {
      this.ownWritePaths.delete(path)
      this.ownWriteTimers.delete(path)
    }, 1000)
    this.ownWriteTimers.set(path, timer)
  }

  private handleVaultModify(file: TFile): void {
    if (file.extension.toLocaleLowerCase() !== 'md' || !this.data.sourcePaths.includes(file.path)) return
    if (this.ownWritePaths.has(file.path)) return

    const previousTimer = this.modifyTimers.get(file.path)
    if (previousTimer) clearTimeout(previousTimer)
    const timer = setTimeout(() => {
      this.modifyTimers.delete(file.path)
      void this.refreshDeck(file.path)
    }, 250)
    this.modifyTimers.set(file.path, timer)
  }

  private async handleVaultRename(file: TAbstractFile, oldPath: string): Promise<void> {
    const affectedPaths = this.data.sourcePaths.filter(path => path === oldPath || path.startsWith(`${oldPath}/`))
    if (affectedPaths.length === 0) return

    const newPathForOldPath = (path: string) => `${file.path}${path.slice(oldPath.length)}`
    this.selections = this.selections.map(selection => (
      selection.path === oldPath || selection.path.startsWith(`${oldPath}/`)
        ? { ...selection, path: `${file.path}${selection.path.slice(oldPath.length)}` }
      : selection
    ))
    for (const affectedPath of affectedPaths) {
      await this.refreshDeck(affectedPath, newPathForOldPath(affectedPath))
    }
  }

  private async handleVaultDelete(file: TAbstractFile): Promise<void> {
    const affectedPaths = this.data.sourcePaths.filter(path => path === file.path || path.startsWith(`${file.path}/`))
    if (affectedPaths.length === 0) return

    this.selections = this.selections.filter(selection => selection.path !== file.path)
    this.removeDecks(affectedPaths)
    new Notice(`${affectedPaths.length} deck${affectedPaths.length === 1 ? '' : 's'} removed because the source was deleted.`)
  }

  private async refreshDeck(oldPath: string, newPath = oldPath): Promise<void> {
    if (oldPath !== newPath && !this.data.sourcePaths.includes(oldPath)) return
    if (oldPath === newPath && !this.data.sourcePaths.includes(oldPath)) return

    try {
      const refreshed = await loadVaultSelections(this.obsidianApp, [{ path: newPath, kind: 'file' }])
      this.mergeDeck(oldPath, newPath, refreshed)
      this.error = null
      this.render()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The changed deck could not be reloaded.'
      this.error = message
      new Notice(message)
      this.render()
    }
  }

  private mergeDeck(oldPath: string, newPath: string, refreshed: VaultLoadResult): void {
    const oldDeck = this.data.decks.find(deck => deck.sourceFileName === oldPath)
    const oldDeckId = oldDeck?.id
    const oldCategoryName = oldDeck?.categoryId
      ? this.data.categories.find(category => category.id === oldDeck.categoryId)?.name
      : undefined
    const refreshedDeck = refreshed.decks[0]
    if (!refreshedDeck) {
      this.removeDecks([oldPath])
      return
    }

    const keptDecks = oldDeckId ? this.data.decks.filter(deck => deck.id !== oldDeckId) : this.data.decks
    const keptTopics = oldDeckId ? this.data.topics.filter(topic => topic.deckId !== oldDeckId) : this.data.topics
    const keptCards = oldDeckId ? this.data.cards.filter(card => card.deckId !== oldDeckId) : this.data.cards
    const keptOrders = oldDeckId
      ? Object.fromEntries(Object.entries(this.data.cardOrderByDeck).filter(([deckId]) => deckId !== oldDeckId))
      : this.data.cardOrderByDeck
    const refreshedCategoryName = refreshedDeck.categoryId
      ? refreshed.categories.find(category => category.id === refreshedDeck.categoryId)?.name
      : undefined
    const categoryName = oldCategoryName ?? refreshedCategoryName
    const existingCategory = categoryName
      ? this.data.categories.find(category => category.name.toLocaleLowerCase() === categoryName.toLocaleLowerCase())
      : undefined
    const refreshedCategory = categoryName && !existingCategory
      ? refreshed.categories.find(category => category.name.toLocaleLowerCase() === categoryName.toLocaleLowerCase())
      : undefined
    const refreshedTopics = refreshed.topics.map(topic => ({
      ...topic,
      deckId: oldDeckId ?? topic.deckId,
    }))
    const refreshedCards = refreshed.cards.map(card => ({
      ...card,
      deckId: oldDeckId ?? card.deckId,
    }))
    const refreshedOrder = refreshed.cardOrderByDeck[refreshedDeck.id] ?? []
    const deck = {
      ...refreshedDeck,
      id: oldDeckId ?? refreshedDeck.id,
      sourceFileName: newPath,
      categoryId: existingCategory?.id ?? refreshedCategory?.id ?? null,
    }
    const refreshedSourceEntries = Object.entries(refreshed.cardSources)
    const keptSourceEntries = Object.entries(this.data.cardSources).filter(([, source]) => source.filePath !== oldPath && source.filePath !== newPath)
    const keptContents = Object.fromEntries(Object.entries(this.data.sourceContents).filter(([path]) => path !== oldPath && path !== newPath))
    const keptPaths = this.data.sourcePaths.filter(path => path !== oldPath && path !== newPath)

    this.data = {
      ...this.data,
      categories: refreshedCategory && !existingCategory ? [...this.data.categories, refreshedCategory] : this.data.categories,
      decks: [...keptDecks, deck],
      topics: [...keptTopics, ...refreshedTopics],
      cards: [...keptCards, ...refreshedCards],
      cardOrderByDeck: { ...keptOrders, [deck.id]: refreshedOrder },
      cardSources: Object.fromEntries([...keptSourceEntries, ...refreshedSourceEntries]),
      sourceContents: { ...keptContents, ...refreshed.sourceContents },
      sourcePaths: [...keptPaths, newPath],
      skippedFiles: this.data.skippedFiles.filter(path => path !== oldPath && path !== newPath),
    }
  }

  private removeDecks(paths: string[]): void {
    const pathSet = new Set(paths)
    const removedDeckIds = new Set(this.data.decks.filter(deck => deck.sourceFileName && pathSet.has(deck.sourceFileName)).map(deck => deck.id))
    if (removedDeckIds.size === 0) return

    this.data = {
      ...this.data,
      decks: this.data.decks.filter(deck => !removedDeckIds.has(deck.id)),
      topics: this.data.topics.filter(topic => !removedDeckIds.has(topic.deckId)),
      cards: this.data.cards.filter(card => !removedDeckIds.has(card.deckId)),
      cardOrderByDeck: Object.fromEntries(Object.entries(this.data.cardOrderByDeck).filter(([deckId]) => !removedDeckIds.has(deckId))),
      cardSources: Object.fromEntries(Object.entries(this.data.cardSources).filter(([, source]) => !pathSet.has(source.filePath))),
      sourceContents: Object.fromEntries(Object.entries(this.data.sourceContents).filter(([path]) => !pathSet.has(path))),
      sourcePaths: this.data.sourcePaths.filter(path => !pathSet.has(path)),
    }
    this.render()
  }

  private async openCardSource(card: Card): Promise<void> {
    const source = this.data.cardSources[card.id]
    if (!source) return

    const file = this.obsidianApp.vault.getAbstractFileByPath(source.filePath)
    if (!(file instanceof TFile)) {
      new Notice('The Markdown source for this card could not be found.')
      return
    }

    try {
      if (!this.sourceLeaf) {
        this.sourceLeaf = this.app.workspace.createLeafBySplit(this.leaf, 'vertical', true)
      }
      await this.sourceLeaf.openFile(file)
      await this.app.workspace.revealLeaf(this.sourceLeaf)

      if (!(this.sourceLeaf.view instanceof MarkdownView)) return
      const markdown = await this.obsidianApp.vault.cachedRead(file)
      const line = findQuestionLine(markdown, source.question, source.cardIndex)
      const position: EditorPosition = { line, ch: 0 }
      const lineEnd: EditorPosition = { line, ch: markdown.split(/\r?\n/)[line]?.length ?? 0 }
      this.sourceLeaf.view.editor.setSelection(position, lineEnd)
      this.sourceLeaf.view.editor.scrollIntoView({ from: position, to: lineEnd }, true)
      this.sourceLeaf.view.editor.focus()
    } catch {
      new Notice('The Markdown source could not be opened.')
    }
  }

  private async reloadSelections(): Promise<void> {
    this.loading = true
    this.error = null
    this.render()

    try {
      this.data = await loadVaultSelections(this.obsidianApp, this.selections)
    } catch (error) {
      this.data = createEmptyVaultLoadResult()
      this.error = error instanceof Error ? error.message : 'The flashcards could not be loaded.'
    } finally {
      this.loading = false
      this.render()
      this.app.workspace.requestSaveLayout()
    }
  }

  private uniqueSelections(selections: VaultSelection[]): VaultSelection[] {
    const seen = new Set<string>()
    return selections.filter(selection => {
      const key = `${selection.kind}:${selection.path}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private render(): void {
    this.reactRoot?.render(
      <StrictMode>
        <ViewContent
          data={this.data}
          error={this.error}
          loading={this.loading}
          onPersistDifficulty={(card, difficulty) => this.persistDifficulty(card, difficulty)}
          onOpenCardSource={card => { void this.openCardSource(card) }}
          onClearDecksFromView={() => { void this.showEmpty() }}
          markdownContext={{ app: this.obsidianApp, component: this, createComponent: () => new Component(), render: MarkdownRenderer.render }}
          cardSourcePaths={Object.fromEntries(Object.entries(this.data.cardSources).map(([cardId, source]) => [cardId, source.filePath]))}
        />
      </StrictMode>,
    )
  }
}
