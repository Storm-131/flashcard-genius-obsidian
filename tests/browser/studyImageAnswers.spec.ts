import { expect, test, type Locator, type Page } from "@playwright/test"

const imageCard = (page: Page, id: string) => page.locator(`.flip-card[data-card-id="${id}"]`)
const answerPart = (card: Locator, index: number) => card.locator(`[data-column-index="${index}"]`)
const fontSize = (part: Locator) => part.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))

async function columns(page: Page, count: number) {
  const control = page.getByRole("button", { name: "Card size", exact: true })
  if (await control.isVisible()) await control.click()
  else await page.getByRole("button", { name: "Open study controls" }).click()
  await page.getByRole("button", { name: String(count), exact: true }).click()
  if (await control.isVisible()) await control.click()
  else await page.getByRole("button", { name: "Open study controls" }).click()
}

test.beforeEach(async ({ page }) => {
  // Substitute test data in the preview module, keeping the actual production
  // components and the ordinary preview/Library fixtures unchanged on disk.
  await page.route("**/src/previewFixtures.ts", async (route) => {
    const response = await route.fetch()
    const body = (await response.text())
      .replace('"**Türkentaube**"', '"**Blauer Drache (Blaue Fadenschnecke)**"')
      .replace('"*Streptopelia*"', '"*Glaucus atlanticus*"')
      .replace('"Zusatzinformation"',
        JSON.stringify("Kann Nesselzellen gefressener Quallen speichern und zur eigenen Verteidigung nutzen. ".repeat(15)) +
        ', "Letzte Zusatzspalte: vollständig erreichbar."')
      .replace('"**Grünspecht**"', JSON.stringify("**Vampirtintenfisch**"))
      .replace('"*Picus viridis*"', JSON.stringify(`*${"Longissimusspeciesname".repeat(3)}*`))
    await route.fulfill({ response, body })
  })
  await page.goto("/")
  await page.getByRole("button", { name: "Study", exact: true }).click()
  for (const id of ["bird-short", "bird-long", "bird-green", "bird-wide", "bird-empty"])
    await imageCard(page, id).click()
  await expect(imageCard(page, "bird-long").locator(".study-name-line")).toHaveCount(2)
  await expect.poll(() => imageCard(page, "bird-long").locator(".flip-card-inner")
    .evaluate((node) => getComputedStyle(node).transform)).toMatch(/^matrix3d\(-1,/)
})

test("fits whole words and derives the secondary size from the fitted primary", async ({ page }) => {
  await columns(page, 4)
  const card = imageCard(page, "bird-green")
  const primary = answerPart(card, 0)
  const secondary = answerPart(card, 1)
  await expect.poll(() => primary.evaluate((node) => Number((node as HTMLElement).style.getPropertyValue("--answer-fit-scale"))))
    .toBeLessThan(1)
  expect(await fontSize(secondary)).toBeLessThanOrEqual(await fontSize(primary) * 0.75 + 0.01)
  const short = imageCard(page, "bird-short")
  expect(await fontSize(answerPart(short, 1))).toBeCloseTo(await fontSize(answerPart(short, 0)) * 0.75, 2)
  const checkWords = async () => {
    for (const part of [primary, secondary]) {
      const metrics = await part.evaluate((node) => {
        const range = document.createRange()
        range.selectNodeContents(node.querySelector("p")!)
        return {
          height: range.getBoundingClientRect().height,
          lineHeight: parseFloat(getComputedStyle(node).lineHeight),
          overflow: node.scrollWidth - node.clientWidth,
        }
      })
      expect(metrics.height).toBeLessThanOrEqual(metrics.lineHeight + 1)
      expect(metrics.overflow).toBeLessThanOrEqual(0)
    }
  }
  await checkWords()
  await page.getByRole("button", { name: "Card size", exact: true }).click()
  const slider = page.getByRole("slider", { name: "Card font size" })
  await slider.focus()
  await slider.press("End")
  await checkWords()
  expect(await fontSize(secondary)).toBeLessThanOrEqual(await fontSize(primary) * 0.75 + 0.01)
  await slider.press("Home")
  await checkWords()
})

test("shows notes only after scrolling, resets on reveal and avoids empty scroll areas", async ({ page }, testInfo) => {
  await columns(page, 4)
  const card = imageCard(page, "bird-long")
  const region = card.locator(".study-image-answer")
  const metrics = await region.evaluate((node) => {
    const names = node.querySelector(".study-answer-name-content")!.getBoundingClientRect()
    const info = node.querySelector(".study-answer-info")!.getBoundingClientRect()
    const bounds = node.getBoundingClientRect()
    return {
      center: Math.abs(names.top + names.height / 2 - (bounds.top + node.clientHeight / 2)),
      infoBelow: info.top >= bounds.bottom,
      outerScroll: node.parentElement!.scrollHeight > node.parentElement!.clientHeight,
    }
  })
  expect(metrics.center).toBeLessThan(2)
  expect(metrics.infoBelow).toBe(true)
  expect(metrics.outerScroll).toBe(false)
  const noNotes = imageCard(page, "bird-short").locator(".study-image-answer")
  expect(await noNotes.evaluate((node) => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1)
  await page.locator('.flip-card:not([data-card-id^="bird-"])').evaluateAll((nodes) =>
    nodes.forEach((node) => { (node as HTMLElement).style.display = "none" }))
  await page.locator(".study-mode").evaluate((node) => { node.lastElementChild!.scrollTop = 0 })
  await page.locator(".study-mode").screenshot({ path: testInfo.outputPath("study-image-answers-four.png") })
  await region.focus()
  await region.press("End")
  await expect.poll(() => answerPart(card, 3).evaluate((node) =>
    node.getBoundingClientRect().bottom <= node.closest(".study-image-answer")!.getBoundingClientRect().bottom + 1))
    .toBe(true)
  await expect.poll(() => region.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
  await card.click({ position: { x: 8, y: 8 } })
  await card.click({ position: { x: 8, y: 8 } })
  await expect.poll(() => region.evaluate((node) => node.scrollTop)).toBe(0)
})
