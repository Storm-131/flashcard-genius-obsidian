import type { App } from 'obsidian'
import { describe, expect, it, vi } from 'vitest'
import { parseDeckMarkdown } from '@flashcard-genius/core'
import { persistCardDifficulty, StarConflictError, StarPersistenceError } from './starPersistence'

import { TFile } from 'obsidian'

function createVault(markdown: string) {
  const modify = vi.fn().mockResolvedValue(undefined)
  const app = {
    vault: { getAbstractFileByPath: () => new TFile(), cachedRead: async () => markdown, modify },
  } as unknown as App
  const source = { filePath: 'birds.md', cardIndex: 0, ...parseDeckMarkdown(markdown).topics[0].cards[0] }
  return { app, source, modify }
}

describe('positional difficulty persistence', () => {
  it.each([' |', ''])('changes only the final cell and preserves images, answers and line endings (ending %j)', ending => {
    const markdown = ['# Birds', '| Image | Name | Species | Rating |', '| --- | --- | --- | --- |',
      '|    |    |    |    |', `| ![[bird.webp\\|100]] | **Bird** | $A|B$ | 1${ending}`].join('\r\n')
    const { app, source, modify } = createVault(markdown)
    const expected = markdown.replace(/1( \|)?$/, '5$1')
    return expect(persistCardDifficulty(app, source, markdown, 5)).resolves.toBe(expected).then(() => {
      expect(modify).toHaveBeenCalledWith(expect.any(TFile), expected)
      expect(parseDeckMarkdown(expected).topics[0].cards[0].difficulty).toBe(5)
    })
  })

  it('keeps card indices aligned across multiple tables and empty answer cells', async () => {
    const markdown = '# Deck\n| Q | A | Detail | Rating |\n| --- | --- | --- | --- |\n| One | Answer | | 1 |\n| | | | |\n\n## Second\n| Q | A | Rating |\n| --- | --- | --- |\n| Two | Answer | 2 |'
    const { app, modify } = createVault(markdown)
    const source = { filePath: 'birds.md', cardIndex: 1, ...parseDeckMarkdown(markdown).topics[1].cards[0] }
    const updated = await persistCardDifficulty(app, source, markdown, 4)
    expect(updated).toBe(markdown.replace('| Two | Answer | 2 |', '| Two | Answer | 4 |'))
    expect(modify).toHaveBeenCalledTimes(1)
  })

  it.each([
    '# Deck\n| Q | A |\n| --- | --- |\n| Question | Answer |',
    '# Deck\n| Q | A | Detail |\n| --- | --- | --- |\n| Question | Answer | Important |',
    '# Deck\n| Q | A | Number |\n| --- | --- | --- |\n| Question | Answer | 5 |',
    '# Deck\n| Q | A | Detail | More |\n| --- | --- | --- | --- |\n| Question | Answer | More text | 3 |',
    '# Deck\n| Q | A | Rating |\n| --- | --- | --- |\n| Question | Answer |',
  ])('does not overwrite an answer when the difficulty cell is absent', async markdown => {
    const { app, source, modify } = createVault(markdown)
    await expect(persistCardDifficulty(app, source, markdown, 3)).rejects.toBeInstanceOf(StarPersistenceError)
    expect(modify).not.toHaveBeenCalled()
  })

  it('checks the actual header even if an older source has no capability metadata', async () => {
    const markdown = '# Deck\n| Q | A | Notes |\n| --- | --- | --- |\n| Question | Answer | 5 |'
    const { app, source, modify } = createVault(markdown)
    delete source.hasDifficultyColumn
    await expect(persistCardDifficulty(app, source, markdown, 3)).rejects.toBeInstanceOf(StarPersistenceError)
    expect(modify).not.toHaveBeenCalled()
  })

  it('updates only the rated card in mixed tables under the same topic', async () => {
    const markdown = '# Deck\n| Q | A | Notes |\n| --- | --- | --- |\n| One | Answer | 5 |\n\n| Q | A | Stars |\n| --- | --- | --- |\n| Two | Answer | 2 |\n\n| Q | A |\n| --- | --- |\n| Three | Answer |'
    const { app, modify } = createVault(markdown)
    const source = { filePath: 'birds.md', cardIndex: 1, ...parseDeckMarkdown(markdown).topics[0].cards[1] }
    const updated = await persistCardDifficulty(app, source, markdown, 4)
    expect(updated).toBe(markdown.replace('| Two | Answer | 2 |', '| Two | Answer | 4 |'))
    expect(modify).toHaveBeenCalledTimes(1)
  })

  it.each(['⭐', '⭐️', '★', '*', 'Sterne', 'Stars', 'Schwierigkeit', 'Difficulty', 'Rating'])(
    'persists ratings for the recognised header %s', async header => {
      const markdown = `# Deck\n| Q | A | ${header} |\n| --- | --- | --- |\n| Question | Answer | 1 |`
      const { app, source } = createVault(markdown)
      await expect(persistCardDifficulty(app, source, markdown, 5)).resolves.toBe(markdown.replace('| 1 |', '| 5 |'))
    },
  )

  it('refuses to overwrite externally changed Markdown', async () => {
    const markdown = '# Deck\n| Q | A | Stars |\n| --- | --- | --- |\n| Question | Answer | 1 |'
    const { app, source, modify } = createVault(markdown)
    await expect(persistCardDifficulty(app, source, `${markdown}\n`, 3)).rejects.toBeInstanceOf(StarConflictError)
    expect(modify).not.toHaveBeenCalled()
  })
})
