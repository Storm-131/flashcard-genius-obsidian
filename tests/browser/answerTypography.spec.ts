import { expect, test, type Locator, type Page } from "@playwright/test"

function card(page: Page, id: string) {
  return page.locator(`.flip-card[data-card-id="${id}"]`)
}

function part(page: Page, id: string, columnIndex: number) {
  return card(page, id).locator(
    `.card-answer-part[data-column-index="${columnIndex}"]`,
  )
}

async function fontSize(element: Locator) {
  return element.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))
}

async function openSize(page: Page) {
  const size = page.getByRole("button", { name: "Card size", exact: true })
  if (await size.isVisible()) await size.click()
  else await page.getByRole("button", { name: "Open study controls" }).click()
}

async function columns(page: Page, count: number) {
  await openSize(page)
  await page.getByRole("button", { name: String(count), exact: true }).click()
  await openSize(page)
}

async function assertTextFits(element: Locator) {
  await expect.poll(() => element.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
  const metrics = await element.evaluate((node) => {
    const box = node.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(node.querySelector(".markdown-content")!)
    return {
      overflow: node.scrollWidth - node.clientWidth,
      outside: Array.from(range.getClientRects()).some((rect) =>
        rect.left < box.left - 2 || rect.right > box.right + 2),
    }
  })
  expect(metrics.overflow).toBeLessThanOrEqual(1)
  expect(metrics.outside).toBe(false)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Study", exact: true }).click()
  for (const id of [
    "bird-short",
    "bird-long",
    "bird-green",
    "bird-wide",
    "bird-empty",
    "text-answer",
    "text-columns",
  ])
    await card(page, id).click()
  // Wait for the flip transition; transformed bounding boxes are not layout widths.
  await expect
    .poll(() =>
      card(page, "bird-wide")
        .locator(".flip-card-inner")
        .evaluate((node) => getComputedStyle(node).transform),
    )
    .toMatch(/^matrix3d\(-1,/)
})

test("keeps column hierarchy, compact spacing and a centered answer group", async ({
  page,
}) => {
  const primary = part(page, "bird-short", 0)
  const secondary = part(page, "bird-short", 1)
  await assertTextFits(primary)
  await assertTextFits(secondary)
  expect((await fontSize(primary)) / (await fontSize(secondary))).toBeCloseTo(
    2 / 1.5,
    2,
  )
  const gap = await secondary.evaluate((node) => {
    const previous = node.previousElementSibling!
    return (
      (node.getBoundingClientRect().top -
        previous.getBoundingClientRect().bottom) /
      parseFloat(getComputedStyle(node).fontSize)
    )
  })
  expect(gap).toBeCloseTo(0.4, 1)
  const centerOffset = await card(page, "bird-short")
    .locator(".study-answer-name-content")
    .evaluate((node) => {
      const viewport = node.closest<HTMLElement>(".card-content-viewport")!
      const style = getComputedStyle(viewport)
      const top =
        viewport.getBoundingClientRect().top + parseFloat(style.paddingTop)
      const height =
        viewport.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom)
      const box = node.getBoundingClientRect()
      return Math.abs(box.top + box.height / 2 - (top + height / 2))
    })
  expect(centerOffset).toBeLessThan(2)
  await expect(secondary.locator("em")).toHaveCSS("font-style", "italic")
  const empty = card(page, "bird-empty")
  await expect(empty.locator('[data-column-index="0"]')).toHaveCount(0)
  expect(
    (await fontSize(part(page, "bird-empty", 1))) /
      (await fontSize(part(page, "bird-empty", 2))),
  ).toBeCloseTo(1.5 / 0.8, 2)
  const factors = await card(page, "bird-long")
    .locator(".card-answer-part")
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        getComputedStyle(node).getPropertyValue("--answer-column-scale"),
      ),
    )
  expect(factors.map(Number)).toEqual([2, 1.5, 1])
  expect(
    (await fontSize(part(page, "text-columns", 0))) /
      (await fontSize(part(page, "text-columns", 1))),
  ).toBeCloseTo(1, 2)
  expect(
    (await fontSize(part(page, "text-columns", 1))) /
      (await fontSize(part(page, "text-columns", 2))),
  ).toBeCloseTo(1, 2)
})

test("wraps long names and restores their size after widening the card", async ({
  page,
}) => {
  await columns(page, 6)
  await openSize(page)
  const height = page.getByRole("slider", { name: /^Height/ })
  await height.focus()
  await height.press("End")
  await openSize(page)
  const long = part(page, "bird-wide", 1)
  const short = part(page, "bird-short", 1)
  await assertTextFits(long)
  await assertTextFits(short)
  expect(await fontSize(long)).toBeLessThanOrEqual(await fontSize(part(page, "bird-wide", 0)) * 0.75 + 0.01)
  const small = await fontSize(long)
  const longScale = await long.evaluate((node) =>
    parseFloat(
      (node as HTMLElement).style.getPropertyValue("--answer-fit-scale"),
    ),
  )
  const shortScale = await short.evaluate((node) =>
    parseFloat(
      (node as HTMLElement).style.getPropertyValue("--answer-fit-scale"),
    ),
  )
  expect(shortScale).toBeGreaterThanOrEqual(longScale)
  for (const [id, index] of [
    ["bird-long", 1],
    ["bird-empty", 1],
    ["bird-green", 0],
  ] as const)
    await assertTextFits(part(page, id, index))
  await columns(page, 3)
  await assertTextFits(long)
  await expect.poll(() => fontSize(long)).toBeGreaterThan(small)
  await expect
    .poll(() =>
      long.evaluate((node) =>
        parseFloat(
          (node as HTMLElement).style.getPropertyValue("--answer-fit-scale"),
        ),
      ),
    )
    .toBe(1)
  await page.setViewportSize({ width: 950, height: 850 })
  await assertTextFits(long)
})

test("keeps text fonts independent of card size, preserves scrolling and applies the font slider once", async ({
  page,
}) => {
  await columns(page, 5)
  const text = card(page, "text-answer").locator(
    ".text-question-answer .card-answer-part",
  )
  const image = part(page, "bird-short", 1)
  const primary = part(page, "bird-short", 0)
  // Only the primary font is based directly on the manual scale. The secondary
  // is derived from the fitted primary, so its rendered size may grow less.
  const preferredPrimaryFont = () => primary.evaluate((node) => {
    const fit = Number((node as HTMLElement).style.getPropertyValue("--answer-fit-scale")) || 1
    return parseFloat(getComputedStyle(node).fontSize) / fit
  })
  const smallText = await fontSize(text)
  const smallImage = await fontSize(image)
  expect(smallText).toBeCloseTo(13 * 1.125, 3)
  const frontQuestion = card(page, "text-answer").locator(
    ".flip-card-face:not(.flip-card-back) .study-text-content",
  )
  const backQuestion = card(page, "text-answer").locator(
    ".card-heading .study-text-content",
  )
  for (const count of [2, 3, 4, 5]) {
    await columns(page, count)
    expect(await fontSize(text)).toBe(smallText)
    expect(await fontSize(frontQuestion)).toBeCloseTo(13.5 * 1.125, 3)
    expect(await fontSize(backQuestion)).toBeCloseTo(14 * 1.125, 3)
    for (const index of [0, 1, 2])
      expect(await fontSize(part(page, "text-columns", index))).toBe(smallText)
  }
  await columns(page, 3)
  // Exercise fitting with wider glyph metrics, independently of the host OS font.
  await primary.evaluate((node) => {
    (node as HTMLElement).style.letterSpacing = "0.12em"
  })
  const largeText = await fontSize(text)
  const largeImage = await fontSize(image)
  const largePreferredPrimary = await preferredPrimaryFont()
  expect(largeText).toBe(smallText)
  expect(largeImage).toBeGreaterThan(smallImage)
  const viewport = card(page, "text-answer").locator(
    ".flip-card-back .card-content-viewport",
  )
  expect(
    await viewport.evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true)
  expect(
    await text.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true)
  await viewport.evaluate((node) => {
    node.scrollTop = node.scrollHeight
  })
  const last = text.getByText("Textabsatz 15:", { exact: false })
  expect(
    await last.evaluate(
      (node) =>
        node.getBoundingClientRect().bottom <=
        node.closest(".card-content-viewport")!.getBoundingClientRect().bottom +
          1,
    ),
  ).toBe(true)
  const uiButton = page.getByRole("button", { name: "Card size", exact: true })
  const uiFont = await fontSize(uiButton)
  await openSize(page)
  const slider = page.getByRole("slider", { name: "Card font size" })
  await slider.focus()
  await slider.press("Home")
  for (let step = 0; step < 16; step++) await slider.press("ArrowRight")
  await expect(slider).toHaveValue("150")
  await expect.poll(() => fontSize(text)).toBeCloseTo(largeText * 1.5, 0)
  await expect.poll(preferredPrimaryFont).toBeCloseTo(largePreferredPrimary * 1.5, 2)
  await assertTextFits(primary)
  await assertTextFits(image)
  await expect.poll(async () => (await fontSize(image)) / (await fontSize(primary)))
    .toBeCloseTo(0.75, 3)
  await expect.poll(() => primary.evaluate((node) =>
    Number((node as HTMLElement).style.getPropertyValue("--answer-fit-scale"))))
    .toBeLessThan(1)
  const fittedImage = await fontSize(image)
  expect(fittedImage).toBeGreaterThan(largeImage)
  expect(fittedImage).toBeLessThanOrEqual(largeImage * 1.5 + 0.01)
  expect(await fontSize(uiButton)).toBe(uiFont)
  await openSize(page)
  await page.getByRole("button", { name: "Library", exact: true }).click()
  await expect(page.locator(".workspace-card")).toHaveCount(14)
  await page.getByRole("button", { name: "Study", exact: true }).click()
  await card(page, "bird-short").click()
  await assertTextFits(part(page, "bird-short", 0))
})

test("refits asynchronously rendered native Markdown and contains host paragraph margins", async ({
  page,
}) => {
  await columns(page, 6)
  const answer = part(page, "bird-short", 1)
  const initialFont = await fontSize(answer)
  await answer.locator(".markdown-content").evaluate((node) => {
    const paragraph = document.createElement("p")
    paragraph.style.margin = "3em 0"
    const italic = document.createElement("em")
    italic.textContent = "Dendrocopos major"
    paragraph.append(italic)
    node.replaceChildren(paragraph)
  })
  await expect.poll(() => fontSize(answer)).toBeLessThanOrEqual(initialFont)
  await assertTextFits(answer)
  await expect(answer.locator("em")).toHaveCSS("font-style", "italic")
  await expect(answer.locator("p")).toHaveCSS("margin-top", "0px")
  await expect(answer.locator("p")).toHaveCSS("margin-bottom", "0px")
  const primary = part(page, "bird-wide", 0)
  const secondary = part(page, "bird-wide", 1)
  await primary.locator(".markdown-content").evaluate((node) => {
    node.innerHTML = "<p><strong>Streptopeliadecaocto</strong></p>"
  })
  await expect
    .poll(() => fontSize(primary))
    .toBeGreaterThan(await fontSize(secondary))
  await assertTextFits(primary)
  const fittedGap = await secondary.evaluate((node) => {
    const previous = node.previousElementSibling!
    const smallerFont = Math.min(
      parseFloat(getComputedStyle(node).fontSize),
      parseFloat(getComputedStyle(previous).fontSize),
    )
    return (
      (node.getBoundingClientRect().top -
        previous.getBoundingClientRect().bottom) /
      smallerFont
    )
  })
  expect(fittedGap).toBeCloseTo(0.4, 1)
})

test("keeps structured answers readable as one scrollable column while preserving wrapping", async ({
  page,
}) => {
  await columns(page, 6)
  const answer = part(page, "bird-wide", 1)
  await answer.locator(".markdown-content").evaluate((node) => {
    node.innerHTML =
      "<p><strong>Dendrocopos major magnificus</strong></p>" +
      "<ul><li>Dendrocopos major magnificus</li><li>Short item</li></ul>" +
      "<p>Additional paragraph</p>"
  })
  await expect
    .poll(() =>
      answer.evaluate((node) =>
        parseFloat(
          (node as HTMLElement).style.getPropertyValue("--answer-fit-scale"),
        ),
      ),
    )
    .toBeLessThanOrEqual(1)
  await expect(answer).not.toHaveAttribute("data-fit-mode", "single-line")
  await expect(answer.locator("ul")).toHaveCSS("white-space", "normal")
  await expect(answer.locator("li").first()).toHaveCSS("white-space", "normal")
  const widths = await answer.evaluate((node) => {
    const paragraphs = Array.from(node.querySelectorAll("p, li"))
    return paragraphs.map((paragraph) => {
      const range = document.createRange()
      range.selectNodeContents(paragraph)
      return {
        fontSize: parseFloat(getComputedStyle(paragraph).fontSize),
        lineCount: range.getClientRects().length,
      }
    })
  })
  expect(new Set(widths.map(({ fontSize }) => fontSize)).size).toBeLessThanOrEqual(1)
  expect(widths.every(({ lineCount }) => lineCount >= 1)).toBe(true)
})

test("keeps image answer columns from the third onward left-aligned and unfitted", async ({
  page,
}) => {
  const third = part(page, "bird-long", 2)
  await third.locator(".markdown-content").evaluate((node) => {
    node.innerHTML =
      "<p>Streptopeliadecaocto Streptopeliadecaocto Streptopeliadecaocto</p>" +
      "<ul><li>Additional information in a long list entry</li></ul>"
  })
  await expect
    .poll(() =>
      third.evaluate((node) =>
        (node as HTMLElement).style.getPropertyValue("--answer-fit-scale"),
      ),
    )
    .toBe("")
  await expect(third).toHaveClass(/image-answer-additional-column/)
  await expect(third).toHaveCSS("text-align", "left")
  await expect(third).toHaveCSS("text-align-last", "left")
  expect(
    (await fontSize(part(page, "bird-long", 0))) /
      (await fontSize(third)),
  ).toBeCloseTo(2.5, 2)
})

test("keeps answers contained across small and large grids", async ({ page }) => {
  // Hide unrelated fixtures while preserving the production card renderer,
  // container sizes, fonts and controls.
  await page
    .locator('.flip-card:not([data-card-id^="bird-"])')
    .evaluateAll((nodes) =>
      nodes.forEach((node) => {
        ;(node as HTMLElement).style.display = "none"
      }),
    )
  await page.setViewportSize({ width: 1440, height: 1200 })
  await columns(page, 5)
  await assertTextFits(part(page, "bird-wide", 1))
  const small = await fontSize(part(page, "bird-short", 0))
  await columns(page, 4)
  await columns(page, 3)
  await assertTextFits(part(page, "bird-wide", 1))
  expect(await fontSize(part(page, "bird-short", 0))).toBeGreaterThan(small)
  await columns(page, 2)
  await assertTextFits(part(page, "bird-wide", 1))
})

test("reserves proportional library image areas and aligned dividers at two, three and five columns", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Library", exact: true }).click()
  await page.setViewportSize({ width: 2048, height: 1200 })
  await page
    .locator('.workspace-card:not([id^="workspace-card-bird-"])')
    .evaluateAll((nodes) =>
      nodes.forEach((node) => {
        ;(node as HTMLElement).style.display = "none"
      }),
    )
  const measurements = []
  for (const count of [5, 4, 3, 2]) {
    await columns(page, count)
    if (count === 3) {
      // Obsidian's native Markdown adds an embed between the paragraph and
      // the image wrapper. It must share exactly the same reserved box.
      await page
        .locator("#workspace-card-bird-long .markdown-image")
        .evaluate((node) => {
          const embed = document.createElement("span")
          embed.className = "internal-embed image-embed"
          node.replaceWith(embed)
          embed.append(node)
          embed.parentElement!.style.margin = "3em 0"
        })
    }
    const metrics = await page
      .locator('.workspace-card[id^="workspace-card-bird-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const card = node.getBoundingClientRect()
          const area = node
            .querySelector(".library-image-question")!
            .getBoundingClientRect()
          const divider = node
            .querySelector(".question-answer-divider")!
            .getBoundingClientRect()
          const image = node.querySelector<HTMLImageElement>("img")!
          const bounds = image.getBoundingClientRect()
          const primary = node.querySelector<HTMLElement>(".card-answer-part")!
          return {
            areaHeight: area.height / card.height,
            areaWidth: area.width / card.width,
            divider: (divider.top - card.top) / card.height,
            imageInside:
              bounds.top >= area.top - 1 &&
              bounds.bottom <= area.bottom + 1 &&
              bounds.left >= area.left - 1 &&
              bounds.right <= area.right + 1,
            objectFit: getComputedStyle(image).objectFit,
            objectPosition: getComputedStyle(image).objectPosition,
            font: parseFloat(getComputedStyle(primary).fontSize),
          }
        }),
      )
    for (const metric of metrics) {
      expect(metric.imageInside).toBe(true)
      expect(metric.objectFit).toBe("contain")
      expect(metric.objectPosition).toBe("50% 50%")
      expect(metric.divider).toBeCloseTo(metrics[0].divider, 2)
      expect(metric.areaHeight).toBeCloseTo(metrics[0].areaHeight, 2)
      expect(metric.areaWidth).toBeCloseTo(metrics[0].areaWidth, 2)
    }
    measurements.push(metrics[0])
  }
  for (const metric of measurements) {
    expect(metric.divider).toBeCloseTo(measurements[0].divider, 2)
    expect(metric.areaHeight).toBeCloseTo(measurements[0].areaHeight, 2)
  }
  expect(measurements[2].font).toBeGreaterThan(measurements[0].font)
  expect(measurements[3].font).toBeGreaterThan(measurements[2].font)
  expect(measurements[3].font).toBeLessThanOrEqual(16 * 2 * 1.125)
})

test("keeps library text columns fixed, formatted and controlled by the font slider", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Library", exact: true }).click()
  const text = page.locator("#workspace-card-text-answer .card-answer-part")
  const question = page.locator(
    "#workspace-card-text-answer .card-heading .markdown-content",
  )
  for (const count of [2, 3, 4, 5]) {
    await columns(page, count)
    expect(await fontSize(text)).toBeCloseTo(12 * 1.125, 3)
    expect(await fontSize(question)).toBeCloseTo(13 * 1.125, 3)
    for (const index of [0, 1, 2])
      expect(
        await fontSize(
          page.locator(
            `#workspace-card-text-columns [data-column-index="${index}"]`,
          ),
        ),
      ).toBeCloseTo(12 * 1.125, 3)
  }
  await expect(text.locator("strong").first()).toHaveCSS("font-weight", "700")
  await openSize(page)
  const slider = page.getByRole("slider", { name: "Card font size" })
  await slider.focus()
  await slider.press("Home")
  for (let step = 0; step < 16; step++) await slider.press("ArrowRight")
  expect(await fontSize(text)).toBeCloseTo(12 * 1.125 * 1.5, 3)
  await slider.press("Home")
  for (let step = 0; step < 6; step++) await slider.press("ArrowRight")
  await openSize(page)
  await page.getByRole("button", { name: "Study", exact: true }).click()
  await columns(page, 4)
  await card(page, "text-answer").click()
  await card(page, "text-columns").click()
  for (const id of ["text-answer", "text-columns"]) {
    await expect
      .poll(() =>
        card(page, id)
          .locator(".flip-card-inner")
          .evaluate((node) => getComputedStyle(node).transform),
      )
      .toMatch(/^matrix3d\(-1,/)
  }
  await page
    .locator('.flip-card:not([data-card-id^="text-"])')
    .evaluateAll((nodes) =>
      nodes.forEach((node) => {
        ;(node as HTMLElement).style.display = "none"
      }),
    )
})
