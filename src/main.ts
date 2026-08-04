import { Menu, Notice, Plugin, TFile, TFolder, type TAbstractFile, type WorkspaceLeaf } from 'obsidian'
import '@flashcard-genius/ui/styles.css'
import './plugin.css'
import { FlashcardGeniusView, FLASHCARD_GENIUS_VIEW_TYPE } from './FlashcardGeniusView'
import { DEFAULT_SETTINGS, FlashcardGeniusSettingTab, type FlashcardGeniusSettings } from './settings'
import type { VaultSelection } from './vaultLoader'

export default class FlashcardGeniusPlugin extends Plugin {
  settings: FlashcardGeniusSettings = DEFAULT_SETTINGS

  async onload(): Promise<void> {
    await this.loadSettings()

    this.registerView(
      FLASHCARD_GENIUS_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new FlashcardGeniusView(leaf, this.app),
    )
    this.addSettingTab(new FlashcardGeniusSettingTab(this.app, this))

    this.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
      const selection = this.selectionFromFile(file)
      if (!selection) return

      menu.addItem(item => item
        .setTitle('Open in Flashcard Genius')
        .setIcon('brain-circuit')
        .onClick(() => this.openSelection(selection)))
    }))

    this.addCommand({
      id: 'open-current-note',
      name: 'Open current note in Flashcard Genius',
      checkCallback: checking => {
        const file = this.app.workspace.getActiveFile()
        if (!file || file.extension.toLocaleLowerCase() !== 'md') return false
        if (!checking) void this.openSelection({ path: file.path, kind: 'file' })
        return true
      },
    })

    this.addRibbonIcon('brain-circuit', 'Open Flashcard Genius', () => {
      void this.focusFlashcardGenius()
    })
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(FLASHCARD_GENIUS_VIEW_TYPE)
  }

  async updateSettings(settings: Partial<FlashcardGeniusSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings }
    await this.saveData(this.settings)
  }

  private async loadSettings(): Promise<void> {
    const savedSettings = await this.loadData() as Partial<FlashcardGeniusSettings> | null
    this.settings = { ...DEFAULT_SETTINGS, ...savedSettings }
  }

  private selectionFromFile(file: TAbstractFile): VaultSelection | null {
    if (file instanceof TFile && file.extension.toLocaleLowerCase() === 'md') {
      return { path: file.path, kind: 'file' }
    }
    if (file instanceof TFolder) return { path: file.path, kind: 'folder' }
    return null
  }

  private async openSelection(selection: VaultSelection): Promise<void> {
    const view = await this.ensureView(false)
    if (!view) return
    await view.appendSelection(selection)
  }

  private async focusFlashcardGenius(): Promise<void> {
    const view = await this.ensureView(true)
    if (!view) return
  }

  private async ensureView(loadDefaultFolder: boolean): Promise<FlashcardGeniusView | null> {
    const existingLeaf = this.app.workspace.getLeavesOfType(FLASHCARD_GENIUS_VIEW_TYPE)[0]
    const leaf = existingLeaf ?? this.app.workspace.getLeaf('tab')
    const isNewView = !existingLeaf

    if (isNewView) await leaf.setViewState({ type: FLASHCARD_GENIUS_VIEW_TYPE, active: true })
    const view = leaf.view
    if (!(view instanceof FlashcardGeniusView)) {
      new Notice('Flashcard Genius could not open its view.')
      return null
    }

    await this.app.workspace.revealLeaf(leaf)

    if (loadDefaultFolder && !view.hasInitializedContent()) {
      const selection = await this.getDefaultFolderSelection()
      if (selection) await view.openSelection(selection)
      else await view.showEmpty()
    }

    return view
  }

  private async getDefaultFolderSelection(): Promise<VaultSelection | null> {
    const path = this.settings.defaultFlashcardFolder
    if (!path) return null

    const folder = this.app.vault.getAbstractFileByPath(path)
    if (folder instanceof TFolder) return { path: folder.path, kind: 'folder' }

    await this.updateSettings({ defaultFlashcardFolder: null })
    new Notice('The configured default flashcard folder was renamed or deleted. The setting was cleared.')
    return null
  }
}
