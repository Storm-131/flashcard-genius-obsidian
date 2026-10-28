import type { CardAnswerPart } from "./importExportTypes"

export interface Card {
  id: string
  question: string
  answer: string
  answerParts?: CardAnswerPart[]
  imageAsQuestion?: boolean
  tags: string[]
  topicId?: string
  difficulty?: number
  /** False disables ratings; omission preserves support for older in-memory cards. */
  hasDifficultyColumn?: boolean
  deckId: string
}

export interface Deck {
  id: string
  name: string
  categoryId: string | null
  color: string
  sourceFileName?: string
}

export interface Category {
  id: string
  name: string
}

export interface DeckTopic {
  id: string
  deckId: string
  name: string
}

export type AppMode = "edit" | "study" | "stats"

export type ColorScheme = "neutral" | "indigo" | "sky" | "emerald" | "amber" | "rose"

export type SortOrder = "default" | "alphabetical" | "difficulty-asc" | "difficulty-desc" | "newest"
