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
    ).toHaveLength(1)
    expect(screen.getByText("Sperber")).toBeInTheDocument()
    expect(screen.getByText("Accipiter nisus")).toBeInTheDocument()
    expect(container.querySelector(".markdown-paragraph-gap")).toBeNull()
    expect(container.querySelector('.flip-card-back img')).toBeNull()
    expect(container.querySelector('.flip-card-face:not(.flip-card-back) img')).toBeInTheDocument()
    expect(container.querySelector('.flip-card-back .answer-column-divider')).toBeInTheDocument()
    expect(Array.from(container.querySelectorAll('.flip-card-back .card-answer-part')).map(part => part.getAttribute('data-column-index'))).toEqual(['0', '1', '2'])

  })

  it("keeps the image on the front and its title on the back for image-as-question cards", async () => {
    const { container } = renderStudyCard(true)

    expect(
      await screen.findAllByRole("img", { name: "Gradienten-Schema" }),
    ).toHaveLength(1)
    expect(screen.getByText("Image question")).toBeInTheDocument()
    expect(screen.getByText("Click or Space to reveal")).toBeInTheDocument()
    expect(screen.getByText("Was zeigt das Schema?")).toBeInTheDocument()
    expect(
      screen.queryByText("Die Gradientenrichtung."),
    ).not.toBeInTheDocument()
    expect(container.querySelector(".flip-card-back img")).toBeNull()
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

  it('does not select or flip a card when rating buttons are clicked', () => {
    const onClick = vi.fn()
    const onDifficultyChange = vi.fn()
    render(<StudyCard
      card={{ id: 'plain', deckId: 'deck', question: 'Question', answer: 'Answer', tags: [], hasDifficultyColumn: true }}
      isFlipped={false} onClick={onClick} onDifficultyChange={onDifficultyChange}
      cardHeight={240} squareCards={false} showStars
    />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Set difficulty to 5 out of 5' })[0])
    expect(onDifficultyChange).toHaveBeenCalledWith(5)
    expect(onClick).not.toHaveBeenCalled()
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
