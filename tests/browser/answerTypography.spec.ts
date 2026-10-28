import { expect, test } from '@playwright/test'

test('derives image and text answer fonts from their fitted references with the manual slider', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Study', exact: true }).click()
  const image = page.locator('.flip-card[data-card-id="bird-long"]')
  const text = page.locator('.flip-card[data-card-id="text-columns"]')
  await image.click()
  const parts = image.locator('.card-answer-part')
  await expect(parts).toHaveCount(3)
  const sizes = () => parts.evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)))
  const original = await sizes()
  for (let index = 1; index < original.length; index++) {
    expect(original[index]).toBeCloseTo(original[index - 1] * 0.85, 2)
  }
  const questionFont = await text.locator('[data-fit-question]').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize))
  expect(await text.locator('.card-answer-part').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeCloseTo(questionFont * 0.85, 2)
  await expect(text.locator('.flip-card-back [data-fit-question]')).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(image.locator('.answer-column-divider')).toHaveCount(2)
  await expect(image.locator('.flip-card-back img')).toHaveCount(0)
  await expect(image.locator('.image-question-answer, .study-answer-info')).toHaveCount(0)
  const control = page.getByRole('button', { name: 'Card size', exact: true })
  await control.click()
  await page.getByRole('slider', { name: 'Card font size' }).fill('150')
  await expect.poll(async () => (await sizes())[0]).toBeCloseTo(original[0] * 1.5, 2)
  await page.getByRole('button', { name: '2', exact: true }).click()
  const larger = await sizes()
  for (let index = 1; index < larger.length; index++) {
    expect(larger[index]).toBeCloseTo(larger[index - 1] * 0.85, 2)
  }
  await expect(parts.nth(1).locator('em')).toHaveCSS('font-style', 'italic')
})

test('retains Library front geometry on selection and derives secondary fonts from the primary', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
  const card = page.locator('#workspace-card-bird-long')
  const image = card.getByRole('img')
  const before = await image.boundingBox()
  await card.click({ position: { x: 5, y: 5 } })
  const after = await image.boundingBox()
  expect(after!.width).toBe(before!.width)
  expect(after!.height).toBe(before!.height)
  const fonts = await card.locator('.card-answer-part').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)))
  for (let index = 1; index < fonts.length; index++) {
    expect(fonts[index]).toBeCloseTo(fonts[index - 1] * 0.85, 2)
  }
  await expect(card.locator('.answer-column-divider')).toHaveCount(2)
  await expect(card.locator('textarea')).toHaveCount(0)
  await expect(page.locator('#workspace-card-text-columns .answer-column-divider')).toHaveCount(2)
})
