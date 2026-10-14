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
      await expect(images).toHaveCount(mode === "library" ? 1 : 2)
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
      if (mode === "study") {
        for (const fixture of fixtures)
          await page.locator(`.flip-card[data-card-id="${fixture.id}"]`).click()
        for (const fixture of fixtures)
          await expect
            .poll(() =>
              page
                .locator(
                  `.flip-card[data-card-id="${fixture.id}"] .flip-card-inner`,
                )
                .evaluate((node) => getComputedStyle(node).transform),
            )
            .toMatch(/^matrix3d\(-1,/)
        // The front reserves space for its label and footer; each face must
        // fill its own available area identically for both source resolutions.
        await measure(true)
      }
      if (mode === "study") {
        for (const fixture of fixtures)
          await page.locator(`.flip-card[data-card-id="${fixture.id}"]`).click()
        for (const fixture of fixtures)
          await expect
            .poll(() =>
              page
                .locator(
                  `.flip-card[data-card-id="${fixture.id}"] .flip-card-inner`,
                )
                .evaluate((node) => getComputedStyle(node).transform),
            )
            .toBe("none")
      }
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

test("uses the same image limits on both study faces and keeps fullscreen previews independent", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Study", exact: true }).click()
  const image = page
    .locator(".flip-card-face:not(.flip-card-back)")
    .getByRole("img", { name: "Portrait", exact: true })
  await assertContained(image)
  const portrait = image
    .locator('xpath=ancestor::div[contains(@class,"flip-card")]')
    .first()
  await portrait.click()
  await expect
    .poll(() =>
      portrait
        .locator(".flip-card-inner")
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .toMatch(/^matrix3d\(-1,/)
  const backImage = portrait
    .locator(".flip-card-back")
    .getByRole("img", { name: "Portrait", exact: true })
  await assertContained(backImage)
  await expect(
    backImage.locator(
      'xpath=ancestor::div[contains(@class,"image-question-preview")]',
    ),
  ).toHaveCSS("opacity", "1")
  await expect(backImage).toHaveCSS("opacity", "0.35")
  await expect(backImage).toHaveCSS("transform", "matrix(-1, 0, 0, 1, 0, 0)")
  await expect(image).toHaveCSS("transform", "none")
  await expect(image).toHaveCSS("opacity", "1")
  await expect(
    portrait.locator(".flip-card-back .study-answer-divider"),
  ).toHaveCount(0)
  const answerBlock = portrait.locator(".flip-card-back .image-question-answer")
  const answer = answerBlock.locator(".image-question-answer-part").first()
  await expect(answerBlock).toContainText("Portrait answer")
  await openCardSize(page, "study")
  const heightControl = page.getByRole("slider", { name: /^Height/ })
  await heightControl.focus()
  await heightControl.press("Home")
  for (let step = 0; step < 4; step++) await heightControl.press("ArrowRight")
  const preferredFont = () =>
    answer.evaluate((element) => {
      const fitScale =
        parseFloat(
          element.parentElement!.style.getPropertyValue("--answer-fit-scale"),
        ) || 1
      return parseFloat(getComputedStyle(element).fontSize) / fitScale
    })
  const initialAnswerFontSize = await preferredFont()
  expect(initialAnswerFontSize).toBeGreaterThan(14)
  await heightControl.press("End")
  // The preferred size grows with height; the fitted result may already be
  // limited by the unchanged card width.
  await expect.poll(preferredFont).toBeGreaterThan(initialAnswerFontSize)
  await heightControl.press("Home")
  await expect.poll(preferredFont).toBeLessThan(initialAnswerFontSize)
  for (let step = 0; step < 4; step++) await heightControl.press("ArrowRight")
  await expect.poll(preferredFont).toBeCloseTo(initialAnswerFontSize, 0)
  await expect(answer).toHaveCSS("text-align", "center")
  await expect(answer).toHaveCSS("text-align-last", "center")
  expect(
    await answerBlock.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const parent = element.parentElement!.getBoundingClientRect()
      return Math.abs(
        (bounds.left + bounds.right) / 2 - (parent.left + parent.right) / 2,
      )
    }),
  ).toBeLessThan(2)
  await expect.poll(() => answerBlock.evaluate((element) => {
      const bounds = element.querySelector(".study-answer-name-content")!.getBoundingClientRect()
      const viewport = element.parentElement!
      const parent = viewport.getBoundingClientRect()
      const style = getComputedStyle(viewport)
      const contentTop = parent.top + parseFloat(style.paddingTop)
      const contentHeight =
        viewport.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom)
      return Math.abs(
        (bounds.top + bounds.bottom) / 2 - (contentTop + contentHeight / 2),
      )
    })).toBeLessThan(2)
  const initialPreferredFontSize = await answer.evaluate((element) => {
    const fitScale =
      parseFloat(
        element.parentElement!.style.getPropertyValue("--answer-fit-scale"),
      ) || 1
    return parseFloat(getComputedStyle(element).fontSize) / fitScale
  })
  const fontControl = page.getByRole("slider", { name: "Card font size" })
  await fontControl.focus()
  await fontControl.press("End")
  await fontControl.press("ArrowLeft")
  await fontControl.press("ArrowLeft")
  const largerCardFontSize = Number.parseFloat(
    await answer.evaluate((element) => getComputedStyle(element).fontSize),
  )
  // The slider scales the preferred size; long labels may hit the width limit.
  await expect
    .poll(() =>
      answer.evaluate((element) => {
        const fitScale =
          parseFloat(
            element.parentElement!.style.getPropertyValue("--answer-fit-scale"),
          ) || 1
        return parseFloat(getComputedStyle(element).fontSize) / fitScale
      }),
    )
    .toBeCloseTo(initialPreferredFontSize * 1.5, 0)
  expect(largerCardFontSize).toBeLessThanOrEqual(
    initialPreferredFontSize * 1.5 + 1,
  )
  await fontControl.press("Home")
  for (let step = 0; step < 6; step++) await fontControl.press("ArrowRight")
  await openCardSize(page, "study")
  await expect(
    portrait
      .locator(".flip-card-back")
      .getByText("Portrait answer", { exact: true }),
  ).toHaveCSS("opacity", "1")
  await portrait
    .getByRole("button", { name: "Enlarge image: Portrait" })
    .last()
    .click()
  const overlay = page
    .getByRole("dialog", { name: "Enlarged view: Portrait" })
    .getByRole("img")
  await expect(overlay).toBeVisible()
  expect(
    await overlay.evaluate((element) => getComputedStyle(element).maxHeight),
  ).toBe("828px")
  await expect(overlay).toHaveCSS("transform", "none")
  await expect(overlay).toHaveCSS("opacity", "1")
  await expect(overlay).toHaveCSS("cursor", "pointer")
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
  expect(
    await body.evaluate((element) => getComputedStyle(element).fontSize),
  ).toBe("21.9375px")
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

test("keeps overlaid answers scrollable without moving or blocking the question image", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Study", exact: true }).click()
  const image = page
    .locator(".flip-card-face:not(.flip-card-back)")
    .getByRole("img", { name: "Portrait with long answer", exact: true })
  const card = image
    .locator('xpath=ancestor::div[contains(@class,"flip-card")]')
    .first()
  await card.click()
  await expect
    .poll(() =>
      card
        .locator(".flip-card-inner")
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .toMatch(/^matrix3d\(-1,/)
  const back = card.locator(".flip-card-back")
  const backImage = back.getByRole("img", {
    name: "Portrait with long answer",
    exact: true,
  })
  const first = await assertContained(backImage)
  const answer = back.locator(".image-question-answer")
  expect(
    await answer.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true)
  await answer.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  const last = answer.getByText("Answer paragraph 30:", { exact: false })
  await expect(last).toBeVisible()
  expect(
    await last.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const parent = element
        .closest(".image-question-answer")!
        .getBoundingClientRect()
      return bounds.bottom <= parent.bottom + 1
    }),
  ).toBe(true)
  const after = await assertContained(backImage)
  expect(after.bottom).toBe(first.bottom)
  expect(after.height).toBe(first.height)
  await back
    .getByRole("button", { name: "Enlarge image: Portrait with long answer" })
    .click()
  await expect(
    page.getByRole("dialog", {
      name: "Enlarged view: Portrait with long answer",
    }),
  ).toBeVisible()
})
