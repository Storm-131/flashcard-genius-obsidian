import { expect, test } from '@playwright/test'

for (const width of [1440, 420]) {
  for (const mode of ['library', 'study'] as const) {
    test(`disables Stars and shows the column hint in ${mode} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      // Replace only the preview data; exercise the actual application and toolbar.
      await page.route('**/src/previewFixtures.ts', route => route.fulfill({
        contentType: 'application/javascript',
        body: `export const previewCards = ${JSON.stringify([{
          id: 'unrated', deckId: 'preview', question: 'Question', answer: 'Answer with details',
          tags: [], difficulty: 0, hasDifficultyColumn: false,
        }])}`,
      }))
      await page.goto('/')
      await expect(page.locator('.workspace-card')).toHaveCount(1)
      if (mode === 'study') await page.getByRole('button', { name: 'Study', exact: true }).click()
      const stars = page.getByRole('button', { name: 'Stars', exact: true })
      if (!await stars.isVisible()) {
        await page.getByRole('button', { name: mode === 'study' ? 'Open study controls' : 'Open library controls' }).click()
      }
      await expect(stars).toBeDisabled()
      await expect(stars).toHaveCSS('opacity', '0.6')
      await expect(stars).toHaveAttribute('aria-pressed', 'false')
      const hintTrigger = page.locator('[aria-label="Stars unavailable"]')
      await hintTrigger.hover()
      const hint = page.getByRole('tooltip')
      await expect(hint).toHaveText('These decks have no rating column. Name the last column ⭐, *, or Difficulty.')
      const bounds = await hint.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
      await page.screenshot({ path: testInfo.outputPath('stars-hint.png') })
      await page.mouse.move(0, 0)
      await expect(hint).toBeHidden()
      await hintTrigger.focus()
      await expect(hint).toBeVisible()
      await hintTrigger.press('Escape')
      await expect(hint).toBeHidden()
      await expect(page.getByRole('group', { name: 'Difficulty rating' })).toHaveCount(0)
    })
  }
}
