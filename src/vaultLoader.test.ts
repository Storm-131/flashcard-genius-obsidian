import type { App } from 'obsidian'
import { TFile } from 'obsidian'
import { describe, expect, it, vi } from 'vitest'
import birdsMarkdown from '../packages/core/src/fixtures/birds.md?raw'
import { loadVaultSelections } from './vaultLoader'

describe('vault Markdown import', () => {
  it('imports all birds, resolves image questions and retains the original source for star writes', async () => {
    const note = Object.assign(new TFile(), { path: 'Species/Vögel 🦜.md', name: 'Vögel 🦜.md', basename: 'Vögel 🦜', extension: 'md' })
    const getFirstLinkpathDest = vi.fn((imagePath: string) => Object.assign(new TFile(), { path: `attachments/${imagePath}` }))
    const app = {
      vault: {
        getAbstractFileByPath: () => note,
        cachedRead: async () => birdsMarkdown,
        getResourcePath: (file: TFile) => `app://vault/${file.path}`,
      },
      metadataCache: { getFirstLinkpathDest },
    } as unknown as App
    const loaded = await loadVaultSelections(app, [{ kind: 'file', path: note.path }])
    expect(loaded.skippedFiles).toEqual([])
    expect(loaded.cards).toHaveLength(27)
    expect(loaded.cards[0].question).toBe('![[app://vault/attachments/Kohlmeise.webp|100]]')
    expect(loaded.cards[0].answer).toBe('**Kohlmeise**\n(*Parus major*)')
    expect(loaded.cardSources[loaded.cards[0].id].question).toBe('![[Kohlmeise.webp|100]]')
    expect(loaded.sourceContents[note.path]).toBe(birdsMarkdown)
    expect(getFirstLinkpathDest).toHaveBeenCalledWith('Kohlmeise.webp', note.path)
    expect(getFirstLinkpathDest).not.toHaveBeenCalledWith('Kohlmeise.webp|100', note.path)
  })
})
