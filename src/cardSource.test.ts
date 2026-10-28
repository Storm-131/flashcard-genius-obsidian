import { describe, expect, it, vi } from 'vitest'
import { TFile, type App, type WorkspaceLeaf } from 'obsidian'
import { openMarkdownSourceBesidePlugin } from './cardSource'

function workspace() {
  const split = {}
  const pluginLeaf = { parent: { parent: split }, openFile: vi.fn() } as unknown as WorkspaceLeaf
  const neighbor = { parent: { parent: split }, openFile: vi.fn().mockResolvedValue(undefined) } as unknown as WorkspaceLeaf
  const markdownLeaves: WorkspaceLeaf[] = []
  const createLeafBySplit = vi.fn(() => { markdownLeaves.push(neighbor); return neighbor })
  const file = Object.assign(new TFile(), { path: 'Deck.md' })
  const app = {
    workspace: { getLeavesOfType: vi.fn(() => markdownLeaves), createLeafBySplit, revealLeaf: vi.fn() },
    vault: { getAbstractFileByPath: vi.fn().mockReturnValue(file) },
  } as unknown as App
  return { app, pluginLeaf, neighbor, markdownLeaves, createLeafBySplit, file }
}

describe('opening Markdown beside the plugin', () => {
  it('splits beside the actual plugin leaf and reuses that pane on the next click', async () => {
    const { app, pluginLeaf, neighbor, createLeafBySplit, file } = workspace()
    await openMarkdownSourceBesidePlugin(app, pluginLeaf, 'Deck.md')
    await openMarkdownSourceBesidePlugin(app, pluginLeaf, 'Deck.md')
    expect(createLeafBySplit).toHaveBeenCalledExactlyOnceWith(pluginLeaf, 'vertical', false)
    expect(neighbor.openFile).toHaveBeenCalledWith(file, { state: { mode: 'source' } })
    expect(neighbor.openFile).toHaveBeenCalledTimes(2)
    expect(pluginLeaf.openFile).not.toHaveBeenCalled()
  })

  it('reuses an existing sibling Markdown pane but never a tab in the plugin pane', async () => {
    const { app, pluginLeaf, neighbor, markdownLeaves, createLeafBySplit } = workspace()
    const samePane = { parent: pluginLeaf.parent, openFile: vi.fn() } as unknown as WorkspaceLeaf
    markdownLeaves.push(samePane, neighbor)
    await openMarkdownSourceBesidePlugin(app, pluginLeaf, 'Deck.md')
    expect(createLeafBySplit).not.toHaveBeenCalled()
    expect(samePane.openFile).not.toHaveBeenCalled()
    expect(neighbor.openFile).toHaveBeenCalledOnce()
    expect(app.workspace.revealLeaf).toHaveBeenCalledWith(neighbor)
  })

  it('does not create panes for missing or non-Markdown files', async () => {
    const { app, pluginLeaf, createLeafBySplit } = workspace()
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null)
    await expect(openMarkdownSourceBesidePlugin(app, pluginLeaf, 'Missing.md')).rejects.toThrow('could not be found')
    vi.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(Object.assign(new TFile(), { extension: 'png' }))
    await expect(openMarkdownSourceBesidePlugin(app, pluginLeaf, 'image.png')).rejects.toThrow('could not be found')
    expect(createLeafBySplit).not.toHaveBeenCalled()
  })
})
