import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppMode, Card, ColorScheme, MaterializedDecks, SortOrder } from '@flashcard-genius/core'
import Sidebar from './components/Sidebar'
import StatsMode from './components/StatsMode'
import StudyMode from './components/StudyMode'
import TopBar from './components/TopBar'
import Workspace from './components/Workspace'
import type { MarkdownRenderContext } from './markdownRenderer'
import { resolveMarkdownSource } from './sourceSelection'

interface Props extends MaterializedDecks {
  initialDeckId?: string | null
  onPersistDifficulty?: (card: Card, difficulty: number) => Promise<void>
  onOpenMarkdownSource?: (filePath: string) => void
  cardSourceKeys?: Record<string, string>
  cardSourcePaths?: Record<string, string>
  markdownContext?: MarkdownRenderContext
  onClearDecksFromView?: () => void
  onImageDeckActionBlocked?: (action: 'edit' | 'stars') => void
  sidebarCollapseBreakpoint?: number
}

const noop = () => undefined

export default function ReadonlyFlashcardApp({
  categories,
  decks,
  topics,
  cards,
  cardOrderByDeck,
  initialDeckId,
  onPersistDifficulty,
  onOpenMarkdownSource,
  cardSourceKeys,
  cardSourcePaths,
  markdownContext,
  onClearDecksFromView,
  onImageDeckActionBlocked,
  sidebarCollapseBreakpoint = 1024,
}: Props) {
  const [cardList, setCardList] = useState(cards)
  const [mode, setMode] = useState<AppMode>('edit')
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(initialDeckId ?? decks[0]?.id ?? null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const selectedDeckSourceKeyRef = useRef(decks.find(deck => deck.id === (initialDeckId ?? decks[0]?.id))?.sourceFileName ?? null)
  const selectedCardSourceKeyRef = useRef<string | null>(null)
  const [selectedStudyTopicId, setSelectedStudyTopicId] = useState<string | null | undefined>(undefined)
  const [studyCardIds, setStudyCardIds] = useState<string[] | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
  const [darkMode, setDarkMode] = useState(false)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('emerald')
  const [showStars, setShowStars] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const wasNarrowRef = useRef(false)
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1440 : window.innerWidth)

  useEffect(() => {
    const element = rootRef.current
    if (!element) return

    const updateWidth = () => setViewportWidth(element.clientWidth || window.innerWidth)
    updateWidth()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) setViewportWidth(width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const isNarrow = viewportWidth <= sidebarCollapseBreakpoint
    if (isNarrow && !wasNarrowRef.current) setSidebarOpen(false)
    wasNarrowRef.current = isNarrow
  }, [sidebarCollapseBreakpoint, viewportWidth])

  useEffect(() => {
    setCardList(cards)

    const selectedSourceKey = selectedCardSourceKeyRef.current
    const selectedDeckSourceKey = selectedDeckSourceKeyRef.current
    const sourceDeck = decks.find(deck => deck.sourceFileName === selectedDeckSourceKey)
    const fallbackDeckId = sourceDeck?.id ?? selectedDeckId
    const nextCard = selectedSourceKey
      ? cards.find(card => cardSourceKeys?.[card.id] === selectedSourceKey)
      : undefined
    const currentCardStillExists = selectedCardId ? cards.some(card => card.id === selectedCardId) : false
    const fallbackCard = cards.find(card => card.deckId === fallbackDeckId) ?? cards[0]
    const nextSelectedCard = nextCard ?? (currentCardStillExists ? cards.find(card => card.id === selectedCardId) : selectedCardId ? fallbackCard : undefined)
    const nextDeck = nextSelectedCard
      ? decks.find(deck => deck.id === nextSelectedCard.deckId)
      : sourceDeck
    if (nextDeck) {
      setSelectedDeckId(nextDeck.id)
      selectedDeckSourceKeyRef.current = nextDeck.sourceFileName ?? null
    } else if (!selectedDeckId || !decks.some(deck => deck.id === selectedDeckId)) {
      setSelectedDeckId(decks[0]?.id ?? null)
    }
    setSelectedCardId(nextSelectedCard?.id ?? null)
    if (nextSelectedCard) selectedCardSourceKeyRef.current = cardSourceKeys?.[nextSelectedCard.id] ?? selectedSourceKey
  }, [cardSourceKeys, cards, decks])

  const visibleCards = useMemo(() => {
    let filtered = selectedDeckId ? cardList.filter(card => card.deckId === selectedDeckId) : cardList
    if (mode === 'study' && selectedStudyTopicId !== undefined) {
      filtered = filtered.filter(card => selectedStudyTopicId ? card.topicId === selectedStudyTopicId : !card.topicId)
    }
    if (searchQuery) {
      const query = searchQuery.toLocaleLowerCase()
      filtered = filtered.filter(card =>
        card.question.toLocaleLowerCase().includes(query) || card.answer.toLocaleLowerCase().includes(query))
    }
    return filtered
  }, [cardList, mode, searchQuery, selectedDeckId, selectedStudyTopicId])

  const studyCards = useMemo(() => {
    if (!studyCardIds) return visibleCards
    const cardsById = new Map(cardList.map(card => [card.id, card]))
    return studyCardIds.map(id => cardsById.get(id)).filter((card): card is Card => Boolean(card))
  }, [cardList, studyCardIds, visibleCards])

  const selectedDeck = decks.find(deck => deck.id === selectedDeckId) ?? null
  const editSourcePath = resolveMarkdownSource(cardList, selectedCardId, selectedDeck, cardSourcePaths)
  const cardCounts = useMemo(
    () => Object.fromEntries(decks.map(deck => [deck.id, cardList.filter(card => card.deckId === deck.id).length])),
    [cardList, decks],
  )

  const handleSelectDeck = (deckId: string | null) => {
    setSelectedDeckId(deckId)
    selectedDeckSourceKeyRef.current = decks.find(deck => deck.id === deckId)?.sourceFileName ?? null
    selectedCardSourceKeyRef.current = null
    setSelectedCardId(null)
    setSelectedStudyTopicId(undefined)
    setStudyCardIds(null)
  }

  const handleSelectCard = (cardId: string) => {
    const card = cardList.find(item => item.id === cardId)
    if (!card) return
    selectedCardSourceKeyRef.current = cardSourceKeys?.[card.id] ?? null
    setSelectedCardId(cardId)
  }

  const handleFinderSelectCard = (cardId: string) => {
    const card = cardList.find(item => item.id === cardId)
    if (!card) return
    const activeCards = mode === 'study' ? studyCards : visibleCards
    if (!activeCards.some(item => item.id === cardId)) {
      setSelectedDeckId(card.deckId)
      selectedDeckSourceKeyRef.current = decks.find(deck => deck.id === card.deckId)?.sourceFileName ?? null
      setSelectedStudyTopicId(undefined)
      setStudyCardIds(null)
      setSearchQuery('')
    }
    handleSelectCard(cardId)
    if (mode === 'stats') setMode('edit')
  }

  useEffect(() => {
    if (mode === 'stats' || !selectedCardId) return
    const activeCards = mode === 'study' ? studyCards : visibleCards
    if (!activeCards.some(card => card.id === selectedCardId)) {
      const nextCard = activeCards[0]
      setSelectedCardId(nextCard?.id ?? null)
      selectedCardSourceKeyRef.current = nextCard ? cardSourceKeys?.[nextCard.id] ?? null : null
    }
  }, [mode, studyCards, visibleCards, selectedCardId, cardSourceKeys])

  const handleModeChange = (nextMode: AppMode) => {
    setMode(nextMode)
    if (nextMode !== 'study') setStudyCardIds(null)
  }

  const handleDifficultyChange = async (cardId: string, difficulty: number) => {
    const card = cardList.find(item => item.id === cardId)
    if (!card || card.hasDifficultyColumn === false) return
    if (onPersistDifficulty) {
      try {
        await onPersistDifficulty(card, difficulty)
      } catch {
        return
      }
    }
    setCardList(currentCards => currentCards.map(item => item.id === cardId ? { ...item, difficulty } : item))
  }

  return (
    <div
      ref={rootRef}
      className={`flashcard-genius-root ${darkMode ? 'theme-dark ' : ''}theme-${colorScheme}`}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden', background: '#F7F6F2', fontFamily: 'var(--font-interface)' }}
    >
      <TopBar
        mode={mode}
        onModeChange={handleModeChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(open => !open)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(value => !value)}
        colorScheme={colorScheme}
        onColorSchemeChange={setColorScheme}
        onStatsClick={() => setMode('stats')}
        editingEnabled={false}
        onToggleEditingEnabled={noop}
        showEditingControl={false}
        showDarkModeControl={false}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sidebar
          categories={categories}
          decks={decks}
          cards={cardList}
          topics={topics}
          trash={[]}
          cardOrderByDeck={cardOrderByDeck}
          cardCounts={cardCounts}
          mode={mode}
          selectedDeckId={selectedDeckId}
          selectedStudyTopicId={selectedStudyTopicId}
          onSelectDeck={handleSelectDeck}
          onSelectTopic={(deckId, topicId) => { setSelectedDeckId(deckId); setSelectedStudyTopicId(topicId); setStudyCardIds(null) }}
          selectedCardId={selectedCardId}
          onSelectCard={handleFinderSelectCard}
          onCreateTopic={noop}
          onRenameTopic={noop}
          onMoveTopic={noop}
          onMoveCard={noop}
          onRestoreCard={noop}
          onEmptyTrash={noop}
          onAddDeck={noop}
          onDeleteDeck={noop}
          onDeleteAllDecks={noop}
          isOpen={sidebarOpen}
          immutable
          flushCategoryLabels
          onClearDecksFromView={onClearDecksFromView}
        />

        {mode === 'stats' ? (
          <StatsMode
            cards={cardList}
            decks={decks}
            markdownContext={markdownContext}
            cardSourcePaths={cardSourcePaths}
            onStudyCards={selectedCards => { setStudyCardIds(selectedCards.map(card => card.id)); setMode('study') }}
          />
        ) : mode === 'study' ? (
          <StudyMode
            cards={studyCards}
            selectedCardId={selectedCardId}
            onSelectCard={handleSelectCard}
            deck={selectedDeck}
            decks={decks}
            topics={topics}
            cardOrderByDeck={cardOrderByDeck}
            onExit={() => { setStudyCardIds(null); setMode('edit') }}
            onEditSource={editSourcePath && onOpenMarkdownSource ? () => onOpenMarkdownSource(editSourcePath) : undefined}
            onDifficultyChange={(cardId, difficulty) => { void handleDifficultyChange(cardId, difficulty) }}
            markdownContext={markdownContext}
            cardSourcePaths={cardSourcePaths}
            immutable
            allowDifficultyChanges
            responsiveBreakpoint={1024}
            showStars={showStars}
            onToggleShowStars={() => setShowStars(value => !value)}
            onImageDeckActionBlocked={onImageDeckActionBlocked}
          />
        ) : (
          <Workspace
            cards={visibleCards}
            deck={selectedDeck}
            topics={topics}
            cardOrder={selectedDeckId ? cardOrderByDeck[selectedDeckId] : undefined}
            selectedCardId={selectedCardId}
            onSelectCard={handleSelectCard}
            onEditSource={editSourcePath && onOpenMarkdownSource ? () => onOpenMarkdownSource(editSourcePath) : undefined}
            markdownContext={markdownContext}
            cardSourcePaths={cardSourcePaths}
            onAddCard={noop}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            onDifficultyChange={(cardId, difficulty) => { void handleDifficultyChange(cardId, difficulty) }}
            onSaveCard={noop}
            onDeleteCard={noop}
            onMoveCard={noop}
            readOnly
            immutable
            allowDifficultyChanges
            responsiveBreakpoint={1024}
            showStars={showStars}
            onToggleShowStars={() => setShowStars(value => !value)}
            onImageDeckActionBlocked={onImageDeckActionBlocked}
          />
        )}
      </div>
    </div>
  )
}
