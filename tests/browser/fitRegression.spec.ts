import { expect, test, type Locator, type Page } from '@playwright/test'

const picture = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#99D9BD"/></svg>')}`
const imageParts = ['**Blauer Drache**', '*Glaucus atlanticus*', 'Zusätzliche Informationen über diese Meeresschnecke.']
const fixtures = [
  { id: 'image', question: `![Image](${picture})`, answer: imageParts.join('\n\n'), answerParts: imageParts.map((content, columnIndex) => ({ content, columnIndex })) },
  { id: 'single', question: `![Single](${picture})`, answer: 'Ein kurzer Name', answerParts: [{ content: 'Ein kurzer Name', columnIndex: 0 }] },
  { id: 'text', question: 'Wahrscheinlichkeitsverteilung im Modell?', answer: 'Die Antwort bleibt lesbar und bei Bedarf scrollbar.' },
  { id: 'extreme', question: 'Dies ist eine extrem lange Frage mit verständlichen Wörtern. '.repeat(100), answer: 'Eine kurze Antwort.' },
].map(card => ({ ...card, deckId: 'preview', tags: [], difficulty: 0, hasDifficultyColumn: false }))

const font = (element: Locator) => element.evaluate(node => parseFloat(getComputedStyle(node).fontSize))
async function setColumns(page: Page, count: number) {
  const size = page.getByRole('button', { name: 'Card size', exact: true })
  await size.click()
  await page.getByRole('button', { name: String(count), exact: true }).click()
  await size.click()
}

test.beforeEach(async ({ page }) => {
  await page.route('**/src/previewFixtures.ts', route => route.fulfill({ contentType: 'application/javascript', body: `export const previewCards = ${JSON.stringify(fixtures)}` }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
})

test('Library image answers reserve the first viewport for answer one using a single scroll owner', async ({ page }, testInfo) => {
  const card = page.locator('#workspace-card-image')
  const viewport = card.locator('.card-content-viewport')
  const primary = card.locator('.is-primary-answer')
  const extra = card.locator('.library-additional-answers')
  for (const count of [4, 6, 2]) {
    await setColumns(page, count)
    await expect.poll(() => card.locator('.image-card-answer').evaluate(node => (node as HTMLElement).style.getPropertyValue('--image-primary-font-size'))).not.toBe('')
    await expect.poll(() => extra.evaluate(node => node.getBoundingClientRect().top >= node.closest('.card-content-viewport')!.getBoundingClientRect().bottom)).toBe(true)
    const bounds = await primary.boundingBox()
    const frame = await viewport.boundingBox()
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(frame!.y + frame!.height + 1)
    expect(bounds!.y).toBeGreaterThanOrEqual(frame!.y)
    const parts = card.locator('.card-answer-part')
    expect(await font(parts.nth(1))).toBeCloseTo(await font(primary) * 0.75, 2)
    await expect.poll(() => page.locator('#workspace-card-single .card-content-viewport').evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1)
  }
  await setColumns(page, 4)
  await page.screenshot({ path: testInfo.outputPath('library-initial.png') })
  await card.click({ position: { x: 5, y: 5 } })
  await expect(viewport).toHaveCSS('overflow-y', 'auto')
  await viewport.evaluate(node => { node.scrollTop = node.scrollHeight })
  await expect.poll(() => extra.evaluate(node => node.getBoundingClientRect().bottom <= node.closest('.card-content-viewport')!.getBoundingClientRect().bottom + 1)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('library-scrolled.png') })
  await page.locator('#workspace-card-single').click({ position: { x: 5, y: 5 } })
  expect(await viewport.evaluate(node => node.scrollTop)).toBe(0)
  const single = page.locator('#workspace-card-single .card-content-viewport')
  expect(await single.evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1)
})

test('fits text questions in width and height and derives text and image answer fonts exactly once', async ({ page }, testInfo) => {
  for (const mode of ['library', 'study']) {
    if (mode === 'study') await page.getByRole('button', { name: 'Study', exact: true }).click()
    const card = page.locator('[data-card-id="text"]')
    const question = card.locator('[data-fit-question]').first()
    const answer = card.locator('.card-answer-part').first()
    for (const count of [4, 6, 2]) {
      await setColumns(page, count)
      await expect.poll(() => card.evaluate(node => (node as HTMLElement).style.getPropertyValue('--card-question-font-size'))).not.toBe('')
      await expect.poll(() => question.evaluate(node => {
        const slot = node.closest('.question-fit-slot')!
        return node.scrollWidth <= slot.clientWidth + 1 && node.scrollHeight <= slot.clientHeight + 1
      })).toBe(true)
      expect(await font(answer)).toBeCloseTo(await font(question) * 0.75, 2)
      await expect(card.getByRole('button', { name: 'Read full question' }).first()).toHaveCount(0)
      expect(await question.evaluate(node => getComputedStyle(node).overflowWrap)).toBe('normal')
    }
    await page.getByRole('button', { name: 'Card size', exact: true }).click()
    const slider = page.getByRole('slider', { name: 'Card font size' })
    const before = await font(question)
    await slider.fill('150')
    await expect.poll(() => font(question)).toBeCloseTo(before * 1.5, 2)
    expect(await font(answer)).toBeCloseTo(await font(question) * 0.75, 2)
    await slider.fill('100')
    await page.getByRole('button', { name: 'Card size', exact: true }).click()
    if (mode === 'study') {
      const image = page.locator('.flip-card[data-card-id="image"]')
      await image.click({ position: { x: 5, y: 5 } })
      await expect.poll(() => image.locator('.flip-card-inner').evaluate(node => getComputedStyle(node).transform)).toMatch(/^matrix3d\(-1,/)
      const parts = image.locator('.card-answer-part')
      const imageFonts = await parts.evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)))
      for (let index = 1; index < imageFonts.length; index++) {
        expect(imageFonts[index]).toBeCloseTo(imageFonts[index - 1] * 0.75, 2)
      }
      await expect(image.locator('.library-additional-answers')).toHaveCount(0)
    }
    await page.screenshot({ path: testInfo.outputPath(`${mode}-fitting.png`) })
  }
})

test('offers the complete question explicitly when the readable minimum is insufficient', async ({ page }) => {
  const card = page.locator('#workspace-card-extreme')
  await expect(card.getByRole('button', { name: 'Read full question' })).toBeVisible()
  expect(await font(card.locator('[data-fit-question]'))).toBe(10)
  await card.getByRole('button', { name: 'Read full question' }).click()
  const dialog = page.getByRole('dialog', { name: 'Full question' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(fixtures[3].question.trim())
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})
