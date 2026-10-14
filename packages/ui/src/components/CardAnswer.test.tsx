import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { parseDeckMarkdown } from "@flashcard-genius/core"
import CardAnswer, { trailingNameLines } from "./CardAnswer"
import type { Card } from "../types"

function renderAnswer(card: Pick<Card, "answer" | "answerParts">, studyImageAnswer = false) {
  return render(
    <CardAnswer
      card={{
        ...card,
        id: "card",
        deckId: "deck",
        question: "![[Bird.webp]]",
        tags: [],
      }}
      content={card.answer}
      imageQuestion
      studyImageAnswer={studyImageAnswer}
      fontScale={1}
      sourcePath=""
    />,
  )
}

describe("answer column rendering", () => {
  it.each([
    ["Blauer Drache (Blaue Fadenschnecke)", ["Blauer Drache", "(Blaue Fadenschnecke)"]],
    ["**Blauer Drache (Blaue Fadenschnecke)**", ["**Blauer Drache**", "**(Blaue Fadenschnecke)**"]],
    ["Name (Zusatz (Unterart))", ["Name", "(Zusatz (Unterart))"]],
    ["Name ohne Zusatz", null],
    ["Name (Zusatz) im Text", null],
    ["Q(s, a)", null],
    ["$Q(s, a)$ (Formel)", null],
    ["\\(Q(s, a)\\) (Formel)", null],
    ["`Code` (Zusatz)", null],
    ["[Name](target) (Zusatz)", null],
    ["**Name** mit *Markdown* (Zusatz)", null],
    ["Name\n\nAbsatz (Zusatz)", null],
    ["Name (unvollständig", null],
  ])("splits only safe trailing name additions: %s", (content, expected) => {
    expect(trailingNameLines(content as string)).toEqual(expected)
  })

  it("splits emphasized Study names inside one column without changing source data or Library rendering", () => {
    const content = "**Blauer Drache (Blaue Fadenschnecke)**"
    const card = { answer: content, answerParts: [{ content, columnIndex: 0 }] }
    const study = renderAnswer(card, true)
    expect(study.container.querySelectorAll(".study-name-line")).toHaveLength(2)
    expect(study.container.querySelectorAll(".card-answer-part")).toHaveLength(1)
    expect(Array.from(study.container.querySelectorAll("strong")).map((node) => node.textContent))
      .toEqual(["Blauer Drache", "(Blaue Fadenschnecke)"])
    expect(card.answer).toBe(content)
    expect(card.answerParts[0].content).toBe(content)
    const library = renderAnswer(card)
    expect(library.container.querySelector(".study-image-answer")).toBeNull()
    expect(library.container.querySelectorAll("p")).toHaveLength(1)
  })

  it.each([
    ["Name"],
    ["Name", "*Species*"],
    ["Name", "*Species*", "Note"],
    ["Name", "*Species*", "Note", "Another note"],
    ["", "*Species*", "", "Another note"],
    ["", "", "Only notes"],
    ["", "", ""],
  ])("separates Study names and notes using original positions: %j", (...contents) => {
    const answerParts = contents.map((content, columnIndex) => ({ content, columnIndex }))
    const { container } = renderAnswer({ answer: contents.join("\n\n"), answerParts }, true)
    const names = container.querySelector(".study-answer-names")!
    const info = container.querySelector(".study-answer-info")
    expect(Array.from(names.querySelectorAll<HTMLElement>(".card-answer-part"))
      .map((part) => Number(part.dataset.columnIndex)))
      .toEqual(answerParts.filter((part) => part.content && part.columnIndex < 2).map((part) => part.columnIndex))
    expect(Array.from(info?.querySelectorAll<HTMLElement>(".card-answer-part") ?? [])
      .map((part) => Number(part.dataset.columnIndex)))
      .toEqual(answerParts.filter((part) => part.content && part.columnIndex >= 2).map((part) => part.columnIndex))
    expect(container.querySelector('[role="region"]')).toHaveAttribute("tabindex", "0")
  })

  it("keeps text column metadata and Markdown without image scales or resize fitting", () => {
    const observe = vi.fn()
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe
      },
    )
    try {
      const answer = "**First**\n\n*Second*"
      const { container } = render(
        <CardAnswer
          card={{
            id: "text",
            deckId: "deck",
            question: "Question",
            answer,
            tags: [],
            answerParts: [
              { content: "**First**", columnIndex: 0 },
              { content: "*Second*", columnIndex: 1 },
            ],
          }}
          content={answer}
          imageQuestion={false}
          fontScale={1.5}
          sourcePath=""
        />,
      )
      const parts = container.querySelectorAll<HTMLElement>(".card-answer-part")
      expect(Array.from(parts).map((part) => part.dataset.columnIndex)).toEqual(
        ["0", "1"],
      )
      for (const part of parts) {
        expect(part.style.getPropertyValue("--answer-column-scale")).toBe("1")
        expect(part.style.getPropertyValue("--answer-fit-scale")).toBe("")
      }
      expect(container.querySelector("strong")).toHaveTextContent("First")
      expect(container.querySelector("em")).toHaveTextContent("Second")
      expect(observe).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("clears fitted image styles when the same answer becomes a text card", () => {
    const card: Card = {
      id: "card",
      deckId: "deck",
      question: "Question",
      answer: "Answer",
      tags: [],
    }
    const { container, rerender } = render(
      <CardAnswer
        card={card}
        content={card.answer}
        imageQuestion
        fontScale={1}
        sourcePath=""
      />,
    )
    const part = container.querySelector<HTMLElement>(".card-answer-part")!
    part.style.setProperty("--answer-fit-scale", "0.5")
    part.style.setProperty("--answer-part-spacing", "8px")
    part.dataset.fitMode = "single-line"
    rerender(
      <CardAnswer
        card={card}
        content={card.answer}
        imageQuestion={false}
        fontScale={1}
        sourcePath=""
      />,
    )
    expect(part.style.getPropertyValue("--answer-fit-scale")).toBe("")
    expect(part.style.getPropertyValue("--answer-part-spacing")).toBe("")
    expect(part.dataset.fitMode).toBeUndefined()
  })

  it("keeps original column factors when the first answer cell is empty", () => {
    const parsed = parseDeckMarkdown(
      "# Birds\n| Image | Name | Genus | Detail | Rating |\n| --- | --- | --- | --- | --- |\n| ![[Bird.webp]] | | *Columba livia* | Stadttaube | 3 |",
    ).topics[0].cards[0]
    const { container } = renderAnswer(parsed)
    const parts = container.querySelectorAll<HTMLElement>(".card-answer-part")
    expect(Array.from(parts).map((part) => part.dataset.columnIndex)).toEqual([
      "1",
      "2",
    ])
    expect(parts[0].style.getPropertyValue("--answer-column-scale")).toBe(
      "var(--card-answer-secondary-scale)",
    )
    expect(parts[1].style.getPropertyValue("--answer-column-scale")).toBe(
      "var(--card-answer-other-scale)",
    )
    expect(parts[0].querySelector("em")).toHaveTextContent("Columba livia")
  })

  it("preserves paragraphs inside a column without creating extra answer parts", () => {
    const answer = "**Buchfink**\n\nEin Absatz\nNoch eine Zeile\n\n*Fringilla*"
    const card = {
      answer,
      answerParts: [
        {
          content: "**Buchfink**\n\nEin Absatz\nNoch eine Zeile",
          columnIndex: 0,
        },
        { content: "*Fringilla*", columnIndex: 1 },
      ],
    }
    const { container } = renderAnswer(card)
    expect(container.querySelectorAll(".card-answer-part")).toHaveLength(2)
    expect(container.querySelectorAll(".markdown-paragraph-gap")).toHaveLength(
      1,
    )
    expect(container.querySelector("strong")).toHaveTextContent("Buchfink")
    expect(container.querySelector("em")).toHaveTextContent("Fringilla")
    expect(card.answer).toBe(answer)
  })

  it("treats legacy paragraphs as one block and ignores outdated column metadata", () => {
    const { container } = renderAnswer({
      answer: "Geänderte Antwort\n\nZweiter Absatz",
      answerParts: [{ content: "Alte Antwort", columnIndex: 1 }],
    })
    expect(container.querySelectorAll(".card-answer-part")).toHaveLength(1)
    expect(container.querySelectorAll("p")).toHaveLength(2)
    expect(container).not.toHaveTextContent("Alte Antwort")
  })

  it("observes the card viewport and disconnects when changing learning modes", () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe
        disconnect = disconnect
      },
    )
    try {
      const card: Card = {
        id: "card",
        deckId: "deck",
        question: "Image",
        answer: "Buchfink",
        tags: [],
      }
      const { container, unmount } = render(
        <div className="card-content-viewport">
          <CardAnswer
            card={card}
            content={card.answer}
            imageQuestion
            fontScale={1}
            sourcePath=""
          />
        </div>,
      )
      expect(observe).toHaveBeenCalledWith(container.firstElementChild)
      unmount()
      expect(disconnect).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
