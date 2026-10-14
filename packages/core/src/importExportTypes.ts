export interface CardAnswerPart {
  content: string
  /** Zero-based position among the answer columns in the source table. */
  columnIndex: number
}

export interface DeckDocumentCard {
  question: string
  answer: string
  difficulty: number
  answerParts?: CardAnswerPart[]
}

export interface DeckDocumentTopic {
  name: string
  cards: DeckDocumentCard[]
}

export interface DeckDocument {
  title: string
  topics: DeckDocumentTopic[]
  sourceFileName?: string
  categoryName?: string
}

export interface ImportedImage {
  path: string
  blob: Blob
}

export interface ImportBundle {
  decks: DeckDocument[]
  images: ImportedImage[]
}

export interface MarkdownSourceFile {
  name: string
  content: string
}

export interface WorkspaceSnapshot {
  markdownFiles: MarkdownSourceFile[]
  images: ImportedImage[]
}
