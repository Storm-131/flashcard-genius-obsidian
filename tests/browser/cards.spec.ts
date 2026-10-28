import { expect, test, type Locator, type Page } from "@playwright/test"

const runtimeErrors = new WeakMap<Page, string[]>()

async function imageBounds(image: Locator) {
  await expect(image).toBeVisible()
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true)
  return image.evaluate((element: HTMLImageElement) => {
    const viewport = element.closest(".card-content-viewport") as HTMLElement
    const style = getComputedStyle(viewport)
    const bounds = element.getBoundingClientRect()
    // object-fit: contain paints the complete image inside the element's box.
    const scale = Math.min(
      bounds.width / element.naturalWidth,
      bounds.height / element.naturalHeight,
    )
    const width = element.naturalWidth * scale
    const height = element.naturalHeight * scale
    const contentHeight =
      viewport.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom)
    return {
      width,
      height,
      contentHeight,
      availableWidth:
        viewport.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight),
      viewportBottom:
        viewport.getBoundingClientRect().bottom -
        parseFloat(style.paddingBottom),
      bottom: bounds.top + (bounds.height + height) / 2,
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
    }
  })
}

async function assertContained(image: Locator) {
  const bounds = await imageBounds(image)
  expect(bounds.height).toBeLessThanOrEqual(bounds.contentHeight * 0.75 + 1)
  expect(bounds.width).toBeLessThanOrEqual(bounds.availableWidth + 1)
  await expect(image).toHaveCSS("object-fit", "contain")
  await expect(image).toHaveCSS("object-position", "50% 50%")
  expect(
    Math.abs(
      bounds.width / bounds.height - bounds.naturalWidth / bounds.naturalHeight,
    ),
  ).toBeLessThan(0.02)
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportBottom + 1)
  expect(
    await image.evaluate((element) => getComputedStyle(element).cursor),
  ).toBe("pointer")
  return bounds
}

async function openCardSize(page: Page, mode: "library" | "study" = "library") {
  const button = page.getByRole("button", { name: "Card size", exact: true })
  try {
    await button.click({ timeout: 1000 })
  } catch {
    await page
      .getByRole("button", {
        name:
          mode === "library" ? "Open library controls" : "Open study controls",
      })
      .click()
  }
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await expect(page.locator(".workspace-card")).toHaveCount(14)
  expect(errors).toEqual([])
})

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([])
  await expect(page.locator(".markdown-image-missing")).toHaveCount(0)
})

for (const name of ["Portrait", "Landscape", "Square", "Small"]) {
  test(`fits ${name.toLowerCase()} images in the actual card area`, async ({
    page,
  }) => {
    const image =
      name === "Square"
        ? page.locator("#workspace-card-square").getByRole("img")
        : page
            .locator(".workspace-card")
            .getByRole("img", { name, exact: true })
    await assertContained(image)
    if (name === "Small") {
      await image.evaluate((node) => {
        const wrapper = node.closest(".markdown-image")!
        const embed = document.createElement("span")
        embed.className = "internal-embed image-embed"
        embed.style.display = "inline-block"
        embed.style.width = "40px"
        wrapper.replaceWith(embed)
        embed.append(wrapper)
      })
      const bounds = await imageBounds(image)
      expect(bounds.width).toBeGreaterThan(40)
      expect(bounds.height).toBeGreaterThan(30)
      expect(
        Math.min(
          Math.abs(bounds.width - bounds.availableWidth),
          Math.abs(bounds.height - bounds.contentHeight * 0.75),
        ),
      ).toBeLessThan(2)
    }
  })
}

for (const mode of ["library", "study"] as const) {
  test(`upscales low-resolution images like high-resolution images in ${mode}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 2048, height: 2200 })
    if (mode === "study")
      await page.getByRole("button", { name: "Study", exact: true }).click()
    const fixtures = [
      { id: "bird-short", width: 40, height: 30, label: "Low landscape" },
      { id: "bird-wide", width: 800, height: 600, label: "High landscape" },
      { id: "bird-long", width: 30, height: 60, label: "Low portrait" },
      { id: "bird-green", width: 600, height: 1200, label: "High portrait" },
    ]
    const selector = mode === "library" ? ".workspace-card" : ".flip-card"
    for (const fixture of fixtures) {
      const images = page.locator(
        mode === "library"
          ? `#workspace-card-${fixture.id} img`
          : `.flip-card[data-card-id="${fixture.id}"] img`,
      )
      await expect(images).toHaveCount(1)
      await expect
        .poll(() =>
          images.evaluateAll((nodes) =>
            nodes.every(
              (node) =>
                (node as HTMLImageElement).complete &&
                (node as HTMLImageElement).naturalWidth > 0,
            ),
          ),
        )
        .toBe(true)
    }
    await page.locator(selector).evaluateAll((nodes, fixtures) => {
      for (const node of nodes) {
        const fixture = fixtures.find(
          ({ id }) =>
            node.id === `workspace-card-${id}` ||
            (node as HTMLElement).dataset.cardId === id,
        )
        if (!fixture) {
          ;(node as HTMLElement).style.display = "none"
          continue
        }
        const canvas = document.createElement("canvas")
        canvas.width = fixture.width
        canvas.height = fixture.height
        const context = canvas.getContext("2d")!
        context.fillStyle = fixture.label.startsWith("Low")
          ? "#FDE68A"
          : "#A7F3D0"
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.strokeStyle = "#065F46"
        context.lineWidth = Math.min(canvas.width, canvas.height) / 15
        context.strokeRect(
          context.lineWidth,
          context.lineWidth,
          canvas.width - context.lineWidth * 2,
          canvas.height - context.lineWidth * 2,
        )
        for (const image of node.querySelectorAll("img")) {
          image.src = canvas.toDataURL("image/png")
          image.alt = fixture.label
          // Inline natural-size hints must not limit the responsive CSS box.
          image.style.width = `${fixture.width}px`
          image.style.height = `${fixture.height}px`
          image.style.maxWidth = `${fixture.width}px`
          image.style.maxHeight = `${fixture.height}px`
        }
      }
    }, fixtures)

    const measure = async (back = false) => {
      const bounds = []
      for (const fixture of fixtures) {
        const card =
          mode === "library"
            ? page.locator(`#workspace-card-${fixture.id}`)
            : page
                .locator(`.flip-card[data-card-id="${fixture.id}"]`)
                .locator(
                  back
                    ? ".flip-card-back"
                    : ".flip-card-face:not(.flip-card-back)",
                )
        bounds.push(
          await assertContained(
            card.getByRole("img", { name: fixture.label, exact: true }),
          ),
        )
      }
      for (const bound of bounds)
        expect(
          Math.min(
            Math.abs(bound.width - bound.availableWidth),
            Math.abs(bound.height - bound.contentHeight * 0.75),
          ),
        ).toBeLessThan(2)
      expect(bounds[0].width).toBeCloseTo(bounds[1].width, 0)
      expect(bounds[0].height).toBeCloseTo(bounds[1].height, 0)
      expect(bounds[2].width).toBeCloseTo(bounds[3].width, 0)
      expect(bounds[2].height).toBeCloseTo(bounds[3].height, 0)
      expect(bounds[0].width).toBeGreaterThan(40)
      expect(bounds[2].height).toBeGreaterThan(60)
      return bounds
    }
    let previous: Awaited<ReturnType<typeof measure>> | undefined
    for (const count of [5, 3, 2]) {
      await openCardSize(page, mode)
      await page
        .getByRole("button", { name: String(count), exact: true })
        .click()
      await openCardSize(page, mode)
      const bounds = await measure()
      if (previous) {
        expect(bounds[0].width).toBeGreaterThan(previous[0].width)
        expect(bounds[2].height).toBeGreaterThan(previous[2].height)
      }
      previous = bounds

    }
  })
}

test("recalculates limits after sidebar, window and card-size changes", async ({
  page,
}) => {
  const image = page
    .locator(".workspace-card")
    .getByRole("img", { name: "Portrait", exact: true })
  const first = await assertContained(image)
  await page.getByRole("button", { name: /sidebar/i }).click()
  await expect
    .poll(async () => (await imageBounds(image)).contentHeight)
    .not.toBe(first.contentHeight)
  await assertContained(image)
  await page.setViewportSize({ width: 800, height: 650 })
  await assertContained(image)
  await openCardSize(page)
  const height = page.getByRole("slider", { name: /^Height/ })
  if (await height.count()) {
    await height.focus()
    await height.press("End")
  } else {
    await page.getByRole("button", { name: "360", exact: true }).click()
  }
  await assertContained(image)
})

test("keeps long text scrollable while its portrait image fits", async ({
  page,
}) => {
  const card = page.locator("#workspace-card-long-text")
  await card.click({ position: { x: 5, y: 5 } })
  await assertContained(card.getByRole("img", { name: "Portrait with text" }))
  const viewport = card.locator(".card-content-viewport")
  expect(
    await viewport.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true)
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  const last = card.getByText("Paragraph 30:", { exact: false })
  await expect(last).toBeVisible()
  expect(
    await last.evaluate(
      (element) =>
        element.getBoundingClientRect().bottom <=
        element.closest(".card-content-viewport")!.getBoundingClientRect()
          .bottom +
          1,
    ),
  ).toBe(true)
})

test("keeps study front images unchanged and does not repeat them on the back", async ({ page }) => {
  await page.getByRole("button", { name: "Study", exact: true }).click()
  const card = page.locator('.flip-card[data-card-id="portrait"]')
  const front = card.locator('.flip-card-face:not(.flip-card-back)')
  await assertContained(front.getByRole('img', { name: 'Portrait', exact: true }))
  await card.click()
  await expect(card.locator('.flip-card-inner')).toHaveClass(/is-flipped/)
  await expect(card.locator('.flip-card-back img')).toHaveCount(0)
  await expect(card.locator('.flip-card-back')).toContainText('Portrait answer')
  await card.press('Space')
  await front.getByRole('button', { name: 'Enlarge image: Portrait' }).click()
  await expect(page.getByRole('dialog', { name: 'Enlarged view: Portrait' }).getByRole('img')).toBeVisible()
})

test("scales UI once and preserves the independent card font control", async ({
  page,
}) => {
  const root = page.locator(".flashcard-genius-root")
  const button = page.getByRole("button", { name: "Card size", exact: true })
  const body = page
    .getByText("Landscape question", { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"markdown-content")]')
  const cardFont = await body.evaluate(
    (element) => getComputedStyle(element).fontSize,
  )
  expect(cardFont).toBe("14.625px")
  expect(
    await button.evaluate((element) => getComputedStyle(element).fontWeight),
  ).toBe("600")
  expect(
    await button.evaluate((element) => getComputedStyle(element).fontSize),
  ).toBe("13.5px")
  await root.evaluate((element) =>
    (element as HTMLElement).style.setProperty("--app-ui-font-scale", "1"),
  )
  expect(
    await button.evaluate((element) => getComputedStyle(element).fontSize),
  ).toBe("12px")
  expect(
    await body.evaluate((element) => getComputedStyle(element).fontSize),
  ).toBe(cardFont)
  await openCardSize(page)
  const slider = page.getByRole("slider", { name: "Card font size" })
  await slider.focus()
  await slider.press("End")
  await slider.press("ArrowLeft")
  await slider.press("ArrowLeft")
  await expect.poll(() => body.evaluate(element => getComputedStyle(element).fontSize)).toBe("21.9375px")
})

test("uses answer names rather than image links in the explorer", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Other", exact: true }).click()
  await page
    .getByRole("button", { name: "Show questions in Layout preview" })
    .click()
  const sidebar = page.locator(".sidebar")
  const name = sidebar.getByRole("button", {
    name: "Portrait answer",
    exact: true,
  })
  await expect(name).toBeVisible()
  await expect(name).toHaveAttribute("title", "Portrait answer")
  await expect(
    sidebar.getByRole("button", { name: "Square answer", exact: true }),
  ).toBeVisible()
  await expect(sidebar).not.toContainText("![[")
})

test("keeps controls usable in a small window and allows all modes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 420, height: 600 })
  await openCardSize(page)
  await expect(
    page.getByRole("slider", { name: "Card font size" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Study", exact: true }).click()
  await openCardSize(page, "study")
  await expect(
    page.getByRole("slider", { name: "Card font size" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open menu", exact: true }).click()
  await page.getByRole("button", { name: "Stats", exact: true }).click()
  await expect(
    page.getByText("Difficulty statistics", { exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test("keeps long image-card answers scrollable as ordinary text", async ({ page }) => {
  await page.getByRole('button', { name: 'Study', exact: true }).click()
  const card = page.locator('.flip-card[data-card-id="long-image-question"]')
  await card.click()
  const back = card.locator('.flip-card-back')
  await expect(back.locator('img')).toHaveCount(0)
  const viewport = back.locator('.card-content-viewport')
  expect(await viewport.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true)
  await viewport.evaluate(node => { node.scrollTop = node.scrollHeight })
  const last = back.getByText('Answer paragraph 30:', { exact: false })
  await expect(last).toBeVisible()
  expect(await last.evaluate(node => node.getBoundingClientRect().bottom <= node.closest('.card-content-viewport')!.getBoundingClientRect().bottom + 1)).toBe(true)
})
