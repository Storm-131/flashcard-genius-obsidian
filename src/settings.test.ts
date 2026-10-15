import { describe, expect, it, vi } from 'vitest'
import type { App, Setting, SettingGroup, SettingDefinitionRender } from 'obsidian'
import type FlashcardGeniusPlugin from './main'

const host = vi.hoisted(() => ({ modern: true, changes: [] as Array<(value: string) => Promise<void>> }))
vi.mock('obsidian', () => {
  class SettingMock {
    setName() { return this }
    setDesc() { return this }
    addDropdown(callback: (dropdown: unknown) => void) {
      const dropdown = {
        addOption() { return this },
        setValue() { return this },
        onChange(change: (value: string) => Promise<void>) { host.changes.push(change); return this },
      }
      callback(dropdown)
      return this
    }
    addButton(callback: (button: unknown) => void) {
      const button = {
        buttonEl: { addClass() {} },
        setButtonText() { return this },
        setDestructive() { return this },
        setDisabled() { return this },
        onClick() { return this },
      }
      callback(button)
      return this
    }
  }
  return {
    Setting: SettingMock,
    TFolder: class {},
    requireApiVersion: () => host.modern,
    PluginSettingTab: class {
      containerEl = { empty: vi.fn(), addClass: vi.fn() }
      update = vi.fn()
      constructor(readonly app: unknown) {}
    },
  }
})
import { FlashcardGeniusSettingTab } from './settings'

describe('settings host compatibility', () => {
  it.each([false, true])('preserves persistence and refresh on a modern host: %s', async modern => {
    host.modern = modern
    host.changes = []
    const settings = { defaultFlashcardFolder: null as string | null }
    const updateSettings = vi.fn(async value => Object.assign(settings, value))
    const tab = new FlashcardGeniusSettingTab(
      { vault: { getAllLoadedFiles: () => [] } } as unknown as App,
      { settings, updateSettings } as unknown as FlashcardGeniusPlugin,
    )
    const definitions = tab.getSettingDefinitions() as SettingDefinitionRender[]
    expect(definitions.map(definition => definition.name)).toEqual([
      'Default flashcard folder', 'Clear default flashcard folder',
    ])
    // Modern hosts render searchable definitions; old hosts call display().
    if (modern) {
      const { Setting: SettingMock } = await import('obsidian')
      definitions[0].render(new SettingMock(tab.containerEl) as Setting, {} as SettingGroup)
    } else tab.display()
    await host.changes[0]('Biology')
    expect(settings.defaultFlashcardFolder).toBe('Biology')
    expect(updateSettings).toHaveBeenCalledWith({ defaultFlashcardFolder: 'Biology' })
    expect(tab.update).toHaveBeenCalledTimes(modern ? 1 : 0)
    if (!modern) expect(tab.containerEl.empty).toHaveBeenCalledTimes(2)
  })
})
