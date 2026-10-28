import { expect, test } from '@playwright/test'

const image = (width: number, height: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#99D9BD"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 3}" fill="#167556"/></svg>`)}`
const columns = ['**Blauer Drache**', '*Glaucus atlanticus*', 'Meeresschnecke.\nLebt im offenen Meer.', '$x^2 + y^2 = 1$']

test('fills front image frames, renders compact column dividers and preserves controls at four cards per row', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  const cards = [[120, 90], [90, 120], [100, 100], [40, 30]].map(([width, height], index) => ({
    id: `image-${index}`, deckId: 'preview', question: `![Image ${index}](${image(width, height)})`,
    answer: columns.join('\n\n'), answerParts: columns.map((content, columnIndex) => ({ content, columnIndex })),
    tags: [], difficulty: 3, hasDifficultyColumn: true,
  }))
  await page.route('**/src/previewFixtures.ts', route => route.fulfill({ contentType: 'application/javascript', body: `export const previewCards = ${JSON.stringify(cards)}` }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
  await page.getByRole('button', { name: 'Study', exact: true }).click()
  const cardsInGrid = page.locator('.flip-card')
  await expect(cardsInGrid).toHaveCount(4)
  expect(await cardsInGrid.first().evaluate(node => getComputedStyle(node.parentElement!).gridTemplateColumns.split(' ').length)).toBe(4)
  // Native Obsidian embeds may cap their wrappers as well as the image itself.
  const firstImage = cardsInGrid.first().locator('.flip-card-face:not(.flip-card-back) img')
  await firstImage.evaluate(node => {
    const wrapper = node.closest('.markdown-image')!
    const embed = document.createElement('span')
    embed.className = 'internal-embed image-embed'
    embed.style.maxWidth = '40px'
    embed.style.maxHeight = '30px'
    wrapper.replaceWith(embed)
    embed.append(wrapper)
  })
  for (const card of await cardsInGrid.all()) {
    const front = card.locator('.flip-card-face:not(.flip-card-back)')
    const imageNode = front.locator('img')
    await expect.poll(() => imageNode.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true)
    const metrics = await imageNode.evaluate((node: HTMLImageElement) => {
      const frame = node.closest('.study-image-question')!.getBoundingClientRect()
      const box = node.getBoundingClientRect()
      const scale = Math.min(box.width / node.naturalWidth, box.height / node.naturalHeight)
      return { width: node.naturalWidth * scale, height: node.naturalHeight * scale, availableWidth: frame.width, availableHeight: frame.height }
    })
    expect(metrics.width).toBeLessThanOrEqual(metrics.availableWidth + 1)
    expect(metrics.height).toBeLessThanOrEqual(metrics.availableHeight + 1)
    expect(Math.min(Math.abs(metrics.width - metrics.availableWidth), Math.abs(metrics.height - metrics.availableHeight))).toBeLessThan(1)
    await expect(imageNode).toHaveCSS('object-fit', 'contain')
  }
  await page.screenshot({ path: testInfo.outputPath('four-column-fronts.png') })
  for (const card of await cardsInGrid.all()) await card.click({ position: { x: 8, y: 8 } })
  const selected = cardsInGrid.last()
  await expect.poll(() => selected.locator('.flip-card-inner').evaluate(node => getComputedStyle(node).transform)).toMatch(/^matrix3d\(-1,/)
  await expect(page.locator('.flip-card.is-card-selected')).toHaveCount(1)
  for (const card of await cardsInGrid.all()) {
    const back = card.locator('.flip-card-back')
    await expect(back.locator('img')).toHaveCount(0)
    const lines = back.locator('.answer-column-divider')
    expect(await lines.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).height))).toEqual(['3px', '2px', '2px'])
    const fonts = await back.locator('.card-answer-part').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)))
    for (let index = 1; index < fonts.length; index++) {
      expect(fonts[index]).toBeCloseTo(fonts[index - 1] * 0.75, 2)
    }
    const gaps = await lines.evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).marginTop) + parseFloat(getComputedStyle(node).marginBottom)))
    expect(Math.max(...gaps)).toBeLessThan(22)
    await expect(back.locator('em')).toHaveCSS('font-style', 'italic')
  }
  await page.screenshot({ path: testInfo.outputPath('four-column-answers.png') })
  await page.getByRole('button', { name: 'Stars', exact: true }).click()
  await selected.locator('.flip-card-back').getByRole('button', { name: 'Set difficulty to 5 out of 5' }).click()
  await expect(selected.locator('.flip-card-inner')).toHaveClass(/is-flipped/)
  await selected.click({ position: { x: 8, y: 8 } })
  await expect(selected.locator('.flip-card-inner')).not.toHaveClass(/is-flipped/)
  await selected.getByRole('button', { name: 'Enlarge image: Image 3' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(selected.locator('.flip-card-inner')).not.toHaveClass(/is-flipped/)
  await page.keyboard.press('Escape')
  await expect(selected.locator('.flip-card-inner')).toHaveCSS('transition-duration', '0.38s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(selected.locator('.flip-card-inner')).toHaveCSS('transition-duration', '0s')
})

for (const mode of ['library', 'study'] as const) {
  test(`scrolls only the selected ${mode} card while inactive cards pass wheel scrolling to the grid`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 })
    const cards = Array.from({ length: 24 }, (_, index) => ({
      id: `long-${index}`, deckId: 'preview', question: `Question ${index}`,
      answer: Array.from({ length: 35 }, (_, part) => `Paragraph ${part}: This answer remains readable by scrolling.`).join('\n\n'),
      tags: [], difficulty: 0, hasDifficultyColumn: false,
    }))
    await page.route('**/src/previewFixtures.ts', route => route.fulfill({ contentType: 'application/javascript', body: `export const previewCards = ${JSON.stringify(cards)}` }))
    await page.goto('/')
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
    if (mode === 'study') await page.getByRole('button', { name: 'Study', exact: true }).click()
    const first = page.locator('[data-card-id="long-0"]')
    const second = page.locator('[data-card-id="long-1"]')
    const gridScroll = first.locator('..').locator('..')
    const viewport = first.locator(mode === 'study' ? '.flip-card-back .card-content-viewport' : '.card-content-viewport')
    const visibleInactiveViewport = first.locator('.card-content-viewport').first()
    await expect(visibleInactiveViewport).toHaveCSS('overflow-y', 'clip')
    expect(await viewport.evaluate(node => { node.scrollTop = 100; return node.scrollTop })).toBe(0)
    await visibleInactiveViewport.hover()
    await page.mouse.wheel(0, 160)
    await expect.poll(() => gridScroll.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
    expect(await visibleInactiveViewport.evaluate(node => node.scrollTop)).toBe(0)
    await gridScroll.evaluate(node => { node.scrollTop = 0 })
    await first.click({ position: { x: 8, y: 8 } })
    if (mode === 'study') await expect.poll(() => first.locator('.flip-card-inner').evaluate(node => getComputedStyle(node).transform)).toMatch(/^matrix3d\(-1,/)
    await expect(viewport).toHaveCSS('overflow-y', 'auto')
    await viewport.hover()
    await page.mouse.wheel(0, 120)
    await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
    await second.click({ position: { x: 8, y: 8 } })
    await expect(viewport).toHaveCSS('overflow-y', 'clip')
    expect(await viewport.evaluate(node => node.scrollTop)).toBe(0)
    const secondViewport = second.locator(mode === 'study' ? '.flip-card-back .card-content-viewport' : '.card-content-viewport')
    expect(await secondViewport.evaluate(node => node.scrollTop)).toBe(0)
  })
}
