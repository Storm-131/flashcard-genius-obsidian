import { expect, test } from '@playwright/test'

const cards = Array.from({ length: 12 }, (_, index) => ({
  id: `c${index}`, deckId: 'preview', question: `Question ${index}`, answer: `Answer ${index}`,
  tags: [], difficulty: 0, hasDifficultyColumn: index !== 1,
}))

test.beforeEach(async ({ page }) => {
  await page.route('**/src/previewFixtures.ts', route => route.fulfill({
    contentType: 'application/javascript', body: `export const previewCards = ${JSON.stringify(cards)}`,
  }))
  await page.goto('/')
})

test('synchronises selection and keyboard focus across Finder, Library and Study', async ({ page }) => {
  const libraryCard = page.locator('#workspace-card-c0')
  await libraryCard.click()
  await expect(libraryCard).toHaveClass(/is-card-selected/)
  const finder = page.locator('[data-sidebar-card-id="c0"]')
  await expect(finder).toHaveAttribute('aria-current', 'true')
  const columns = await libraryCard.evaluate(node => getComputedStyle(node.parentElement!).gridTemplateColumns.split(' ').length)
  await libraryCard.press('ArrowDown')
  await expect(page.locator(`#workspace-card-c${columns}`)).toHaveClass(/is-card-selected/)
  await expect(page.locator(`#workspace-card-c${columns}`)).toBeFocused()
  await page.getByRole('button', { name: 'Study', exact: true }).click()
  const studyCard = page.locator(`.flip-card[data-card-id="c${columns}"]`)
  await expect(studyCard).toHaveClass(/is-card-selected/)
  await expect(studyCard).toBeFocused()
  await expect(page.locator('.study-mode').getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await page.keyboard.press('Space')
  await expect(studyCard.locator('.flip-card-inner')).toHaveClass(/is-flipped/)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator(`.flip-card[data-card-id="c${columns + 1}"]`)).toHaveClass(/is-card-selected/)
  await expect(studyCard.locator('.flip-card-inner')).toHaveClass(/is-flipped/)
  await finder.click()
  await expect(page.locator('.study-mode')).toBeVisible()
  await expect(page.locator('.flip-card[data-card-id="c0"]')).toHaveClass(/is-card-selected/)
  await page.getByRole('button', { name: 'Library', exact: true }).click()
  await expect(libraryCard).toHaveClass(/is-card-selected/)
  const root = page.locator('.flashcard-genius-root')
  const before = await libraryCard.boundingBox()
  await root.evaluate(node => node.classList.add('theme-dark'))
  await expect(libraryCard).toHaveCSS('outline-style', 'solid')
  expect(await libraryCard.boundingBox()).toEqual(before)
})

test('keeps typing and outside shortcuts local while rating only writable cards', async ({ page }) => {
  await page.locator('#workspace-card-c0').click()
  await page.getByRole('button', { name: 'Study', exact: true }).click()
  await page.keyboard.press('5')
  await page.getByRole('button', { name: 'Stars', exact: true }).click()
  const rated = page.locator('.flip-card[data-card-id="c0"]')
  await expect(rated.getByRole('button', { name: 'Set difficulty to 5 out of 5' }).first()).toHaveAttribute('aria-pressed', 'true')
  await rated.click()
  await rated.press('ArrowRight')
  const unrated = page.locator('.flip-card[data-card-id="c1"]')
  await unrated.press('5')
  await expect(unrated.getByRole('button', { name: '0 out of 5 stars' }).first()).toBeDisabled()
  const search = page.getByPlaceholder('Search cards…')
  await search.focus()
  await search.press('ArrowRight')
  await search.press('Space')
  await expect(unrated).toHaveClass(/is-card-selected/)
  await expect(unrated.locator('.flip-card-inner')).not.toHaveClass(/is-flipped/)
  await page.evaluate(() => {
    const input = document.createElement('textarea')
    input.id = 'external-editor'
    document.body.append(input)
    input.focus()
  })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await expect(unrated).toHaveClass(/is-card-selected/)
})
