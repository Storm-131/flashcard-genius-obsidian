import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Workspace from "./Workspace"
import StudyMode from "./StudyMode"
import ReadonlyFlashcardApp from "../ReadonlyFlashcardApp"

const card = {
  id: "card",
  deckId: "deck",
  question: "Card question",
  answer: "Card answer",
  tags: [],
}
const deck = { id: "deck", name: "Deck", categoryId: null, color: "#059669" }

function renderWorkspace() {
  return render(
    <Workspace
      cards={[card]}
      deck={deck}
      topics={[]}
      selectedCardId={null}
      sortOrder="default"
      readOnly={false}
      onSelectCard={vi.fn()}
      onAddCard={vi.fn()}
      onSortChange={vi.fn()}
      onDifficultyChange={vi.fn()}
      onSaveCard={vi.fn()}
      onDeleteCard={vi.fn()}
      onMoveCard={vi.fn()}
      showStars={false}
      onToggleShowStars={vi.fn()}
    />,
  )
}

function openFontControls(overflowLabel: string) {
  fireEvent.click(
    screen.queryByRole("button", { name: "Card size" }) ??
      screen.getByRole("button", { name: overflowLabel }),
  )
}

describe("card font size controls", () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it("scales both card sides, retains the value in study mode and resets it with Default", () => {
    const workspace = renderWorkspace()
    openFontControls("Open library controls")
    fireEvent.change(screen.getByRole("slider", { name: "Card font size" }), {
      target: { value: "150" },
    })
    expect(
      (screen
        .getByText("Card answer")
        .closest(".markdown-content") as HTMLElement).style.fontSize,
    ).toBe("inherit")
    expect(
      (screen
        .getByText("Card answer")
        .closest(".workspace-card") as HTMLElement).style.getPropertyValue(
        "--card-font-scale",
      ),
    ).toBe("1.5")
    workspace.unmount()

    render(
      <StudyMode
        cards={[card]}
        deck={deck}
        decks={[deck]}
        topics={[]}
        cardOrderByDeck={{ deck: ["card"] }}
        onExit={vi.fn()}
        onDifficultyChange={vi.fn()}
        showStars={false}
        onToggleShowStars={vi.fn()}
      />,
    )
    openFontControls("Open study controls")
    expect(screen.getByRole("slider", { name: "Card font size" })).toHaveValue(
      "150",
    )
    expect(
      (screen
        .getByText("Card answer")
        .closest(".flip-card") as HTMLElement).style.getPropertyValue(
        "--card-font-scale",
      ),
    ).toBe("1.5")
    fireEvent.change(screen.getByRole("slider", { name: "Card font size" }), {
      target: { value: "75" },
    })
    expect(
      (screen
        .getByText("Card answer")
        .closest(".flip-card") as HTMLElement).style.getPropertyValue(
        "--card-font-scale",
      ),
    ).toBe("0.75")
    fireEvent.click(
      screen.getByRole("button", { name: /^Default(?: \(square cards\))?$/ }),
    )
    expect(screen.getByRole("slider", { name: "Card font size" })).toHaveValue(
      "100",
    )
    expect(
      (screen
        .getByText("Card answer")
        .closest(".flip-card") as HTMLElement).style.getPropertyValue(
        "--card-font-scale",
      ),
    ).toBe("1")
  })

  it("starts the plugin interface with the green theme", () => {
    const { container } = render(
      <ReadonlyFlashcardApp
        categories={[]}
        decks={[deck]}
        topics={[]}
        cards={[card]}
        cardOrderByDeck={{ deck: ["card"] }}
      />,
    )
    expect(container.querySelector(".flashcard-genius-root")).toHaveClass(
      "theme-emerald",
    )
  })
})
