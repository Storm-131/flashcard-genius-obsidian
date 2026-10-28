import { TFile, type App, type WorkspaceLeaf } from 'obsidian'

export async function openMarkdownSourceBesidePlugin(app: App, pluginLeaf: WorkspaceLeaf, filePath: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filePath)
  if (!(file instanceof TFile) || file.extension.toLowerCase() !== 'md') {
    throw new Error('The Markdown source could not be found.')
  }
  // Reuse a sibling Markdown pane, never another tab in the plugin's tab group.
  const neighbor = app.workspace.getLeavesOfType('markdown').find(leaf =>
    leaf !== pluginLeaf && leaf.parent !== pluginLeaf.parent &&
    leaf.parent.parent === pluginLeaf.parent.parent,
  )
  const leaf = neighbor ?? app.workspace.createLeafBySplit(pluginLeaf, 'vertical', false)
  await leaf.openFile(file, { state: { mode: 'source' } })
  await app.workspace.revealLeaf(leaf)
}
