import type { Card } from "@flashcard-genius/core"

function image(width: number, height: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#A7F3D0"/><rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="#047857" stroke-width="4"/><text x="50%" y="50%" text-anchor="middle" font-size="${Math.min(width, height) / 10}" fill="#065F46">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const previewCards: Card[] = [
  {
    id: "portrait",
    deckId: "preview",
    question: `![Portrait](${image(600, 1200, "Portrait")})`,
    answer:
      "**Portrait answer**\n\nThe complete image should be visible.\n\n2nd answer column\n\nThird answer column.",
    answerParts: [
      { content: "**Portrait answer**", columnIndex: 0 },
      { content: "The complete image should be visible.", columnIndex: 1 },
      { content: "2nd answer column", columnIndex: 2 },
      { content: "Third answer column.", columnIndex: 3 },
    ],
    tags: [],
    difficulty: 1,
  },
  {
    id: "landscape",
    deckId: "preview",
    question: "Landscape question",
    answer: `![Landscape](${image(1200, 600, "Landscape")})`,
    tags: [],
    difficulty: 2,
  },
  {
    id: "square",
    deckId: "preview",
    question: `![[${image(600, 600, "Square")}|100]]`,
    answer: "**Square answer**",
    tags: [],
    difficulty: 3,
  },
  {
    id: "small",
    deckId: "preview",
    question: "Small image question",
    answer: `![Small](${image(40, 30, "Small")})`,
    tags: [],
    difficulty: 4,
  },
  {
    id: "long-text",
    deckId: "preview",
    question: "Long text question",
    answer: `![Portrait with text](${image(600, 1200, "Portrait")})\n\n${Array.from({ length: 30 }, (_, index) => `Paragraph ${index + 1}: This long answer must remain accessible by scrolling.`).join("\n\n")}`,
    tags: [],
    difficulty: 5,
  },
  {
    id: "long-image-question",
    deckId: "preview",
    question: `![Portrait with long answer](${image(600, 1200, "Portrait")})`,
    answer: Array.from(
      { length: 30 },
      (_, index) =>
        `Answer paragraph ${index + 1}: This overlaid answer must remain accessible by scrolling.`,
    ).join("\n\n"),
    tags: [],
    difficulty: 1,
  },
  {
    id: "image-deck",
    deckId: "preview",
    question: "Image deck",
    answer: `![Image deck](${image(600, 1200, "Image deck")})`,
    imageAsQuestion: true,
    tags: [],
  },
  ...[
    { id: "bird-short", parts: ["**Buchfink**", "*Fringilla*"] },
    {
      id: "bird-long",
      parts: ["**Türkentaube**", "*Streptopelia*", "Zusatzinformation"],
    },
    { id: "bird-green", parts: ["**Grünspecht**", "*Picus viridis*"] },
    { id: "bird-wide", parts: ["**Buntspecht**", "*Dendrocopos*"] },
    { id: "bird-empty", parts: ["", "*Columba livia*", "Stadttaube"] },
  ].map(({ id, parts }): Card => {
    const answerParts = parts
      .map((content, columnIndex) => ({ content, columnIndex }))
      .filter((part) => part.content)
    return {
      id,
      deckId: "preview",
      question: `![${id}](${image(
        id === "bird-long" ? 600 : id === "bird-green" ? 1200 : 800,
        id === "bird-long" ? 1200 : 600,
        "",
      )})`,
      answer: answerParts.map((part) => part.content).join("\n\n"),
      answerParts,
      tags: [],
    }
  }),
  {
    id: "text-answer",
    deckId: "preview",
    question: "Was bleibt bei langen Textantworten erhalten?",
    answer: Array.from(
      { length: 15 },
      (_, index) =>
        `Textabsatz ${index + 1}: **Markdown** bleibt erhalten. Lange Antworten umbrechen automatisch und sind weiterhin durch Scrollen vollständig erreichbar.`,
    ).join("\n\n"),
    tags: [],
  },
  {
    id: "text-columns",
    deckId: "preview",
    question: "Wie bleiben Antwortspalten unterscheidbar?",
    answer: "Erste Antwort\n\nZweite Antwort\n\nZusatzinformation",
    answerParts: [
      { content: "Erste Antwort", columnIndex: 0 },
      { content: "Zweite Antwort", columnIndex: 1 },
      { content: "Zusatzinformation", columnIndex: 2 },
    ],
    tags: [],
  },
]
