import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import DifficultyStars from "./DifficultyStars"
import StarsToggleButton from "./StarsToggleButton"
import MarkdownContent from "./MarkdownContent"
import CardAnswer from "./CardAnswer"
import CardQuestion from "./CardQuestion"
import useFitAnswerText from "./useFitAnswerText"
import useCardNavigation from "./useCardNavigation"
import CardFontSizeControl, { useCardFontSize } from "./CardFontSizeControl"
import useCardColumns, { type CardColumns } from "./useCardColumns"
import {
  extractMarkdownImages,
  stripMarkdownImages,
} from "../images/markdownImages"
import type { Card, Deck, DeckTopic } from "../types"
import type { MarkdownRenderContext } from "../markdownRenderer"

interface Props {
  cards: Card[]
  deck: Deck | null
  decks: Deck[]
  topics: DeckTopic[]
  cardOrderByDeck: Record<string, string[]>
  selectedCardId?: string | null
  onSelectCard?: (id: string) => void
  cardColumns?: CardColumns
  onCardColumnsChange?: (value: CardColumns) => void
  onExit: () => void
  onEditSource?: () => void
  onDifficultyChange: (id: string, difficulty: number) => void
  immutable?: boolean
  allowDifficultyChanges?: boolean
  responsiveBreakpoint?: number
  showStars: boolean
  onToggleShowStars: () => void
  onImageDeckActionBlocked?: (action: "edit" | "stars") => void
  markdownContext?: MarkdownRenderContext
  cardSourcePaths?: Record<string, string>
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isImageControlTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(".markdown-image-zoom, .image-overlay"))
  )
}

export function StudyCard({
  card,
  isFlipped,
  isSelected = false,
  onClick,
  onDifficultyChange,
  cardHeight,
  squareCards,
  fontScale = 1,
  immutable = false,
  allowDifficultyChanges = false,
  showStars,
  markdownContext,
  sourcePath = "",
}: {
  card: Card
  isFlipped: boolean
  isSelected?: boolean
  onClick: () => void
  onDifficultyChange: (difficulty: number) => void
  cardHeight: number
  squareCards: boolean
  fontScale?: number
  immutable?: boolean
  allowDifficultyChanges?: boolean
  showStars: boolean
  markdownContext?: MarkdownRenderContext
  sourcePath?: string
}) {
  const images = extractMarkdownImages(card.answer)
  const questionImages = extractMarkdownImages(card.question)
  const questionHasImage = questionImages.length > 0
  const questionHeading = questionHasImage
    ? stripMarkdownImages(card.question)
    : card.question
  const usesImageAsQuestion = Boolean(card.imageAsQuestion && images.length > 0)
  const isImageQuestion = questionHasImage || usesImageAsQuestion
  const answerContent = usesImageAsQuestion ? questionHeading : card.answer
  const { ref: typographyRef, overflow: questionOverflow } = useFitAnswerText(card.question, !isImageQuestion, fontScale, "question")

  return (
    <div
      ref={typographyRef}
      className={`flip-card${isSelected ? " is-card-selected" : ""}`}
      aria-current={isSelected ? "true" : undefined}
      data-card-kind={isImageQuestion ? "image" : "text"}
      data-card-id={card.id}
      onPointerDown={(event) => {
        if (isImageControlTarget(event.target)) event.stopPropagation()
      }}
      onClick={(event) => {
        if (isImageControlTarget(event.target)) {
          event.stopPropagation()
          return
        }
        if ((event.target as Element).closest('a, button, input, textarea')) return
        event.currentTarget.focus({ preventScroll: true })
        onClick()
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === "Enter") {
          event.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={
        isFlipped
          ? "Answer visible; select and flip card back"
          : "Question visible; select and reveal answer"
      }
      style={
        {
          height: squareCards ? "auto" : `${cardHeight}px`,
          aspectRatio: squareCards ? "1 / 1" : undefined,
          cursor: "pointer",
          "--card-font-scale": fontScale,
        } as CSSProperties
      }
      title="Click to select and flip; Space also flips the selected card"
    >
      <div className={`flip-card-inner${isFlipped ? " is-flipped" : ""}`}>
        {/* Front — Question */}
        <div
          className="flip-card-face"
          style={{
            background: "#FFFFFF",
            borderRadius: "10px",
            border: "1px solid #E2DED4",
            padding: "20px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            transition: "box-shadow 0.15s",
          }}
        >
          <div
            style={{
              fontSize: "calc(9.5px * var(--app-ui-font-scale, 1.125))",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9B9488",
              marginBottom: "8px",
            }}
          >
            {usesImageAsQuestion ? "Image question" : "Question"}
          </div>
          <div
            className="card-content-viewport"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              paddingBottom: isImageQuestion ? 0 : "28px",
              paddingRight: "3px",
              display: "flex",
              flexDirection: "column",
              justifyContent: isImageQuestion ? "center" : undefined,
            }}
          >
            <div
              className={isImageQuestion ? "study-image-question" : "study-text-question"}
              style={{
                marginBottom: "4px",
                flex: usesImageAsQuestion ? 1 : undefined,
                minHeight: usesImageAsQuestion ? 0 : undefined,
                display: usesImageAsQuestion ? "flex" : undefined,
                flexDirection: usesImageAsQuestion ? "column" : undefined,
              }}
            >
              {!isImageQuestion ? <CardQuestion content={card.question} overflow={questionOverflow} markdownContext={markdownContext} sourcePath={sourcePath} /> : <MarkdownContent
                content={usesImageAsQuestion ? images[0].raw : card.question}
                allowImages
                markdownContext={markdownContext}
                sourcePath={sourcePath}
                className={
                  isImageQuestion
                    ? "image-question-content"
                    : "study-text-content"
                }
                style={{
                  flex: usesImageAsQuestion ? 1 : undefined,
                  height: usesImageAsQuestion ? "100%" : undefined,
                  minHeight: usesImageAsQuestion ? 0 : undefined,
                  display: usesImageAsQuestion ? "flex" : undefined,
                  flexDirection: usesImageAsQuestion ? "column" : undefined,
                  justifyContent: usesImageAsQuestion ? "center" : undefined,
                  alignItems: usesImageAsQuestion ? "center" : undefined,
                  fontSize: `calc(${13.5 * fontScale}px * var(--card-text-base-scale, 1.125))`,
                  fontWeight: 500,
                  color: "#111110",
                  lineHeight: "1.5",
                }}
              />}
            </div>
          </div>
          <div
            style={{
              marginTop: "12px",
              fontSize: "calc(10.5px * var(--app-ui-font-scale, 1.125))",
              color: "#C8C4B8",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M5 2v3l2 2"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="5"
                cy="5"
                r="4"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            Click or Space to reveal
          </div>
          {showStars && images.length === 0 && (
            <DifficultyStars
              value={card.difficulty ?? 0}
              onChange={onDifficultyChange}
              className="difficulty-stars card-action-control"
              readOnly={card.hasDifficultyColumn === false || (immutable && !allowDifficultyChanges)}
            />
          )}
        </div>

        {/* Back — Answer */}
        <div
          className="flip-card-face flip-card-back"
          style={{
            background:
              "color-mix(in srgb, var(--app-accent, #4F46E5) 76%, #FFFFFF)",
            borderRadius: "10px",
            border:
              "1px solid color-mix(in srgb, var(--app-accent-strong, #4338CA) 70%, #FFFFFF)",
            padding: "20px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 2px 10px rgba(79,70,229,0.25)",
          }}
        >
          {questionHeading && !isImageQuestion && (
            <div className="card-heading">
              <CardQuestion content={questionHeading} overflow={questionOverflow} markdownContext={markdownContext} sourcePath={sourcePath} />
            </div>
          )}
          {questionHeading && !questionHasImage && !usesImageAsQuestion && (
            <div className="study-answer-divider" aria-hidden="true" />
          )}
          <div
            className="card-content-viewport"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              paddingBottom: "28px",
              paddingRight: "3px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {isImageQuestion || images.length === 0 ? (
              <CardAnswer
                card={card}
                content={answerContent}
                imageQuestion={isImageQuestion}
                fontScale={fontScale}
                markdownContext={markdownContext}
                sourcePath={sourcePath}
              />
            ) : (
              <MarkdownContent
                content={answerContent}
                markdownContext={markdownContext}
                sourcePath={sourcePath}
                className={images.length > 0 ? "card-image-content" : undefined}
                style={{
                  flex: images.length > 0 ? 1 : undefined,
                  height: images.length > 0 ? "100%" : undefined,
                  minHeight: images.length > 0 ? 0 : undefined,
                  display: images.length > 0 ? "flex" : undefined,
                  flexDirection: images.length > 0 ? "column" : undefined,
                  fontSize: "var(--card-text-font-size)",
                  color: "#FFFFFF",
                  lineHeight: "1.5",
                }}
              />
            )}
          </div>
          {showStars && images.length === 0 && (
            <DifficultyStars
              value={card.difficulty ?? 0}
              onChange={onDifficultyChange}
              className="difficulty-stars card-action-control"
              darkBackground
              readOnly={card.hasDifficultyColumn === false || (immutable && !allowDifficultyChanges)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudyMode({
  cards,
  deck,
  decks,
  topics,
  cardOrderByDeck,
  selectedCardId,
  onSelectCard,
  cardColumns,
  onCardColumnsChange,
  onEditSource,
  onDifficultyChange,
  immutable = false,
  allowDifficultyChanges = false,
  responsiveBreakpoint = 1024,
  showStars,
  onToggleShowStars,
  onImageDeckActionBlocked,
  markdownContext,
  cardSourcePaths,
}: Props) {
  const hasImageCards = useMemo(
    () => cards.some((card) => extractMarkdownImages(card.answer).length > 0),
    [cards],
  )
  const handleStarsToggle = () => {
    if (hasImageCards) {
      onImageDeckActionBlocked?.("stars")
      return
    }
    onToggleShowStars()
  }
  const editOrderedIds = useMemo(() => {
    const deckPositions = new Map(decks.map((item, index) => [item.id, index]))
    return [...cards]
      .sort((a, b) => {
        const deckDifference =
          (deckPositions.get(a.deckId) ?? Number.MAX_SAFE_INTEGER) -
          (deckPositions.get(b.deckId) ?? Number.MAX_SAFE_INTEGER)
        if (deckDifference !== 0) return deckDifference
        const positions = new Map(
          (cardOrderByDeck[a.deckId] ?? []).map((id, index) => [id, index]),
        )
        return (
          (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        )
      })
      .map((card) => card.id)
  }, [cards, cardOrderByDeck, decks])
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    cards.map((c) => c.id),
  )
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set())
  const [orderStatus, setOrderStatus] =
    useState<"edit-order" | "difficulty-asc" | "difficulty-desc" | "shuffled" | "revealed-last">(
      "edit-order",
    )
  const [columnSettings, setColumnSettings] = useCardColumns(cardColumns, onCardColumnsChange)
  const { count: cardsPerRow, manuallySet: cardsPerRowManuallySet } = columnSettings
  const [cardHeight, setCardHeight] = useState(200)
  const [cardFontSize, setCardFontSize] = useCardFontSize()
  const [squareCards, setSquareCards] = useState(true)
  const [layoutControlsOpen, setLayoutControlsOpen] = useState(false)
  const [sortControlsOpen, setSortControlsOpen] = useState(false)
  const [overflowSortOpen, setOverflowSortOpen] = useState(false)
  const layoutControlsRef = useRef<HTMLDivElement>(null)
  const sortControlsRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const toolbarTitleRef = useRef<HTMLHeadingElement>(null)
  const toolbarActionsRef = useRef<HTMLDivElement>(null)
  const toolbarActionsWidthRef = useRef(450)
  const overflowMenuRef = useRef<HTMLDivElement>(null)
  const [toolbarStacked, setToolbarStacked] = useState(false)
  const [toolbarOverflowLevel, setToolbarOverflowLevel] = useState(0)
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  )
  const studyModeRef = useRef<HTMLDivElement>(null)
  const heightOptions = [160, 200, 240, 280, 320, 360]

  useEffect(() => {
    const element = studyModeRef.current
    if (!element) return

    const updateViewportWidth = () =>
      setViewportWidth(element.clientWidth || window.innerWidth)
    updateViewportWidth()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewportWidth)
      return () => window.removeEventListener("resize", updateViewportWidth)
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setViewportWidth(width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const measureToolbar = () => {
      const title = toolbarTitleRef.current
      const actions = toolbarActionsRef.current
      if (!title || !actions) return

      const actionChildren = Array.from(actions.children) as HTMLElement[]
      const actionGap = Number.parseFloat(getComputedStyle(actions).gap) || 0
      const measuredActionsWidth =
        actionChildren.reduce(
          (total, child) => total + child.getBoundingClientRect().width,
          0,
        ) +
        Math.max(0, actionChildren.length - 1) * actionGap
      if (actionChildren.length === 6 && measuredActionsWidth > 0)
        toolbarActionsWidthRef.current = measuredActionsWidth
      const toolbarStyle = getComputedStyle(toolbar)
      const horizontalPadding =
        (Number.parseFloat(toolbarStyle.paddingLeft) || 0) +
        (Number.parseFloat(toolbarStyle.paddingRight) || 0)
      const availableActionsWidth =
        toolbar.clientWidth - horizontalPadding - title.scrollWidth - 12
      const overflowLevel =
        availableActionsWidth >= toolbarActionsWidthRef.current
          ? 0
          : availableActionsWidth >= 360
            ? 1
            : availableActionsWidth >= 290
              ? 2
              : availableActionsWidth >= 210
                ? 3
                : availableActionsWidth >= 130
                  ? 4
                  : 5
      setToolbarOverflowLevel(overflowLevel)
      setToolbarStacked(overflowLevel > 0)
    }

    measureToolbar()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureToolbar)
      return () => window.removeEventListener("resize", measureToolbar)
    }
    const observer = new ResizeObserver(measureToolbar)
    observer.observe(toolbar)
    return () => observer.disconnect()
  }, [cards.length, deck?.name, viewportWidth])

  useEffect(() => {
    if (!overflowMenuOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!overflowMenuRef.current?.contains(event.target as Node))
        setOverflowMenuOpen(false)
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    return () => document.removeEventListener("mousedown", closeOnOutsideClick)
  }, [overflowMenuOpen])

  useEffect(() => {
    if (!overflowMenuOpen) setOverflowSortOpen(false)
  }, [overflowMenuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!layoutControlsRef.current?.contains(target))
        setLayoutControlsOpen(false)
      if (!sortControlsRef.current?.contains(target)) setSortControlsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  const cardIdSignature = cards.map((card) => card.id).join("|")
  const editOrderSignature = editOrderedIds.join("|")

  useEffect(() => {
    const nextIds = new Set(editOrderedIds)
    setOrderedIds(editOrderedIds)
    setFlippedIds(
      (previous) => new Set([...previous].filter((id) => nextIds.has(id))),
    )
    setOrderStatus("edit-order")
  }, [cardIdSignature, editOrderSignature])

  const cardMap = useMemo(
    () => Object.fromEntries(cards.map((c) => [c.id, c])),
    [cards],
  )

  const orderedCards = useMemo(
    () => orderedIds.map((id) => cardMap[id]).filter(Boolean),
    [orderedIds, cardMap],
  )

  const handleFlip = useCallback((id: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleReset = () => {
    setOrderedIds(editOrderedIds)
    setFlippedIds(new Set())
    setOrderStatus("edit-order")
  }

  const handleOrderChange = (value: typeof orderStatus) => {
    if (value === "edit-order") setOrderedIds(editOrderedIds)
    if (value === "difficulty-asc")
      setOrderedIds(
        [...cards]
          .sort((a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0))
          .map((card) => card.id),
      )
    if (value === "difficulty-desc")
      setOrderedIds(
        [...cards]
          .sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0))
          .map((card) => card.id),
      )
    if (value === "shuffled")
      setOrderedIds(shuffle(cards.map((card) => card.id)))
    if (value === "revealed-last") {
      setOrderedIds((previous) => [
        ...previous.filter((id) => !flippedIds.has(id)),
        ...previous.filter((id) => flippedIds.has(id)),
      ])
    }
    setOrderStatus(value)
  }

  const editOrderGroups = useMemo(() => {
    if (orderStatus !== "edit-order") return []
    const cardMapById = new Map(orderedCards.map((card) => [card.id, card]))
    const activeDecks = decks.filter((item) =>
      orderedCards.some((card) => card.deckId === item.id),
    )
    const includeDeckName = activeDecks.length > 1

    return activeDecks.flatMap((activeDeck) => {
      const deckCards = orderedIds
        .map((id) => cardMapById.get(id))
        .filter((card): card is Card =>
          Boolean(card && card.deckId === activeDeck.id),
        )
      const deckTopics = topics.filter(
        (topic) => topic.deckId === activeDeck.id,
      )
      const topicGroups = deckTopics
        .map((topic) => ({
          topic,
          cards: deckCards.filter((card) => card.topicId === topic.id),
        }))
        .filter((group) => group.cards.length > 0)
        .map((group) => ({
          id: `${activeDeck.id}:${group.topic.id}`,
          title: includeDeckName
            ? `${activeDeck.name} — ${group.topic.name}`
            : group.topic.name,
          cards: group.cards,
        }))
      const knownTopicIds = new Set(deckTopics.map((topic) => topic.id))
      const unassignedCards = deckCards.filter(
        (card) => !card.topicId || !knownTopicIds.has(card.topicId),
      )
      return [
        ...topicGroups,
        ...(unassignedCards.length > 0
          ? [
              {
                id: `${activeDeck.id}:unassigned`,
                title: includeDeckName
                  ? `${activeDeck.name} — No subtopic`
                  : "No subtopic",
                cards: unassignedCards,
              },
            ]
          : []),
      ]
    })
  }, [decks, orderedCards, orderedIds, orderStatus, topics])

  const revealed = flippedIds.size
  const total = orderedCards.length
  const progress = total > 0 ? (revealed / total) * 100 : 0
  const scaledCardHeight = cardHeight
  const responsiveMaxCards =
    viewportWidth <= 480
      ? 1
      : viewportWidth <= 640
        ? 2
        : viewportWidth <= responsiveBreakpoint
          ? 3
          : 4
  const effectiveCardsPerRow =
    viewportWidth <= 480
      ? 1
      : cardsPerRowManuallySet
        ? cardsPerRow
        : Math.min(cardsPerRow, responsiveMaxCards)

  useCardNavigation({
    containerRef: studyModeRef,
    groups: orderStatus === "edit-order" ? editOrderGroups.map(group => group.cards) : [orderedCards],
    columns: effectiveCardsPerRow,
    selectedCardId,
    onSelectCard,
    onFlip: handleFlip,
    onRate: (card, value) => {
      if (card.hasDifficultyColumn !== false && !extractMarkdownImages(card.answer).length && (!immutable || allowDifficultyChanges)) {
        onDifficultyChange(card.id, value)
      }
    },
  })

  const progressIndicator = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "7px",
      }}
    >
      <div
        style={{
          flex: 1,
          height: "4px",
          background: "#E2DED4",
          borderRadius: "2px",
          overflow: "hidden",
          maxWidth: "240px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--app-accent, #6B6560)",
            borderRadius: "2px",
            transition: "width 0.3s",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "calc(11.5px * var(--app-ui-font-scale, 1.125))",
          color: "#9B9488",
          fontFamily: "var(--font-monospace)",
        }}
      >
        {revealed}/{total} revealed
      </span>
    </div>
  )

  return (
    <div
      className="study-mode"
      ref={studyModeRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#F7F6F2",
        overflow: "hidden",
      }}
    >
      {/* Study controls */}
      <div
        className="panel-toolbar"
        ref={toolbarRef}
        style={{
          padding: "14px 20px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2DED4",
          display: "flex",
          alignItems: "center",
          flexDirection: "row",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, width: "100%", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <h2
              ref={toolbarTitleRef}
              style={{
                fontSize: "calc(15px * var(--app-ui-font-scale, 1.125))",
                fontWeight: 700,
                color: "#111110",
                margin: 0,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {deck ? deck.name : "All Decks"} — Study Mode
            </h2>
          </div>
          {!toolbarStacked && progressIndicator}
        </div>

        {/* Controls */}
        <div
          ref={toolbarActionsRef}
          style={{
            display: toolbarOverflowLevel === 5 ? "none" : "flex",
            alignItems: "center",
            gap: "6px",
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          {toolbarOverflowLevel < 2 && (
            <button
              className="study-reset-button"
              onClick={handleReset}
              onMouseEnter={(event) => event.currentTarget.classList.add("is-hovered")}
              onMouseLeave={(event) => event.currentTarget.classList.remove("is-hovered")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                height: "32px",
                borderRadius: "6px",
                border: "1px solid #E2DED4",
                color: "#6B6560",
                fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5A4.5 4.5 0 1 1 6.5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M2 4v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Reset
            </button>
          )}

          {toolbarOverflowLevel < 5 && (
            <div ref={sortControlsRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setSortControlsOpen((open) => !open)}
                className="layout-button"
                aria-expanded={sortControlsOpen}
                style={{
                  padding: "0 10px",
                  height: "32px",
                  borderRadius: "6px",
                  border: "1px solid #E2DED4",
                  background: "#FAFAF8",
                  color: "#6B6560",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
                }}
              >
                Sort By
              </button>
              {sortControlsOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "38px",
                    right: 0,
                    zIndex: 20,
                    display: "grid",
                    gap: "3px",
                    width: "190px",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #E2DED4",
                    background: "#FFFFFF",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                  }}
                >
                  {([
                    ["edit-order", "Default order"],
                    ["difficulty-asc", "★ 1 → 5"],
                    ["difficulty-desc", "★ 5 → 1"],
                    ["shuffled", "Shuffle"],
                    ["revealed-last", "Revealed last"],
                  ] as [typeof orderStatus, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        handleOrderChange(value)
                        setSortControlsOpen(false)
                      }}
                      aria-pressed={orderStatus === value}
                      style={{
                        padding: "6px 8px",
                        border: "none",
                        borderRadius: "5px",
                        background:
                          orderStatus === value ? "#F0EDE6" : "transparent",
                        color: "#6B6560",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize:
                          "calc(11px * var(--app-ui-font-scale, 1.125))",
                        textAlign: "left",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {toolbarOverflowLevel < 5 && (
            <button
              type="button"
              onClick={onEditSource}
              disabled={!onEditSource}
              title={onEditSource ? "Open Markdown source beside Flashcard Genius" : "Select a card with an unambiguous Markdown source"}
              style={{
                height: "30px",
                padding: "0 10px",
                borderRadius: "6px",
                border: "1px solid #E2DED4",
                background: "#FAFAF8",
                color: "#6B6560",
                opacity: onEditSource ? 1 : 0.5,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
              }}
            >
              Edit
            </button>
          )}

          {toolbarOverflowLevel < 4 && (
            <StarsToggleButton
              cards={cards}
              showStars={showStars}
              onClick={handleStarsToggle}
              style={{
                padding: "0 10px",
                height: "32px",
                borderRadius: "6px",
                border: showStars
                  ? "1px solid var(--app-accent, #4F46E5)"
                  : "1px solid #E2DED4",
                background: showStars
                  ? "var(--app-accent-soft, #FAFAF8)"
                  : "#FAFAF8",
                color: showStars
                  ? "var(--app-accent-strong, #6B6560)"
                  : "#6B6560",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
              }}
            />
          )}

          {toolbarOverflowLevel < 3 && (
            <div ref={layoutControlsRef} style={{ position: "relative" }}>
              <button
                className="layout-button"
                onClick={() => setLayoutControlsOpen((open) => !open)}
                style={{
                  height: "30px",
                  padding: "0 10px",
                  borderRadius: "6px",
                  border: "1px solid #E2DED4",
                  background: "#FAFAF8",
                  color: "#6B6560",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
                }}
              >
                Card size
              </button>
              {layoutControlsOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "36px",
                    right: 0,
                    zIndex: 20,
                    width: "210px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #E2DED4",
                    background: "#FFFFFF",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gap: "8px",
                      fontSize: "calc(11px * var(--app-ui-font-scale, 1.125))",
                      color: "#6B6560",
                      width: "100%",
                    }}
                  >
                    <span>Cards per row: {effectiveCardsPerRow}</span>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                        gap: "4px",
                        width: "100%",
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setColumnSettings({ count: value, manuallySet: true })
                          }}
                          aria-pressed={effectiveCardsPerRow === value}
                          style={{
                            width: "100%",
                            height: "28px",
                            padding: 0,
                            borderRadius: "5px",
                            border:
                              effectiveCardsPerRow === value
                                ? "1px solid var(--app-accent, #4F46E5)"
                                : "1px solid #E2DED4",
                            background:
                              effectiveCardsPerRow === value
                                ? "var(--app-accent-soft, #EEF2FF)"
                                : "#FAFAF8",
                            color:
                              effectiveCardsPerRow === value
                                ? "var(--app-accent-strong, #4338CA)"
                                : "#6B6560",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize:
                              "calc(11px * var(--app-ui-font-scale, 1.125))",
                          }}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label
                    style={{
                      display: "grid",
                      gap: "4px",
                      marginTop: "14px",
                      fontSize: "calc(11px * var(--app-ui-font-scale, 1.125))",
                      color: "#6B6560",
                    }}
                  >
                    Height:{" "}
                    {squareCards
                      ? "square"
                      : `${Math.round(scaledCardHeight)}px`}
                    <input
                      type="range"
                      min="160"
                      max="400"
                      step="10"
                      value={cardHeight}
                      onChange={(event) => {
                        setCardHeight(Number(event.target.value))
                        setSquareCards(false)
                      }}
                      style={{
                        width: "100%",
                        accentColor: "var(--app-accent, #4F46E5)",
                      }}
                    />
                  </label>
                  <CardFontSizeControl
                    value={cardFontSize}
                    onChange={setCardFontSize}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setColumnSettings({ count: 4, manuallySet: false })
                      setCardHeight(200)
                      setSquareCards(true)
                      setCardFontSize(100)
                    }}
                    style={{
                      marginTop: "12px",
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #E2DED4",
                      background: "#FAFAF8",
                      color: "#6B6560",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "calc(11px * var(--app-ui-font-scale, 1.125))",
                    }}
                  >
                    Default (square cards)
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
        {toolbarStacked && (
          <div
            ref={overflowMenuRef}
            style={{ position: "relative", flexShrink: 0 }}
          >
            <button
              type="button"
              className="layout-button"
              onClick={() => setOverflowMenuOpen((open) => !open)}
              aria-label="Open study controls"
              aria-expanded={overflowMenuOpen}
              style={{
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 8px",
                borderRadius: "6px",
                border: "1px solid #E2DED4",
                background: overflowMenuOpen
                  ? "var(--app-accent-soft, #EEF2FF)"
                  : "#FAFAF8",
                color: "#6B6560",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                aria-hidden="true"
              >
                <line
                  x1="2"
                  y1="4"
                  x2="13"
                  y2="4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="2"
                  y1="7.5"
                  x2="13"
                  y2="7.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="2"
                  y1="11"
                  x2="13"
                  y2="11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {overflowMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "36px",
                  right: 0,
                  zIndex: 30,
                  width: "230px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #E2DED4",
                  background: "#FFFFFF",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                  display: "grid",
                  gap: "8px",
                }}
              >
                {toolbarOverflowLevel >= 3 && (
                  <div
                    style={{
                      display: "grid",
                      gap: "6px",
                      fontSize: "calc(11px * var(--app-ui-font-scale, 1.125))",
                      color: "#6B6560",
                    }}
                  >
                    <span>Cards per row: {effectiveCardsPerRow}</span>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                        gap: "4px",
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setColumnSettings({ count: value, manuallySet: true })
                          }}
                          aria-pressed={effectiveCardsPerRow === value}
                          style={{
                            height: "28px",
                            padding: 0,
                            borderRadius: "5px",
                            border:
                              effectiveCardsPerRow === value
                                ? "1px solid var(--app-accent, #4F46E5)"
                                : "1px solid #E2DED4",
                            background:
                              effectiveCardsPerRow === value
                                ? "var(--app-accent-soft, #EEF2FF)"
                                : "#FAFAF8",
                            color:
                              effectiveCardsPerRow === value
                                ? "var(--app-accent-strong, #4338CA)"
                                : "#6B6560",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize:
                              "calc(11px * var(--app-ui-font-scale, 1.125))",
                          }}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {toolbarOverflowLevel >= 3 && (
                  <div
                    style={{
                      display: "grid",
                      gap: "6px",
                      fontSize: "calc(11px * var(--app-ui-font-scale, 1.125))",
                      color: "#6B6560",
                    }}
                  >
                    <span>
                      Height: {squareCards ? "square" : `${cardHeight}px`}
                    </span>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                        gap: "4px",
                      }}
                    >
                      {heightOptions.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setCardHeight(value)
                            setSquareCards(false)
                          }}
                          aria-pressed={!squareCards && cardHeight === value}
                          style={{
                            height: "28px",
                            padding: 0,
                            borderRadius: "5px",
                            border:
                              !squareCards && cardHeight === value
                                ? "1px solid var(--app-accent, #4F46E5)"
                                : "1px solid #E2DED4",
                            background:
                              !squareCards && cardHeight === value
                                ? "var(--app-accent-soft, #EEF2FF)"
                                : "#FAFAF8",
                            color:
                              !squareCards && cardHeight === value
                                ? "var(--app-accent-strong, #4338CA)"
                                : "#6B6560",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize:
                              "calc(10px * var(--app-ui-font-scale, 1.125))",
                          }}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {toolbarOverflowLevel >= 3 && (
                  <CardFontSizeControl
                    value={cardFontSize}
                    onChange={setCardFontSize}
                  />
                )}
                {toolbarOverflowLevel >= 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setColumnSettings({ count: 4, manuallySet: false })
                      setCardHeight(200)
                      setSquareCards(true)
                      setCardFontSize(100)
                    }}
                    style={{
                      height: "30px",
                      borderRadius: "6px",
                      border: "1px solid #E2DED4",
                      background: "#FAFAF8",
                      color: "#6B6560",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "calc(11px * var(--app-ui-font-scale, 1.125))",
                    }}
                  >
                    Default
                  </button>
                )}
                {toolbarOverflowLevel >= 4 && (
                  <StarsToggleButton
                    cards={cards}
                    showStars={showStars}
                    onClick={handleStarsToggle}
                    style={{
                      height: "30px",
                      borderRadius: "6px",
                      border: showStars
                        ? "1px solid var(--app-accent, #4F46E5)"
                        : "1px solid #E2DED4",
                      background: showStars
                        ? "var(--app-accent-soft, #EEF2FF)"
                        : "#FAFAF8",
                      color: showStars
                        ? "var(--app-accent-strong, #6B6560)"
                        : "#6B6560",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
                    }}
                  />
                )}
                {toolbarOverflowLevel >= 5 && (
                  <button
                    type="button"
                    onClick={onEditSource}
                    disabled={!onEditSource}
                    title={onEditSource ? "Open Markdown source beside Flashcard Genius" : "Select a card with an unambiguous Markdown source"}
                    style={{
                      height: "30px",
                      borderRadius: "6px",
                      border: "1px solid #E2DED4",
                      background: "#FAFAF8",
                      color: "#6B6560",
                      opacity: onEditSource ? 1 : 0.5,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
                    }}
                  >
                    Edit
                  </button>
                )}
                {toolbarOverflowLevel >= 5 && (
                  <div style={{ display: "grid", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setOverflowSortOpen((open) => !open)}
                      aria-expanded={overflowSortOpen}
                      style={{
                        height: "30px",
                        width: "100%",
                        borderRadius: "6px",
                        border: "1px solid #E2DED4",
                        background: overflowSortOpen
                          ? "var(--app-accent-soft, #EEF2FF)"
                          : "#FAFAF8",
                        color: "#6B6560",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize:
                          "calc(12px * var(--app-ui-font-scale, 1.125))",
                        textAlign: "left",
                        padding: "0 10px",
                      }}
                    >
                      Sort by
                    </button>
                    {overflowSortOpen && (
                      <div style={{ display: "grid", gap: "3px" }}>
                        {([
                          ["edit-order", "Default order"],
                          ["difficulty-asc", "★ 1 → 5"],
                          ["difficulty-desc", "★ 5 → 1"],
                          ["shuffled", "Shuffle"],
                          ["revealed-last", "Revealed last"],
                        ] as [typeof orderStatus, string][]).map(
                          ([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                handleOrderChange(value)
                                setOverflowSortOpen(false)
                              }}
                              aria-pressed={orderStatus === value}
                              style={{
                                padding: "6px 8px",
                                border: "none",
                                borderRadius: "5px",
                                background:
                                  orderStatus === value
                                    ? "var(--app-accent-soft, #EEF2FF)"
                                    : "transparent",
                                color: "#6B6560",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontSize:
                                  "calc(11px * var(--app-ui-font-scale, 1.125))",
                                textAlign: "left",
                              }}
                            >
                              {label}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}
                {toolbarOverflowLevel >= 2 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      height: "30px",
                      borderRadius: "6px",
                      border: "1px solid #E2DED4",
                      background: "#FAFAF8",
                      color: "#6B6560",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "calc(12px * var(--app-ui-font-scale, 1.125))",
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instruction banner */}
      {revealed === 0 && total > 0 && (
        <div
          style={{
            margin: "16px 20px 0",
            padding: "10px 14px",
            borderRadius: "8px",
            background: "var(--app-accent-soft, #EEF2FF)",
            border:
              "1px solid color-mix(in srgb, var(--app-accent, #4F46E5) 28%, #FFFFFF)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
              cx="7"
              cy="7"
              r="5.5"
              stroke="var(--app-accent, #4F46E5)"
              strokeWidth="1.3"
            />
            <line
              x1="7"
              y1="5"
              x2="7"
              y2="7.5"
              stroke="var(--app-accent, #4F46E5)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <circle cx="7" cy="9.5" r="0.6" fill="var(--app-accent, #4F46E5)" />
          </svg>
          <span
            style={{
              fontSize: "calc(12.5px * var(--app-ui-font-scale, 1.125))",
              color: "var(--app-accent-strong, #4338CA)",
            }}
          >
            Click a card to select it and reveal its answer. Space flips the selected card; arrow keys navigate.
          </span>
        </div>
      )}

      {/* All revealed celebration */}
      {revealed === total && total > 0 && (
        <div
          style={{
            margin: "16px 20px 0",
            padding: "10px 14px",
            borderRadius: "8px",
            background: "#F0FDF4",
            border: "1px solid #86EFAC",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="#16A34A" strokeWidth="1.3" />
            <path
              d="M4.5 7L6.5 9L9.5 5"
              stroke="#16A34A"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: "calc(12.5px * var(--app-ui-font-scale, 1.125))",
              color: "#15803D",
            }}
          >
            All {total} cards revealed! Great work — reset or shuffle to study
            again.
          </span>
        </div>
      )}

      {/* Card grid */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px 20px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${effectiveCardsPerRow}, minmax(0, 1fr))`,
            gap: "12px",
          }}
        >
          {(orderStatus === "edit-order"
            ? editOrderGroups
            : [{ id: "cards", title: null, cards: orderedCards }]
          ).flatMap((group) => [
            ...(group.title
              ? [
                  <div
                    key={`${group.id}:heading`}
                    className="study-topic-header"
                    style={{
                      gridColumn: "1 / -1",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #C8C4B8",
                      background: "#E8E4D9",
                      color: "#312E29",
                      fontSize: "calc(13px * var(--app-ui-font-scale, 1.125))",
                      fontWeight: 700,
                    }}
                  >
                    {group.title}
                  </div>,
                ]
              : []),
            ...group.cards.map((card) => (
              <StudyCard
                key={card.id}
                card={card}
                isFlipped={flippedIds.has(card.id)}
                markdownContext={markdownContext}
                sourcePath={cardSourcePaths?.[card.id] ?? ""}
                isSelected={selectedCardId === card.id}
                onClick={() => {
                  onSelectCard?.(card.id)
                  handleFlip(card.id)
                }}
                onDifficultyChange={(difficulty) =>
                  onDifficultyChange(card.id, difficulty)
                }
                cardHeight={scaledCardHeight}
                squareCards={squareCards}
                fontScale={cardFontSize / 100}
                immutable={immutable}
                allowDifficultyChanges={allowDifficultyChanges}
                showStars={showStars}
              />
            )),
          ])}
        </div>
      </div>
    </div>
  )
}
