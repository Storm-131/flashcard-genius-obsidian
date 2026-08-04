import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import DifficultyStars from "./DifficultyStars";
import MarkdownContent from "./MarkdownContent";
import { hasMarkdownImages } from "../images/markdownImages";
import type { Card, Deck, DeckTopic, SortOrder } from "../types";
import type { MarkdownRenderContext } from "../markdownRenderer";

interface Props {
  cards: Card[];
  deck: Deck | null;
  topics: DeckTopic[];
  cardOrder?: string[];
  selectedCardId: string | null;
  onSelectCard: (id: string) => void;
  onOpenCardSource?: (id: string) => void;
  markdownContext?: MarkdownRenderContext;
  cardSourcePaths?: Record<string, string>;
  onAddCard: () => void;
  sortOrder: SortOrder;
  onSortChange: (s: SortOrder) => void;
  onDifficultyChange: (id: string, difficulty: number) => void;
  onSaveCard: (updated: Card) => void;
  onDeleteCard: (id: string) => void;
  onMoveCard: (
    cardId: string,
    topicId: string | null,
    beforeCardId?: string,
  ) => void;
  onOpenEditor: () => void;
  readOnly: boolean;
  immutable?: boolean;
  allowDifficultyChanges?: boolean;
  responsiveBreakpoint?: number;
  showStars: boolean;
  onToggleShowStars: () => void;
  onImageDeckActionBlocked?: (action: "edit" | "stars") => void;
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line
        x1="7"
        y1="1.5"
        x2="7"
        y2="12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="1.5"
        y1="7"
        x2="12.5"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSort() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <line
        x1="1.5"
        y1="3"
        x2="11.5"
        y2="3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <line
        x1="1.5"
        y1="6.5"
        x2="8.5"
        y2="6.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <line
        x1="1.5"
        y1="10"
        x2="5.5"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <line x1="2" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CardItem({
  card,
  index,
  isSelected,
  onClick,
  onOpenCardSource,
  markdownContext,
  sourcePath,
  cardHeight,
  squareCards,
  onDifficultyChange,
  onSave,
  onDelete,
  onEdit,
  isDragging,
  dropPreview,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  readOnly,
  immutable,
  allowDifficultyChanges,
  showStars,
  showEditControls,
}: {
  card: Card;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  cardHeight: number;
  squareCards: boolean;
  onOpenCardSource?: (id: string) => void;
  markdownContext?: MarkdownRenderContext;
  sourcePath?: string;
  onDifficultyChange: (difficulty: number) => void;
  onSave: (updated: Card) => void;
  onDelete: () => void;
  onEdit: () => void;
  isDragging: boolean;
  dropPreview: "before" | "after" | null;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  readOnly: boolean;
  immutable: boolean;
  allowDifficultyChanges: boolean;
  showStars: boolean;
  showEditControls: boolean;
}) {
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);
  const draftRef = useRef({ question: card.question, answer: card.answer });
  const wasEditingRef = useRef(isSelected);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setQuestion(card.question);
    setAnswer(card.answer);
    draftRef.current = { question: card.question, answer: card.answer };
  }, [card.id, card.question, card.answer]);

  useEffect(() => {
    if (wasEditingRef.current && !isSelected) {
      const draft = draftRef.current;
      if (draft.question !== card.question || draft.answer !== card.answer)
        onSave({ ...card, ...draft });
    }
    wasEditingRef.current = isSelected;
  }, [isSelected, card, onSave]);

  const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    if (!isSelected) return;
    resizeTextarea(questionRef.current);
    resizeTextarea(answerRef.current);
  }, [isSelected, question, answer]);

  const inlineInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #C8C4B8",
    borderRadius: "6px",
    background: "#FAFAF8",
    color: "#111110",
    padding: "7px",
    fontFamily: "inherit",
    fontSize: "12px",
    lineHeight: "1.45",
    resize: "none",
    overflow: "hidden",
  };
  const cardHasImage = hasMarkdownImages(card.answer);

  return (
    <div
      id={`workspace-card-${card.id}`}
      className={`workspace-card${isSelected ? " is-selected" : ""}`}
  onClick={onClick}
      draggable={!isSelected && !immutable}
      onDragStart={isSelected || immutable ? undefined : onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        height: squareCards ? "auto" : `${cardHeight}px`,
        aspectRatio: squareCards ? "1 / 1" : undefined,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        borderRadius: "10px",
        border: isSelected ? "2px solid #4F46E5" : "1px solid #E2DED4",
        padding: isSelected ? "15px" : "16px",
        cursor: "pointer",
        transition: "all 0.15s",
        position: "relative",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(79,70,229,0.1), 0 2px 8px rgba(0,0,0,0.06)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        overflow: "hidden",
        boxSizing: "border-box",
        opacity: isDragging ? 0.45 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.09)";
          el.style.borderColor = "#C8C4B8";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
          el.style.borderColor = "#E2DED4";
        }
      }}
    >
      {/* Card number */}
      <span
        style={{
          position: "absolute",
          top: "10px",
          right: "12px",
          fontSize: "10px",
          fontWeight: 600,
          color: isSelected ? "#4F46E5" : "#C8C4B8",
          visibility: isSelected ? "hidden" : "visible",
          fontFamily: 'var(--font-monospace)',
        }}
      >
        #{index + 1}
      </span>
      {dropPreview && (
        <span
          style={{
            position: "absolute",
            left: "5px",
            right: "5px",
            [dropPreview === "before" ? "left" : "right"]: "1px",
            top: "5px",
            bottom: "5px",
            width: "3px",
            background: "var(--app-accent, #4F46E5)",
            borderRadius: "3px",
            pointerEvents: "none",
            zIndex: 4,
          }}
        />
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: cardHasImage && !isSelected ? "hidden" : "auto",
          paddingRight: cardHasImage && !isSelected ? 0 : "4px",
          paddingBottom: cardHasImage && !isSelected ? 0 : "28px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isSelected ? (
          <textarea
            ref={questionRef}
            value={question}
            rows={1}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              setQuestion(event.target.value);
              draftRef.current.question = event.target.value;
            }}
            style={{
              ...inlineInputStyle,
              fontWeight: 500,
              marginBottom: "10px",
            }}
            aria-label="Edit card front"
          />
        ) : (
          <MarkdownContent
            content={card.question}
            allowImages={false}
            markdownContext={markdownContext}
            sourcePath={sourcePath}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#111110",
              lineHeight: "1.45",
              marginBottom: "10px",
            }}
          />
        )}

        <div
          className="question-answer-divider"
          style={{
            height: "2px",
            minHeight: "2px",
            flex: "0 0 2px",
            width: "100%",
            background: "var(--app-divider, var(--app-accent, #4F46E5))",
            opacity: isSelected ? 0.82 : 0.72,
            marginBottom: cardHasImage && !isSelected ? 0 : "10px",
          }}
        />

        {isSelected ? (
          <>
            <textarea
              ref={answerRef}
              value={answer}
              rows={1}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                setAnswer(event.target.value);
                draftRef.current.answer = event.target.value;
              }}
              style={{ ...inlineInputStyle, marginBottom: "8px" }}
              aria-label="Edit card back"
            />
          </>
        ) : (
          cardHasImage ? (
            <div className="card-image-area">
              <MarkdownContent
                content={card.answer}
                className="card-image-content"
                markdownContext={markdownContext}
                sourcePath={sourcePath}
                style={{
                  fontSize: "12px",
                  color: "#6B6560",
                  lineHeight: "1.45",
                }}
              />
            </div>
          ) : (
            <MarkdownContent
              content={card.answer}
              markdownContext={markdownContext}
              sourcePath={sourcePath}
              style={{
                fontSize: "12px",
                color: "#6B6560",
                lineHeight: "1.45",
              }}
            />
          )
        )}
      </div>

      {showStars && !cardHasImage && (
        <DifficultyStars
          value={card.difficulty ?? 0}
          onChange={onDifficultyChange}
          className="difficulty-stars card-action-control"
          readOnly={immutable && !allowDifficultyChanges}
        />
      )}
      {!immutable && <button
        type="button"
        className="card-action-control"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        title="Move card to trash"
        aria-label="Move card to trash"
        style={{
          position: "absolute",
          left: isSelected ? "12px" : "42px",
          bottom: "11px",
          width: "25px",
          height: "25px",
          borderRadius: "5px",
          border: "1px solid #E2DED4",
          background: "#FFFFFF",
          color: "#9B9488",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
        onMouseEnter={(event) => {
          const element = event.currentTarget as HTMLElement;
          element.style.color = "#DC2626";
          element.style.borderColor = "#FCA5A5";
        }}
        onMouseLeave={(event) => {
          const element = event.currentTarget as HTMLElement;
          element.style.color = "#9B9488";
          element.style.borderColor = "#E2DED4";
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 3.5h8M4.5 3.5V2h3v1.5M3 3.5l.5 6.5h5l.5-6.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>}
      {!readOnly && cardHasImage && (
        <button
          type="button"
          role="switch"
          aria-checked={card.imageAsQuestion ?? false}
          className="card-action-control"
          onClick={(event) => {
            event.stopPropagation();
            onSave({
              ...card,
              imageAsQuestion: !(card.imageAsQuestion ?? false),
            });
          }}
          title="Swap question and answer"
          aria-label="Swap question and answer"
          style={{
            position: "absolute",
            left: isSelected ? "44px" : "74px",
            bottom: "11px",
            width: "25px",
            height: "25px",
            padding: 0,
            borderRadius: "5px",
            border: `1px solid ${(card.imageAsQuestion ?? false) ? "#4F46E5" : "#E2DED4"}`,
            background: (card.imageAsQuestion ?? false) ? "#EEF2FF" : "#FFFFFF",
            color: (card.imageAsQuestion ?? false) ? "#4338CA" : "#6B6560",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12.8 5.5A5.4 5.4 0 0 0 3.6 3.8L2.4 5"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2.4 2.5V5h2.5"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.2 10.5A5.4 5.4 0 0 0 12.4 12.2l1.2-1.2"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.6 13.5V11h-2.5"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {!readOnly && !isSelected && (
        <button
          type="button"
          className="card-action-control"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          title="Edit card"
          aria-label="Edit card"
          style={{
            position: "absolute",
            left: "12px",
            bottom: "11px",
            width: "25px",
            height: "25px",
            borderRadius: "5px",
            border: "1px solid #E2DED4",
            background: "#FFFFFF",
            color: "#6B6560",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M8.2 1.5l2.3 2.3-6.4 6.4H1.5V7.6l6.7-6.1Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {readOnly && onOpenCardSource && showEditControls && (
        <button
          type="button"
          className="card-action-control source-card-control"
          onClick={(event) => {
            event.stopPropagation();
            onOpenCardSource(card.id);
          }}
          title="Open Markdown source"
          aria-label="Open Markdown source"
          style={{
            position: "absolute",
            left: "12px",
            bottom: "11px",
            width: "25px",
            height: "25px",
            borderRadius: "5px",
            border: "1px solid #E2DED4",
            background: "#FFFFFF",
            color: "#6B6560",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M8.2 1.5l2.3 2.3-6.4 6.4H1.5V7.6l6.7-6.1Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function Workspace({
  cards,
  deck,
  topics,
  cardOrder,
  selectedCardId,
  onSelectCard,
  onOpenCardSource,
  markdownContext,
  cardSourcePaths,
  onAddCard,
  sortOrder,
  onSortChange,
  onDifficultyChange,
  onSaveCard,
  onDeleteCard,
  onMoveCard,
  onOpenEditor,
  readOnly,
  immutable = false,
  allowDifficultyChanges = false,
  responsiveBreakpoint = 1024,
  showStars,
  onToggleShowStars,
  onImageDeckActionBlocked,
}: Props) {
  const [cardsPerRow, setCardsPerRow] = useState(4);
  const [cardsPerRowManuallySet, setCardsPerRowManuallySet] = useState(false);
  const [cardHeight, setCardHeight] = useState(200);
  const [squareCards, setSquareCards] = useState(true);
  const [layoutControlsOpen, setLayoutControlsOpen] = useState(false);
  const [sortControlsOpen, setSortControlsOpen] = useState(false);
  const [overflowSortOpen, setOverflowSortOpen] = useState(false);
  const layoutControlsRef = useRef<HTMLDivElement>(null);
  const sortControlsRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolbarTitleRef = useRef<HTMLHeadingElement>(null);
  const toolbarMeasureRef = useRef<HTMLDivElement>(null);
  const toolbarCountRef = useRef<HTMLParagraphElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const [visibleToolbarActionCount, setVisibleToolbarActionCount] = useState(4);
  const [showToolbarCardCount, setShowToolbarCardCount] = useState(true);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [showEditControls, setShowEditControls] = useState(false);
  const [appliedOrderIds, setAppliedOrderIds] = useState<string[] | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    cardId: string;
    position: "before" | "after";
  } | null>(null);
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(
    null,
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const workspaceRef = useRef<HTMLElement>(null);
  const heightOptions = [160, 200, 240, 280, 320, 360];
  const hasImageCards = useMemo(() => cards.some(card => hasMarkdownImages(card.answer)), [cards]);
  const handleEditToolbarClick = () => {
    if (hasImageCards) {
      onImageDeckActionBlocked?.("edit");
      return;
    }
    setShowEditControls(visible => !visible);
  };
  const handleStarsToolbarClick = () => {
    if (hasImageCards) {
      onImageDeckActionBlocked?.("stars");
      return;
    }
    onToggleShowStars();
  };

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;

    const updateViewportWidth = () => setViewportWidth(element.clientWidth || window.innerWidth);
    updateViewportWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewportWidth);
      return () => window.removeEventListener("resize", updateViewportWidth);
    }

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) setViewportWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const compareCards = (a: Card, b: Card, order = sortOrder) => {
    if (order === "alphabetical") return a.question.localeCompare(b.question);
    if (order === "difficulty-asc")
      return (a.difficulty ?? 0) - (b.difficulty ?? 0);
    if (order === "difficulty-desc")
      return (b.difficulty ?? 0) - (a.difficulty ?? 0);
    return 0;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!layoutControlsRef.current?.contains(target)) setLayoutControlsOpen(false);
      if (!sortControlsRef.current?.contains(target)) setSortControlsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!appliedOrderIds) return cards;
    const cardsById = new Map(cards.map((card) => [card.id, card]));
    const ordered = appliedOrderIds
      .map((id) => cardsById.get(id))
      .filter((card): card is Card => Boolean(card));
    const knownIds = new Set(ordered.map((card) => card.id));
    return [...ordered, ...cards.filter((card) => !knownIds.has(card.id))];
  }, [appliedOrderIds, cards]);

  const handleSortChange = (order: SortOrder) => {
    onSortChange(order);
    setAppliedOrderIds(
      [...cards]
        .sort((a, b) => compareCards(a, b, order))
        .map((card) => card.id),
    );
  };

  const scaledCardHeight = cardHeight;
  const responsiveMaxCards = viewportWidth <= 480
    ? 1
    : viewportWidth <= 640
      ? 2
      : viewportWidth <= responsiveBreakpoint
      ? 3
      : 4;
  const effectiveCardsPerRow = viewportWidth <= 480
    ? 1
    : cardsPerRowManuallySet
      ? cardsPerRow
      : Math.min(cardsPerRow, responsiveMaxCards);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const measureToolbar = () => {
      const title = toolbarTitleRef.current;
      const measurements = toolbarMeasureRef.current;
      if (!title || !measurements) return;

      const measuredItems = Array.from(measurements.children) as HTMLElement[];
      if (measuredItems.length !== 6) return;
      const actionWidths = measuredItems.slice(0, 4).map((item) => item.getBoundingClientRect().width);
      const overflowWidth = measuredItems[4].getBoundingClientRect().width;
      const addCardWidth = readOnly ? 0 : measuredItems[5].getBoundingClientRect().width;
      if (actionWidths.some((width) => width <= 0) || overflowWidth <= 0 || (!readOnly && addCardWidth <= 0)) return;

      const toolbarStyle = getComputedStyle(toolbar);
      const horizontalPadding = (Number.parseFloat(toolbarStyle.paddingLeft) || 0)
        + (Number.parseFloat(toolbarStyle.paddingRight) || 0);
      const toolbarGap = Number.parseFloat(toolbarStyle.gap) || 0;
      const actionGap = 6;
      const availableWidth = toolbar.clientWidth - horizontalPadding;
      const titleMinimumWidth = Math.min(
        150,
        Math.max(72, Math.ceil(title.scrollWidth * 0.35)),
      );
      const countWidth = toolbarCountRef.current?.getBoundingClientRect().width || 0;

      let nextVisibleCount = 0;
      let nextShowCardCount = false;
      for (let count = 4; count >= 0; count -= 1) {
        const visibleActionsWidth = actionWidths
          .slice(0, count)
          .reduce((total, width) => total + width, 0)
          + Math.max(0, count - 1) * actionGap;
        let controlsWidth = visibleActionsWidth;
        if (count < 4) {
          controlsWidth += (controlsWidth > 0 ? toolbarGap : 0) + overflowWidth;
        }
        if (!readOnly) {
          controlsWidth += (controlsWidth > 0 ? toolbarGap : 0) + addCardWidth;
        }
        const requiredWidth = titleMinimumWidth
          + (controlsWidth > 0 ? toolbarGap : 0) + controlsWidth;
        const requiredWithCount = requiredWidth + (count === 4 && countWidth > 0 ? countWidth + 10 : 0);
        if (requiredWithCount <= availableWidth) {
          nextVisibleCount = count;
          nextShowCardCount = count === 4;
          break;
        }
        if (count === 4 && requiredWidth <= availableWidth) {
          nextVisibleCount = count;
          break;
        }
      }
      setVisibleToolbarActionCount((current) => current === nextVisibleCount ? current : nextVisibleCount);
      setShowToolbarCardCount((current) => current === nextShowCardCount ? current : nextShowCardCount);
    };

    const frame = window.requestAnimationFrame(measureToolbar);
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureToolbar);
      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener("resize", measureToolbar);
      };
    }
    const observer = new ResizeObserver(measureToolbar);
    observer.observe(toolbar);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [deck?.name, filtered.length, readOnly]);

  useEffect(() => {
    if (!overflowMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!overflowMenuRef.current?.contains(event.target as Node)) setOverflowMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [overflowMenuOpen]);

  useEffect(() => {
    if (!overflowMenuOpen) setOverflowSortOpen(false);
  }, [overflowMenuOpen]);

  const toolbarHasOverflow = visibleToolbarActionCount < 4;

  const cardsInDisplayOrder = useMemo(() => {
    if (!cardOrder || appliedOrderIds) return filtered;
    const positions = new Map(cardOrder.map((id, index) => [id, index]));
    return [...filtered].sort(
      (a, b) =>
        (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [appliedOrderIds, cardOrder, filtered]);

  const cardGroups = useMemo(() => {
    if (!deck) {
      const unassignedCards = cardsInDisplayOrder.filter(
        (card) => !card.topicId,
      );
      return [
        {
          id: "all",
          name: null,
          topicId: null,
          cards: cardsInDisplayOrder.filter((card) => card.topicId),
        },
        {
          id: "unassigned",
          name: "No subtopic",
          topicId: null,
          cards: unassignedCards,
        },
      ].filter((group) => group.cards.length > 0);
    }
    const deckTopics = topics.filter((topic) => topic.deckId === deck.id);
    const knownTopicIds = new Set(deckTopics.map((topic) => topic.id));
    const groups = deckTopics
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        topicId: topic.id,
        cards: cardsInDisplayOrder.filter((card) => card.topicId === topic.id),
      }))
      .filter((group) => group.cards.length > 0);
    const unassignedCards = cardsInDisplayOrder.filter(
      (card) => !card.topicId || !knownTopicIds.has(card.topicId),
    );
    return [
      ...groups,
      {
        id: "unassigned",
        name: "No subtopic",
        topicId: null,
        cards: unassignedCards,
      },
    ].filter((group) => group.cards.length > 0);
  }, [cardsInDisplayOrder, deck, topics]);

  useEffect(() => {
    if (!selectedCardId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`workspace-card-${selectedCardId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedCardId, cardsInDisplayOrder]);

  const resetCardDrag = () => {
    setDraggedCardId(null);
    setDropPreview(null);
    setHighlightedTopicId(null);
  };

  return (
    <main
      className="workspace-main"
      ref={workspaceRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#F7F6F2",
      }}
    >
      {/* Toolbar */}
      <div
        className="panel-toolbar"
        ref={toolbarRef}
        style={{
          padding: "16px 20px 12px",
          display: "flex",
          alignItems: "center",
          flexDirection: "row",
          gap: "10px",
          borderBottom: "1px solid #E2DED4",
          background: "#FFFFFF",
          flexShrink: 0,
        }}
      >
        <div
          ref={toolbarMeasureRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            height: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span style={{ color: "#9B9488" }}><IconSort /></span>
            <button type="button" className="layout-button" style={{ height: "30px", padding: "0 10px", borderRadius: "6px", border: "1px solid #E2DED4", background: "#FAFAF8", color: "#6B6560", fontFamily: "inherit", fontSize: "12px" }}>Sort By</button>
          </div>
          <button type="button" style={{ height: "30px", padding: "0 10px", borderRadius: "6px", border: "1px solid #E2DED4", background: "#FAFAF8", color: "#6B6560", fontFamily: "inherit", fontSize: "12px", flexShrink: 0 }}>Edit</button>
          <button type="button" style={{ height: "30px", padding: "0 10px", borderRadius: "6px", border: "1px solid #E2DED4", background: "#FAFAF8", color: "#6B6560", fontFamily: "inherit", fontSize: "12px", flexShrink: 0 }}>Stars</button>
          <button type="button" className="layout-button" style={{ height: "30px", padding: "0 10px", borderRadius: "6px", border: "1px solid #E2DED4", background: "#FAFAF8", color: "#6B6560", fontFamily: "inherit", fontSize: "12px", flexShrink: 0 }}>Card size</button>
          <button type="button" style={{ height: "30px", padding: "0 8px", borderRadius: "6px", border: "1px solid #E2DED4", background: "#FAFAF8", color: "#6B6560", fontFamily: "inherit", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}><IconMenu /></button>
          <button type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 14px", height: "32px", borderRadius: "7px", border: "none", background: "#4F46E5", color: "#FFFFFF", fontSize: "12.5px", fontWeight: 600, fontFamily: "inherit", flexShrink: 0 }}><IconPlus />Add Card</button>
        </div>
        <p
          ref={toolbarCountRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            margin: 0,
            fontSize: "11.5px",
            whiteSpace: "nowrap",
          }}
        >
          {filtered.length} {filtered.length === 1 ? "card" : "cards"}
        </p>
        <div style={{ flex: 1, width: "100%", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", minWidth: 0 }}>
            <h1
              ref={toolbarTitleRef}
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                fontSize: "17px",
                fontWeight: 700,
                color: "#111110",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.25,
                paddingBlock: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {deck ? deck.name : "All Decks"}
            </h1>
            {showToolbarCardCount && (
              <p style={{ flex: "0 0 auto", fontSize: "11.5px", color: "#9B9488", margin: 0, whiteSpace: "nowrap" }}>
                {filtered.length} {filtered.length === 1 ? "card" : "cards"}
              </p>
            )}
          </div>
        </div>

        {/* Sort */}
        {visibleToolbarActionCount > 0 && <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexShrink: 0 }}>
          {visibleToolbarActionCount > 0 && <>
            <span style={{ color: "#9B9488" }}>
              <IconSort />
            </span>
            <div ref={sortControlsRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setSortControlsOpen((open) => !open)}
              className="layout-button"
              aria-expanded={sortControlsOpen}
              style={{ height: "30px", padding: "0 10px", borderRadius: "6px", border: "1px solid #E2DED4", background: "#FAFAF8", color: "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}
            >
              Sort By
            </button>
            {sortControlsOpen && (
              <div style={{ position: "absolute", top: "36px", right: 0, zIndex: 20, display: "grid", gap: "3px", width: "170px", padding: "8px", borderRadius: "8px", border: "1px solid #E2DED4", background: "#FFFFFF", boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}>
                {([
                  ["default", "Default"],
                  ["alphabetical", "A–Z"],
                  ["difficulty-asc", "★ 1 → 5"],
                  ["difficulty-desc", "★ 5 → 1"],
                ] as [SortOrder, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { handleSortChange(value); setSortControlsOpen(false) }}
                    aria-pressed={sortOrder === value}
                    style={{ padding: "6px 8px", border: "none", borderRadius: "5px", background: sortOrder === value ? "#F0EDE6" : "transparent", color: "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", textAlign: "left" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            </div>
          </>}

        {visibleToolbarActionCount > 1 && <button
          type="button"
          onClick={handleEditToolbarClick}
          aria-pressed={showEditControls}
          title={showEditControls ? "Hide source buttons" : "Show source buttons"}
          style={{
            height: "30px",
            padding: "0 10px",
            borderRadius: "6px",
            border: showEditControls ? "1px solid var(--app-accent, #4F46E5)" : "1px solid #E2DED4",
            background: showEditControls ? "var(--app-accent-soft, #FAFAF8)" : "#FAFAF8",
            color: showEditControls ? "var(--app-accent-strong, #6B6560)" : "#6B6560",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "12px",
          }}
        >
          Edit
        </button>}

        {visibleToolbarActionCount > 2 && <button
          type="button"
          onClick={handleStarsToolbarClick}
          aria-pressed={showStars}
          title={showStars ? "Hide card stars" : "Show card stars"}
          style={{ height: "30px", padding: "0 10px", borderRadius: "6px", border: "1px solid #E2DED4", background: showStars ? "var(--app-accent-soft, #FAFAF8)" : "#FAFAF8", color: showStars ? "var(--app-accent-strong, #6B6560)" : "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}
        >
          Stars
        </button>}

        {visibleToolbarActionCount > 3 && <div ref={layoutControlsRef} style={{ position: "relative" }}>
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
              fontSize: "12px",
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
              <div style={{ display: "grid", gap: "8px", fontSize: "11px", color: "#6B6560", width: "100%" }}>
                <span>Cards per row: {effectiveCardsPerRow}</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "4px", width: "100%" }}>
                  {[1, 2, 3, 4, 5, 6].map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setCardsPerRow(value); setCardsPerRowManuallySet(true) }}
                      aria-pressed={effectiveCardsPerRow === value}
                      style={{ width: "100%", height: "28px", padding: 0, borderRadius: "5px", border: effectiveCardsPerRow === value ? "1px solid var(--app-accent, #4F46E5)" : "1px solid #E2DED4", background: effectiveCardsPerRow === value ? "var(--app-accent-soft, #EEF2FF)" : "#FAFAF8", color: effectiveCardsPerRow === value ? "var(--app-accent-strong, #4338CA)" : "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "11px" }}
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
                  fontSize: "11px",
                  color: "#6B6560",
                }}
              >
                Height:
                <input
                  type="range"
                  min="160"
                  max="400"
                  step="10"
                  value={cardHeight}
                  onChange={(event) => {
                    setCardHeight(Number(event.target.value));
                    setSquareCards(false);
                  }}
                  style={{ width: "100%", accentColor: "var(--app-accent, #4F46E5)" }}
                />
              </label>
              <button
                type="button"
                  onClick={() => {
                    setCardsPerRow(4);
                    setCardsPerRowManuallySet(false);
                    setCardHeight(200);
                  setSquareCards(true);
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
                  fontSize: "11px",
                }}
              >
                Default (square cards)
              </button>
            </div>
          )}
        </div>}
        </div>}

        {toolbarHasOverflow && (
          <div ref={overflowMenuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setOverflowMenuOpen(open => !open)}
              aria-label="Open library controls"
              aria-expanded={overflowMenuOpen}
              className="layout-button"
              style={{ height: "30px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", borderRadius: "6px", border: "1px solid #E2DED4", background: overflowMenuOpen ? "var(--app-accent-soft, #EEF2FF)" : "#FAFAF8", color: "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}
            >
              <IconMenu />
            </button>
            {overflowMenuOpen && (
              <div style={{ position: "absolute", top: "36px", right: 0, zIndex: 30, width: "230px", padding: "10px", borderRadius: "8px", border: "1px solid #E2DED4", background: "#FFFFFF", boxShadow: "0 4px 14px rgba(0,0,0,0.12)", display: "grid", gap: "8px" }}>
                {visibleToolbarActionCount < 4 && <div style={{ display: "grid", gap: "6px", fontSize: "11px", color: "#6B6560" }}>
                  <span>Cards per row: {effectiveCardsPerRow}</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "4px" }}>
                    {[1, 2, 3, 4, 5, 6].map(value => <button key={value} type="button" onClick={() => { setCardsPerRow(value); setCardsPerRowManuallySet(true) }} aria-pressed={effectiveCardsPerRow === value} style={{ height: "28px", padding: 0, borderRadius: "5px", border: effectiveCardsPerRow === value ? "1px solid var(--app-accent, #4F46E5)" : "1px solid #E2DED4", background: effectiveCardsPerRow === value ? "var(--app-accent-soft, #EEF2FF)" : "#FAFAF8", color: effectiveCardsPerRow === value ? "var(--app-accent-strong, #4338CA)" : "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "11px" }}>{value}</button>)}
                  </div>
                </div>}
                {visibleToolbarActionCount < 4 && <div style={{ display: "grid", gap: "6px", fontSize: "11px", color: "#6B6560" }}>
                  <span>Height: {squareCards ? "square" : `${cardHeight}px`}</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "4px" }}>
                    {heightOptions.map(value => <button key={value} type="button" onClick={() => { setCardHeight(value); setSquareCards(false) }} aria-pressed={!squareCards && cardHeight === value} style={{ height: "28px", padding: 0, borderRadius: "5px", border: !squareCards && cardHeight === value ? "1px solid var(--app-accent, #4F46E5)" : "1px solid #E2DED4", background: !squareCards && cardHeight === value ? "var(--app-accent-soft, #EEF2FF)" : "#FAFAF8", color: !squareCards && cardHeight === value ? "var(--app-accent-strong, #4338CA)" : "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "10px" }}>{value}</button>)}
                  </div>
                </div>}
                {visibleToolbarActionCount < 4 && <button type="button" onClick={() => { setCardsPerRow(4); setCardsPerRowManuallySet(false); setCardHeight(200); setSquareCards(true) }} style={{ height: "30px", borderRadius: "6px", border: "1px solid #E2DED4", background: "#FAFAF8", color: "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "11px" }}>Default</button>}
                {visibleToolbarActionCount < 2 && <button type="button" onClick={handleEditToolbarClick} aria-pressed={showEditControls} style={{ height: "30px", borderRadius: "6px", border: "1px solid #E2DED4", background: showEditControls ? "var(--app-accent-soft, #FAFAF8)" : "#FAFAF8", color: showEditControls ? "var(--app-accent-strong, #6B6560)" : "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>Edit</button>}
                {visibleToolbarActionCount < 3 && <button type="button" onClick={handleStarsToolbarClick} aria-pressed={showStars} style={{ height: "30px", borderRadius: "6px", border: "1px solid #E2DED4", background: showStars ? "var(--app-accent-soft, #FAFAF8)" : "#FAFAF8", color: showStars ? "var(--app-accent-strong, #6B6560)" : "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>Stars</button>}
                {visibleToolbarActionCount < 1 && <div style={{ display: "grid", gap: "8px" }}>
                  <button type="button" onClick={() => setOverflowSortOpen(open => !open)} aria-expanded={overflowSortOpen} style={{ height: "30px", width: "100%", borderRadius: "6px", border: "1px solid #E2DED4", background: overflowSortOpen ? "var(--app-accent-soft, #EEF2FF)" : "#FAFAF8", color: "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", textAlign: "left", padding: "0 10px" }}>Sort by</button>
                  {overflowSortOpen && <div style={{ display: "grid", gap: "3px" }}>
                    {([
                      ["default", "Default"],
                      ["alphabetical", "A–Z"],
                      ["difficulty-asc", "★ 1 → 5"],
                      ["difficulty-desc", "★ 5 → 1"],
                    ] as [SortOrder, string][]).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => { handleSortChange(value); setOverflowSortOpen(false) }} aria-pressed={sortOrder === value} style={{ padding: "6px 8px", border: "none", borderRadius: "5px", background: sortOrder === value ? "var(--app-accent-soft, #EEF2FF)" : "transparent", color: "#6B6560", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", textAlign: "left" }}>{label}</button>
                    ))}
                  </div>}
                </div>}
              </div>
            )}
          </div>
        )}

        {/* Add card */}
        {!readOnly && <button
          className="app-accent-button"
          onClick={onAddCard}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 14px",
            height: "32px",
            borderRadius: "7px",
            border: "none",
            background: "#4F46E5",
            color: "#FFFFFF",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#4338CA")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#4F46E5")
          }
        >
          <IconPlus />
          Add Card
        </button>}
      </div>

      {/* Card grid */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#F0EDE6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect
                  x="2"
                  y="4"
                  width="18"
                  height="14"
                  rx="2"
                  stroke="#C8C4B8"
                  strokeWidth="1.5"
                />
                <line
                  x1="7"
                  y1="9"
                  x2="15"
                  y2="9"
                  stroke="#C8C4B8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="7"
                  y1="13"
                  x2="11"
                  y2="13"
                  stroke="#C8C4B8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p style={{ fontSize: "13px", color: "#9B9488", margin: 0 }}>
              No cards here yet
            </p>
            {!readOnly && <button
              onClick={onAddCard}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid #E2DED4",
                background: "transparent",
                color: "#6B6560",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Add your first card
            </button>}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${effectiveCardsPerRow}, minmax(0, 1fr))`,
              gap: "12px",
            }}
          >
            {cardGroups.map((group) => (
              <Fragment key={group.id}>
                {group.name && (
                  <div
                    className="workspace-topic-header"
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggedCardId) setHighlightedTopicId(group.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedCardId)
                        onMoveCard(draggedCardId, group.topicId);
                      resetCardDrag();
                    }}
                    style={{
                      gridColumn: "1 / -1",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border:
                        highlightedTopicId === group.id
                          ? "2px solid var(--app-accent, #4F46E5)"
                          : "1px solid #C8C4B8",
                      background:
                        highlightedTopicId === group.id
                          ? "var(--app-accent-soft, #EEF2FF)"
                          : "#E8E4D9",
                      color: "#312E29",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.01em",
                      textAlign: "left",
                      transition: "all 0.12s",
                    }}
                  >
                    {group.name}
                  </div>
                )}
                {group.cards.map((card, index) => {
                  const topicId = group.topicId;
                  const nextCardId = group.cards[index + 1]?.id;
                  const previewPosition =
                    dropPreview?.cardId === card.id
                      ? dropPreview.position
                      : null;
                  return (
                    <CardItem
                      key={card.id}
                      card={card}
                      index={cardsInDisplayOrder.indexOf(card)}
                      isSelected={!readOnly && selectedCardId === card.id}
                      onClick={() => onSelectCard(card.id)}
                      onOpenCardSource={onOpenCardSource}
                      markdownContext={markdownContext}
                      sourcePath={cardSourcePaths?.[card.id] ?? ""}
                      cardHeight={scaledCardHeight}
                      squareCards={squareCards}
                      onDifficultyChange={(difficulty) =>
                        onDifficultyChange(card.id, difficulty)
                      }
                      onSave={onSaveCard}
                      onDelete={() => onDeleteCard(card.id)}
                      onEdit={() => {
                        onSelectCard(card.id);
                        onOpenEditor();
                      }}
                      isDragging={draggedCardId === card.id}
                      dropPreview={previewPosition}
                      onDragStart={(event) => {
                        setDraggedCardId(card.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={resetCardDrag}
                      readOnly={readOnly}
                      immutable={immutable}
                      allowDifficultyChanges={allowDifficultyChanges}
                      showStars={showStars}
                      showEditControls={showEditControls}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (!draggedCardId || draggedCardId === card.id) return;
                        const bounds =
                          event.currentTarget.getBoundingClientRect();
                        setHighlightedTopicId(null);
                        setDropPreview({
                          cardId: card.id,
                          position:
                            event.clientX - bounds.left < bounds.width / 2
                              ? "before"
                              : "after",
                        });
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedCardId && draggedCardId !== card.id) {
                          const bounds =
                            event.currentTarget.getBoundingClientRect();
                          const position =
                            event.clientX - bounds.left < bounds.width / 2
                              ? "before"
                              : "after";
                          onMoveCard(
                            draggedCardId,
                            topicId,
                            position === "before" ? card.id : nextCardId,
                          );
                        }
                        resetCardDrag();
                      }}
                    />
                  );
                })}
              </Fragment>
            ))}

            {!readOnly && <div
              onClick={onAddCard}
              style={{
                borderRadius: "10px",
                border: "1.5px dashed #D8D4C8",
                padding: "16px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minHeight: squareCards ? 0 : `${scaledCardHeight}px`,
                aspectRatio: squareCards ? "1 / 1" : undefined,
                transition: "all 0.15s",
                color: "#9B9488",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#FFFFFF";
                el.style.borderColor = "#9B9488";
                el.style.color = "#6B6560";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "transparent";
                el.style.borderColor = "#D8D4C8";
                el.style.color = "#9B9488";
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "1.5px dashed currentColor",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconPlus />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>
                Add card
              </span>
            </div>}
          </div>
        )}
      </div>
    </main>
  );
}
