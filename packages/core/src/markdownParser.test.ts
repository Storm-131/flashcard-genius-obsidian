import { describe, expect, it } from "vitest"
import birdsMarkdown from "./fixtures/birds.md?raw"
import { parseDeckMarkdown } from "./markdownParser"
import { tableCells } from "./markdownTable"

function parseRow(answers: string[], rating = "3", question = "Question") {
  const header = [
    "Front",
    ...answers.map((_, index) => `Detail ${index}`),
    "Rating",
  ]
  return parseDeckMarkdown(
    [
      "# Deck",
      `| ${header.join(" | ")} |`,
      `| ${header.map(() => "---").join(" | ")} |`,
      `| ${[question, ...answers, rating].join(" | ")} |`,
    ].join("\n"),
  ).topics[0].cards[0]
}

describe("positional Markdown cards", () => {
  it.each(["⭐", "⭐️", "★", "★︎", "*", "Sterne", "Stars", "Schwierigkeit", "Difficulty", "Rating", "  dIfFiCuLtY  "])(
    "recognises the explicit final difficulty header %j",
    (header) => {
      const card = parseDeckMarkdown(`# Deck\n| Q | A | ${header} |\n| --- | --- | --- |\n| Question | Answer | 4 |`).topics[0].cards[0]
      expect(card).toMatchObject({ answer: "Answer", difficulty: 4, hasDifficultyColumn: true })
    },
  )

  it.each(["Details", "Number", "", "Stars and notes", "R"])(
    "retains numeric final answers under an unrecognised header %j",
    (header) => {
      const card = parseDeckMarkdown(`# Deck\n| Q | A | ${header} |\n| --- | --- | --- |\n| Question | Answer | 5 |`).topics[0].cards[0]
      expect(card).toEqual({
        question: "Question", answer: "Answer\n\n5", difficulty: 0, hasDifficultyColumn: false,
        answerParts: [{ content: "Answer", columnIndex: 0 }, { content: "5", columnIndex: 1 }],
      })
    },
  )

  it("recognises only the last header, keeping earlier star headers as answer columns", () => {
    const card = parseDeckMarkdown("# Deck\n| Q | Stars | Details |\n| --- | --- | --- |\n| Question | 3 | Important |")
      .topics[0].cards[0]
    expect(card).toMatchObject({ answer: "3\n\nImportant", difficulty: 0, hasDifficultyColumn: false })
  })

  it("preserves multiple answer columns and empty positions without stars", () => {
    const card = parseDeckMarkdown("# Deck\n| Q | Name | Species | Notes |\n| --- | --- | --- | --- |\n| ![[bird.webp]] | | *Parus major* | **Bird**<br>Details |")
      .topics[0].cards[0]
    expect(card).toEqual({
      question: "![[bird.webp]]", answer: "*Parus major*\n\n**Bird**\nDetails", difficulty: 0, hasDifficultyColumn: false,
      answerParts: [{ content: "*Parus major*", columnIndex: 1 }, { content: "**Bird**\nDetails", columnIndex: 2 }],
    })
  })

  it("keeps raw pipes in legacy single-answer tables without stars", () => {
    const card = parseDeckMarkdown("# Deck\n| Q | A |\n| --- | --- |\n| Question | A|B |")
      .topics[0].cards[0]
    expect(card).toMatchObject({ answer: "A|B", hasDifficultyColumn: false })
  })

  it("reads one answer column with an explicit final rating header", () => {
    expect(parseRow(["**Answer**"])).toEqual({
      question: "Question",
      answer: "**Answer**",
      difficulty: 3,
      hasDifficultyColumn: true,
    })
  })

  it("joins two answer columns with an empty line", () => {
    expect(parseRow(["**Kohlmeise**", "(*Parus major*)"]).answer).toBe(
      "**Kohlmeise**\n\n(*Parus major*)",
    )
  })

  it.each([3, 8, 32])("preserves the order of %i answer columns", (count) => {
    const answers = Array.from(
      { length: count },
      (_, index) => `Answer ${index + 1}`,
    )
    expect(parseRow(answers).answer).toBe(answers.join("\n\n"))
  })

  it("ignores empty, whitespace-only and br-only answer cells", () => {
    expect(
      parseRow(["", "**First**", "   ", "<br>", "- Second<br>- Third", ""])
        .answer,
    ).toBe("**First**\n\n- Second\n- Third")
  })

  it.each(["![[Kohlmeise.webp\\|100]]", "![[Kohlmeise.webp|100]]"])(
    "preserves wiki image questions: %s",
    (question) => {
      expect(parseRow(["Bird", "*Parus major*"], "4", question)).toEqual({
        question: "![[Kohlmeise.webp|100]]",
        answer: "Bird\n\n*Parus major*",
        difficulty: 4,
        hasDifficultyColumn: true,
        answerParts: [
          { content: "Bird", columnIndex: 0 },
          { content: "*Parus major*", columnIndex: 1 },
        ],
      })
    },
  )

  it.each(["Question", "![[Bird.webp]]"])(
    "retains answer column positions while skipping empty cells: %s",
    (question) => {
      const card = parseRow(["", "Second", "Third", "Fourth"], "3", question)
      expect(card.answer).toBe("Second\n\nThird\n\nFourth")
      expect(card.answerParts).toEqual([
        { content: "Second", columnIndex: 1 },
        { content: "Third", columnIndex: 2 },
        { content: "Fourth", columnIndex: 3 },
      ])
    },
  )

  it("preserves Markdown images, escaped pipes, code and math across answer columns", () => {
    expect(
      parseRow([
        "![Bird](img/bird.webp)",
        "**A\\|B**",
        "`A|B`",
        "$P(A|B)$",
        "\\(A|B\\)",
      ]).answer,
    ).toBe(
      "![Bird](img/bird.webp)\n\n**A|B**\n\n`A|B`\n\n$P(A|B)$\n\n\\(A|B\\)",
    )
  })

  it.each([1, 2, 3, 4, 5])(
    "reads difficulty %i from the last position",
    (rating) => {
      expect(parseRow(["First", "Second"], String(rating)).difficulty).toBe(
        rating,
      )
    },
  )

  it("preserves pipes in Markdown links and image URLs", () => {
    expect(
      parseRow(["[A|B](https://example.com/a|b)", "![A|B](img/a|b.png)"])
        .answer,
    ).toBe("[A|B](https://example.com/a|b)\n\n![A|B](img/a|b.png)")
  })

  it.each(["", " ", "0", "6", "-1", "2.5", "hard", "NaN", "Infinity"])(
    "defaults invalid difficulty %j to zero",
    (rating) => {
      expect(parseRow(["Answer", "Detail"], rating).difficulty).toBe(0)
    },
  )

  it("keeps the answer when the final difficulty cell is missing", () => {
    const card = parseDeckMarkdown(
      "# Deck\n| Q | A | Rating |\n| --- | --- | --- |\n| Question | Answer |",
    ).topics[0].cards[0]
    expect(card).toEqual({
      question: "Question",
      answer: "Answer",
      difficulty: 0,
      hasDifficultyColumn: true,
    })
  })

  it("supports legacy two-column tables and heading cards", () => {
    expect(
      parseDeckMarkdown(
        "# Deck\n| Q | A |\n| --- | --- |\n| Question | Answer |",
      ).topics[0].cards[0],
    ).toEqual({ question: "Question", answer: "Answer", difficulty: 0, hasDifficultyColumn: false })
    expect(
      parseDeckMarkdown(
        "# Deck\n## Allgemein\n#### **Question**\nAnswer\n- - -",
      ).topics[0],
    ).toEqual({
      name: "General",
      cards: [{ question: "Question", answer: "Answer", difficulty: 0, hasDifficultyColumn: false }],
    })
  })

  it("imports the original birds document including its trailing empty row", () => {
    const deck = parseDeckMarkdown(birdsMarkdown, "Vögel 🦜.md")
    expect(deck.title).toBe("Vögel 🦜")
    expect(deck.topics.map((topic) => topic.cards.length)).toEqual([21, 2, 4])
    expect(deck.topics[0].cards[0]).toEqual({
      question: "![[Kohlmeise.webp|100]]",
      answer: "**Kohlmeise**\n(*Parus major*)",
      difficulty: 1,
      hasDifficultyColumn: true,
      answerParts: [
        { content: "**Kohlmeise**\n(*Parus major*)", columnIndex: 0 },
      ],
    })
    expect(deck.topics[2].cards[3].question).toBe("![[Vögel 🦜-1.webp|100]]")
    expect(
      deck.topics
        .flatMap((topic) => topic.cards)
        .every((card) => card.difficulty === 1),
    ).toBe(true)
  })

  it("still rejects incomplete cards instead of silently losing them", () => {
    expect(() => parseRow(["", ""], "3")).toThrow(
      "does not match the deck format",
    )
    expect(() => parseRow(["Answer"], "3", "")).toThrow(
      "does not match the deck format",
    )
  })

  it("retains cell offsets even without a trailing pipe", () => {
    const line = "| ![[Bird.webp|100]] | `a|b` | 2  "
    expect(
      tableCells(line).map((cell) => line.slice(cell.start, cell.end).trim()),
    ).toEqual(["![[Bird.webp|100]]", "`a|b`", "2"])
  })
})
