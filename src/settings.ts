import { PluginSettingTab, Setting, TFolder, requireApiVersion, type App, type SettingDefinitionItem } from 'obsidian'
import type FlashcardGeniusPlugin from './main'

export interface FlashcardGeniusSettings {
  defaultFlashcardFolder: string | null
}

export const DEFAULT_SETTINGS: FlashcardGeniusSettings = {
  defaultFlashcardFolder: null,
}

const folderName = 'Default flashcard folder'
const folderDescription = 'Flashcard Genius loads all Markdown decks in this vault folder and its subfolders when the view opens.'
const clearName = 'Clear default flashcard folder'
const clearDescription = 'Open Flashcard Genius with an empty deck list.'

export class FlashcardGeniusSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: FlashcardGeniusPlugin) {
    super(app, plugin)
  }

  // Obsidian 1.13+ indexes these definitions for settings search. Older hosts
  // continue to call display(), using the same controls and persistence below.
  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      { name: folderName, desc: folderDescription, render: setting => this.addFolderDropdown(setting) },
      { name: clearName, desc: clearDescription, render: setting => this.addClearButton(setting) },
    ]
  }

  display(): void {
    this.renderLegacySettings()
  }

  private renderLegacySettings(): void {
    const { containerEl } = this
    containerEl.empty()
    this.addFolderDropdown(new Setting(containerEl).setName(folderName).setDesc(folderDescription))
    this.addClearButton(new Setting(containerEl).setName(clearName).setDesc(clearDescription))
  }

  private refreshSettings(): void {
    if (requireApiVersion('1.13.0')) this.update()
    else this.renderLegacySettings()
  }

  private addFolderDropdown(setting: Setting): void {
    this.containerEl.addClass('flashcard-genius-settings')
    const folders = this.app.vault.getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder)
      .sort((left, right) => left.path.localeCompare(right.path))

    setting.addDropdown(dropdown => {
      dropdown.addOption('', 'No default folder')
      for (const folder of folders) dropdown.addOption(folder.path, folder.path)
      dropdown.setValue(this.plugin.settings.defaultFlashcardFolder ?? '')
      dropdown.onChange(async value => {
        await this.plugin.updateSettings({ defaultFlashcardFolder: value || null })
        this.refreshSettings()
      })
    })
  }

  private addClearButton(setting: Setting): void {
    this.containerEl.addClass('flashcard-genius-settings')
    setting.addButton(button => {
      button.setButtonText('Clear')
      if (requireApiVersion('1.13.0')) button.setDestructive()
      else button.buttonEl.addClass('mod-warning')
      return button
        .setDisabled(!this.plugin.settings.defaultFlashcardFolder)
        .onClick(async () => {
          await this.plugin.updateSettings({ defaultFlashcardFolder: null })
          this.refreshSettings()
        })
    })
  }
}
