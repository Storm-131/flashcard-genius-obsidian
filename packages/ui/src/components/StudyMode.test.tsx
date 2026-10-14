import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ImageAssetsProvider } from "../images/ImageAssetsContext"
import { InMemoryImageStorage } from "../images/imageStorage"
import type { Card } from "../types"
import { StudyCard } from "./StudyMode"

function renderStudyCard(imageAsQuestion: boolean) {
  const storage = new InMemoryImageStorage()
  const asset = storage.store(
    new Blob(["image"], { type: "image/png" }),
    "schema.png",
  )
  const onClick = vi.fn()
  const card: Card = {
    id: "card-1",
    deckId: "deck-1",
    question: "Was zeigt das Schema?",
    answer: `Die Gradientenrichtung.\n\n![Gradienten-Schema](${asset.path})`,
    tags: [],
    imageAsQuestion,
  }

  const result = render(
    <ImageAssetsProvider storage={storage}>
      <StudyCard
        card={card}
        isFlipped={false}
        onClick={onClick}
        onDifficultyChange={vi.fn()}
        cardHeight={240}
        squareCards={false}
        showStars={false}
      />
    </ImageAssetsProvider>,
  )
  return { ...result, onClick }
}

describe("StudyCard image question", () => {
  it("renders an image in the question column and merged answer paragraphs", async () => {
    const storage = new InMemoryImageStorage()
    const asset = storage.store(
      new Blob(["image"], { type: "image/webp" }),
      "Sperber.webp",
    )
    const { container } = render(
      <ImageAssetsProvider storage={storage}>
        <StudyCard
          card={{
            id: "bird",
            deckId: "deck",
            question: `![[${asset.path}|300x200]]`,
            answer: "**Sperber**\n\n*Accipiter nisus*\n\nKleine Flügel",
            answerParts: [
              { content: "**Sperber**", columnIndex: 0 },
              { content: "*Accipiter nisus*", columnIndex: 1 },
              { content: "Kleine Flügel", columnIndex: 2 },
            ],
            tags: [],
          }}
          isFlipped={false}
          onClick={vi.fn()}
          onDifficultyChange={vi.fn()}
          cardHeight={240}
          squareCards={false}
          showStars={false}
        />
      </ImageAssetsProvider>,
    )
    expect(
      await screen.findAllByRole("img", { name: "Sperber.webp" }),
    ).toHaveLength(2)
    expect(screen.getByText("Sperber")).toBeInTheDocument()
    expect(screen.getByText("Accipiter nisus")).toBeInTheDocument()
    expect(container.querySelector(".markdown-paragraph-gap")).toBeNull()
    const preview = container.querySelector(
      ".flip-card-back .image-question-preview",
    )
    expect(preview).toBeInTheDocument()
    expect(preview?.querySelector("img")).toHaveAttribute("alt", "Sperber.webp")
    expect(
      container.querySelector(
        ".flip-card-face:not(.flip-card-back) .image-question-preview",
      ),
    ).toBeNull()
    expect(
      container.querySelector(".flip-card-back .study-answer-divider"),
    ).toBeNull()
    expect(preview?.parentElement).toHaveClass("image-question-back")
    const answer = preview?.nextElementSibling
    expect(answer).toHaveTextContent("Sperber")
    expect(answer).toHaveClass("image-question-answer")
    const answerParts = answer?.querySelectorAll(".image-question-answer-part")
    expect(answerParts).toHaveLength(3)
    expect(
      Array.from(answer?.querySelectorAll(".card-answer-part") ?? []).map(
        (part) => part.getAttribute("data-column-index"),
      ),
    ).toEqual(["0", "1", "2"])
  })

  it("shows matching mirrored image faces when image-as-question is active", async () => {
    const { container } = renderStudyCard(true)

    expect(
      await screen.findAllByRole("img", { name: "Gradienten-Schema" }),
    ).toHaveLength(2)
    expect(screen.getByText("Image question")).toBeInTheDocument()
    expect(screen.getByText("Tap to reveal")).toBeInTheDocument()
    expect(screen.getByText("Was zeigt das Schema?")).toBeInTheDocument()
    expect(
      screen.queryByText("Die Gradientenrichtung."),
    ).not.toBeInTheDocument()
    expect(
      container.querySelector(".image-question-preview"),
    ).toBeInTheDocument()
  })

  it("does not flip the card when the image zoom button is clicked", async () => {
    const { onClick } = renderStudyCard(true)

    const zoomButtons = await screen.findAllByRole("button", {
      name: "Enlarge image: Gradienten-Schema",
    })
    fireEvent.click(zoomButtons[0])

    expect(onClick).not.toHaveBeenCalled()
    expect(
      screen.getByRole("dialog", { name: "Enlarged view: Gradienten-Schema" }),
    ).toBeInTheDocument()
  })

  it("behält bei deaktivierter Option die normale Frage-Antwort-Reihenfolge", async () => {
    renderStudyCard(false)

    expect(screen.getAllByText("Was zeigt das Schema?")).toHaveLength(2)
    expect(screen.getByText("Die Gradientenrichtung.")).toBeInTheDocument()
    expect(
      await screen.findAllByRole("img", { name: "Gradienten-Schema" }),
    ).toHaveLength(1)
    expect(document.querySelector(".image-question-preview")).toBeNull()
    expect(
      screen.getByText("Die Gradientenrichtung.").closest(".markdown-content"),
    ).toHaveStyle({
      fontSize: "var(--card-text-font-size)",
    })
    expect(document.querySelector(".image-question-answer")).toBeNull()
  })
})
