import { PluginSettingTab, Setting, TFolder, type App } from 'obsidian'
import type FlashcardGeniusPlugin from './main'

export interface FlashcardGeniusSettings {
  defaultFlashcardFolder: string | null
}

export const DEFAULT_SETTINGS: FlashcardGeniusSettings = {
  defaultFlashcardFolder: null,
}

export class FlashcardGeniusSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: FlashcardGeniusPlugin) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    const folders = this.app.vault.getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder)
      .sort((left, right) => left.path.localeCompare(right.path))

    new Setting(containerEl)
      .setName('Default flashcard folder')
      .setDesc('Flashcard Genius loads all Markdown decks in this vault folder and its subfolders when the view opens.')
      .addDropdown(dropdown => {
        dropdown.addOption('', 'No default folder')
        for (const folder of folders) dropdown.addOption(folder.path, folder.path)
        dropdown.setValue(this.plugin.settings.defaultFlashcardFolder ?? '')
        dropdown.onChange(async value => {
          await this.plugin.updateSettings({ defaultFlashcardFolder: value || null })
          this.display()
        })
      })

    new Setting(containerEl)
      .setName('Clear default flashcard folder')
      .setDesc('Open Flashcard Genius with an empty deck list.')
      .addButton(button => button
        .setButtonText('Clear')
        .setWarning()
        .setDisabled(!this.plugin.settings.defaultFlashcardFolder)
        .onClick(async () => {
          await this.plugin.updateSettings({ defaultFlashcardFolder: null })
          this.display()
        }))
  }
}
