import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppMode, Card, Category, Deck, DeckTopic } from '../types'

interface Props {
  categories: Category[]
  decks: Deck[]
  cards: Card[]
  topics: DeckTopic[]
  trash: Card[]
  cardOrderByDeck: Record<string, string[]>
  cardCounts: Record<string, number>
  mode: AppMode
  selectedDeckId: string | null
  selectedStudyTopicId: string | null | undefined
  onSelectDeck: (id: string | null) => void
  onSelectTopic: (deckId: string, topicId: string | null) => void
  onSelectCard: (id: string) => void
  onCreateTopic: (deckId: string, name: string) => void
  onRenameTopic: (id: string, name: string) => void
  onMoveTopic: (deckId: string, topicId: string, beforeTopicId: string) => void
  onMoveCard: (cardId: string, topicId: string | null, beforeCardId?: string) => void
  onRestoreCard: (id: string) => void
  onEmptyTrash: () => void
  onAddDeck: () => void
  onDeleteDeck: (id: string) => void
  onDeleteAllDecks: () => void
  importExportPanel?: ReactNode
  isOpen: boolean
  immutable?: boolean
  flushCategoryLabels?: boolean
  onClearDecksFromView?: () => void
}

function IconChevron({ down }: { down: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{ transform: down ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
    >
      <path d="M2.5 4L6 7.5L9.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconCards() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="1" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1.5" y1="11" x2="11.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 3.5h9M5 3.5V2h3v1.5M3.5 3.5l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="8.2" y1="8.2" x2="11.5" y2="11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function plainTextPreview(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|\+\+|`/g, '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function readStoredSidebarWidth(): number {
  if (typeof window === 'undefined') return 224
  try {
    const storedWidth = Number(window.localStorage.getItem('flashcard-genius.sidebar-width'))
    return Number.isFinite(storedWidth) ? Math.min(420, Math.max(164, storedWidth)) : 224
  } catch {
    return 224
  }
}

export default function Sidebar({
  categories,
  decks,
  cards,
  topics,
  trash,
  cardOrderByDeck,
  cardCounts,
  mode,
  selectedDeckId,
  selectedStudyTopicId,
  onSelectDeck,
  onSelectTopic,
  onSelectCard,
  onCreateTopic,
  onRenameTopic,
  onMoveTopic,
  onMoveCard,
  onRestoreCard,
  onEmptyTrash,
  onAddDeck,
  onDeleteDeck,
  onDeleteAllDecks,
  importExportPanel,
  isOpen,
  immutable = false,
  flushCategoryLabels = false,
  onClearDecksFromView,
}: Props) {
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(() => new Set(categories.map(category => category.id)))
  const [expandedDeckIds, setExpandedDeckIds] = useState<Set<string>>(new Set())
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(() => new Set(topics.map(topic => topic.id)))
  const [uncategorizedCollapsed, setUncategorizedCollapsed] = useState(true)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [creatingTopicForDeckId, setCreatingTopicForDeckId] = useState<string | null>(null)
  const [newTopicName, setNewTopicName] = useState('')
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editedTopicName, setEditedTopicName] = useState('')
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null)
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [dropPreview, setDropPreview] = useState<{ cardId: string; position: 'before' | 'after' } | null>(null)
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth)
  const [availableWidth, setAvailableWidth] = useState(() => typeof window === 'undefined' ? 1200 : window.innerWidth)
  const sidebarRef = useRef<HTMLElement>(null)
  const resizingRef = useRef(false)
  const manuallyResizedRef = useRef(false)
  const resizeStartRef = useRef({ x: 0, width: 224 })

  const maxSidebarWidth = Math.max(164, Math.floor(availableWidth / 3))
  const visibleDecksForSizing = useMemo(() => decks.filter(deck => {
    if (sidebarSearch && !deck.name.toLocaleLowerCase().includes(sidebarSearch.toLocaleLowerCase())) return false
    return deck.categoryId === null
      ? !uncategorizedCollapsed
      : !collapsedCats.has(deck.categoryId)
  }), [collapsedCats, decks, sidebarSearch, uncategorizedCollapsed])
  const visibleCardsForSizing = useMemo(() => cards.filter(card => {
    if (!visibleDecksForSizing.some(deck => deck.id === card.deckId)) return false
    if (!expandedDeckIds.has(card.deckId)) return false
    const topicKey = card.topicId ?? `${card.deckId}:unassigned`
    return !collapsedTopics.has(topicKey)
  }), [cards, collapsedTopics, expandedDeckIds, visibleDecksForSizing])
  const automaticSidebarWidth = useMemo(() => {
    const labels = [
      ...categories
        .filter(category => !sidebarSearch || decks.some(deck => deck.categoryId === category.id && deck.name.toLocaleLowerCase().includes(sidebarSearch.toLocaleLowerCase())))
        .map(category => category.name),
      ...visibleDecksForSizing.map(deck => deck.name),
      ...topics.filter(topic => visibleDecksForSizing.some(deck => deck.id === topic.deckId) && expandedDeckIds.has(topic.deckId)).map(topic => topic.name),
      ...visibleCardsForSizing.map(card => plainTextPreview(card.question)),
      'All Decks',
      'Collapse all',
      'Clear loaded decks',
    ]
    const longestLabel = labels.reduce((longest, label) => Math.max(longest, label.length), 0)
    const contentWidth = Math.ceil(84 + Math.min(longestLabel, 42) * 7.2)
    return Math.min(maxSidebarWidth, Math.max(164, contentWidth))
  }, [availableWidth, categories, collapsedCats, decks, expandedDeckIds, maxSidebarWidth, sidebarSearch, topics, visibleCardsForSizing, visibleDecksForSizing])

  useEffect(() => {
    const element = sidebarRef.current
    const parent = element?.parentElement
    if (!parent) return

    const updateAvailableWidth = () => setAvailableWidth(parent.clientWidth || window.innerWidth)
    updateAvailableWidth()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateAvailableWidth)
      return () => window.removeEventListener('resize', updateAvailableWidth)
    }

    const observer = new ResizeObserver(updateAvailableWidth)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!manuallyResizedRef.current) setSidebarWidth(automaticSidebarWidth)
  }, [automaticSidebarWidth])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizingRef.current) return
      const nextWidth = resizeStartRef.current.width + event.clientX - resizeStartRef.current.x
      setSidebarWidth(Math.min(maxSidebarWidth, Math.max(164, nextWidth)))
    }
    const stopResizing = () => {
      if (!resizingRef.current) return
      resizingRef.current = false
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResizing)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResizing)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
  }, [maxSidebarWidth])

  useEffect(() => {
    try {
      window.localStorage.setItem('flashcard-genius.sidebar-width', String(sidebarWidth))
    } catch {
      // Persistence is optional when storage is unavailable.
    }
  }, [sidebarWidth])

  const toggleCat = (id: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleDeckQuestions = (id: string) => {
    setExpandedDeckIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTopic = (id: string) => {
    setCollapsedTopics(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalCards = Object.values(cardCounts).reduce((a, b) => a + b, 0)

  const collapseAll = () => {
    setCollapsedCats(new Set(categories.map(category => category.id)))
    setExpandedDeckIds(new Set())
    setCollapsedTopics(new Set(topics.map(topic => topic.id)))
    setUncategorizedCollapsed(true)
  }

  const filteredDecks = (categoryId: string | null) =>
    decks
      .filter(d => d.categoryId === categoryId)
      .filter(d => !sidebarSearch || d.name.toLowerCase().includes(sidebarSearch.toLowerCase()))

  const resetDragState = () => {
    setDraggedTopicId(null)
    setDraggedCardId(null)
    setDropPreview(null)
    setHighlightedTopicId(null)
  }

  const deckItem = (deck: Deck) => {
    const isSelected = selectedDeckId === deck.id
    const count = cardCounts[deck.id] ?? 0
    const questionsExpanded = expandedDeckIds.has(deck.id)
    const orderIndex = new Map((cardOrderByDeck[deck.id] ?? []).map((id, index) => [id, index]))
    const deckCards = cards
      .filter(card => card.deckId === deck.id)
      .sort((a, b) => (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    const deckTopics = topics.filter(topic => topic.deckId === deck.id)
    const topicGroups = deckTopics.map(topic => ({ ...topic, cards: deckCards.filter(card => card.topicId === topic.id) }))
    const unassignedCards = deckCards.filter(card => !card.topicId || !deckTopics.some(topic => topic.id === card.topicId))

    const renderCard = (card: Card, topicId: string | null, nextCardId?: string) => {
      const previewPosition = dropPreview?.cardId === card.id ? dropPreview.position : null
      return (
        <div key={card.id} style={{ position: 'relative' }}>
          {previewPosition && <span style={{ position: 'absolute', left: '2px', right: '2px', [previewPosition === 'before' ? 'top' : 'bottom']: '-1px', height: '2px', background: 'var(--app-accent, #4F46E5)', borderRadius: '2px', pointerEvents: 'none', zIndex: 2 }} />}
          <button
            type="button"
            draggable={!immutable}
            onDragStart={event => {
              setDraggedCardId(card.id)
              setDraggedTopicId(null)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={resetDragState}
            onDragOver={event => {
              event.preventDefault()
              event.stopPropagation()
              if (!draggedCardId || draggedCardId === card.id) return
              setHighlightedTopicId(null)
              const bounds = event.currentTarget.getBoundingClientRect()
              setDropPreview({ cardId: card.id, position: event.clientY - bounds.top < bounds.height / 2 ? 'before' : 'after' })
            }}
            onDrop={event => {
              event.preventDefault()
              event.stopPropagation()
              if (draggedCardId && draggedCardId !== card.id) {
                const bounds = event.currentTarget.getBoundingClientRect()
                const position = event.clientY - bounds.top < bounds.height / 2 ? 'before' : 'after'
                onMoveCard(draggedCardId, topicId, position === 'before' ? card.id : nextCardId)
              }
              resetDragState()
            }}
            onClick={() => onSelectCard(card.id)}
            title={card.question}
            style={{ width: '100%', border: 'none', background: 'transparent', color: '#6B6560', cursor: 'grab', padding: '4px 5px 4px 18px', textAlign: 'left', fontFamily: 'inherit', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E3E0D7')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            {plainTextPreview(card.question)}
          </button>
        </div>
      )
    }

    const renderTopic = (topic: DeckTopic, topicCards: Card[]) => {
      const isTopicCollapsed = collapsedTopics.has(topic.id)
      const isEditing = editingTopicId === topic.id
      return (
        <div
          key={topic.id}
          style={{ marginTop: '2px', borderRadius: '5px', background: highlightedTopicId === topic.id ? 'var(--app-accent-soft, #EEF2FF)' : 'transparent', outline: highlightedTopicId === topic.id ? '1px solid var(--app-accent, #4F46E5)' : 'none', transition: 'background 0.12s, outline 0.12s' }}
          onDragOver={event => {
            event.preventDefault()
            if (draggedCardId) setHighlightedTopicId(topic.id)
          }}
          onDrop={event => {
            event.preventDefault()
            if (draggedTopicId) onMoveTopic(deck.id, draggedTopicId, topic.id)
            if (draggedCardId) onMoveCard(draggedCardId, topic.id)
            resetDragState()
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isEditing ? (
              <input
                autoFocus
                value={editedTopicName}
                onChange={event => setEditedTopicName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') { onRenameTopic(topic.id, editedTopicName); setEditingTopicId(null) }
                  if (event.key === 'Escape') setEditingTopicId(null)
                }}
                onBlur={() => { onRenameTopic(topic.id, editedTopicName); setEditingTopicId(null) }}
                style={{ flex: 1, minWidth: 0, height: '23px', padding: '0 5px', borderRadius: '4px', border: '1px solid #C8C4B8', background: '#F7F6F2', color: '#4A4640', fontSize: '10.5px', fontFamily: 'inherit' }}
              />
            ) : (
              <button
                type="button"
                className="subtopic-item"
                draggable={!immutable}
                onDragStart={event => { setDraggedTopicId(topic.id); setDraggedCardId(null); event.dataTransfer.effectAllowed = 'move' }}
                onDragEnd={resetDragState}
                onClick={() => {
                  if (mode === 'study') onSelectTopic(deck.id, topic.id)
                  toggleTopic(topic.id)
                }}
                style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 4px', border: 'none', background: mode === 'study' && selectedStudyTopicId === topic.id ? 'var(--app-accent-soft, #EEF2FF)' : 'transparent', color: mode === 'study' && selectedStudyTopicId === topic.id ? 'var(--app-accent, #4F46E5)' : '#9B9488', cursor: 'grab', fontSize: '10.5px', fontWeight: 600, textAlign: 'left', fontFamily: 'inherit' }}
              >
                <IconChevron down={!isTopicCollapsed} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.name}</span>
                <span className="topic-count">{topicCards.length}</span>
              </button>
            )}
            {!immutable && <button type="button" onClick={() => { setEditingTopicId(topic.id); setEditedTopicName(topic.name) }} title="Rename subtopic" aria-label={`Rename ${topic.name}`} style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', color: '#9B9488', cursor: 'pointer', padding: 0, fontSize: '12px' }}>✎</button>}
          </div>
          {!isTopicCollapsed && topicCards.map((card, index) => renderCard(card, topic.id, topicCards[index + 1]?.id))}
        </div>
      )
    }

    return (
      <div key={deck.id} style={{ marginBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button title={deck.name} className={`deck-item${isSelected ? ' is-selected' : ''}`} onClick={() => onSelectDeck(deck.id)} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 6px 6px 22px', borderRadius: '6px 0 0 6px', border: 'none', cursor: 'pointer', background: isSelected ? '#D8D4C8' : 'transparent', color: isSelected ? '#111110' : '#4A4640', fontSize: '12.5px', fontWeight: isSelected ? 500 : 400, textAlign: 'left', transition: 'all 0.13s', fontFamily: 'inherit' }} onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#E3E0D7' }} onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: deck.color, flexShrink: 0 }} />
            <span title={deck.name} aria-label={deck.name} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</span>
            <span className="deck-count" style={{ fontSize: '10.5px', fontWeight: 500, color: isSelected ? '#6B6560' : '#9B9488', background: isSelected ? 'rgba(0,0,0,0.06)' : '#E3E0D7', borderRadius: '10px', padding: '1px 6px', flexShrink: 0 }}>{count}</span>
          </button>
          <button type="button" onClick={() => toggleDeckQuestions(deck.id)} aria-label={questionsExpanded ? `Collapse questions in ${deck.name}` : `Show questions in ${deck.name}`} title={questionsExpanded ? 'Collapse questions' : 'Show questions'} style={{ width: '26px', height: '28px', border: 'none', borderRadius: '0 6px 6px 0', background: isSelected ? '#D8D4C8' : 'transparent', color: '#6B6560', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <IconChevron down={questionsExpanded} />
          </button>
          {!immutable && <button type="button" onClick={() => onDeleteDeck(deck.id)} aria-label={`Delete ${deck.name}`} title={`Delete ${deck.name}`} style={{ width: '24px', height: '28px', border: 'none', borderRadius: '5px', background: 'transparent', color: '#9B9488', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '13px' }} onMouseEnter={event => ((event.currentTarget as HTMLElement).style.color = '#DC2626')} onMouseLeave={event => ((event.currentTarget as HTMLElement).style.color = '#9B9488')}>
            <IconTrash />
          </button>}
        </div>

        {questionsExpanded && (
          <div style={{ padding: '4px 0 6px 28px' }}>
            {topicGroups.map(topic => renderTopic(topic, topic.cards))}
            <div onDragOver={event => { event.preventDefault(); if (draggedCardId) setHighlightedTopicId(null) }} onDrop={event => { event.preventDefault(); if (draggedCardId) onMoveCard(draggedCardId, null); resetDragState() }}>
              <button className="subtopic-item" type="button" onClick={() => { if (mode === 'study') onSelectTopic(deck.id, null); toggleTopic(`${deck.id}:unassigned`) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px', border: 'none', background: mode === 'study' && selectedStudyTopicId === null && selectedDeckId === deck.id ? 'var(--app-accent-soft, #EEF2FF)' : 'transparent', color: mode === 'study' && selectedStudyTopicId === null && selectedDeckId === deck.id ? 'var(--app-accent, #4F46E5)' : '#9B9488', cursor: 'pointer', fontSize: '10.5px', fontWeight: 600, textAlign: 'left', fontFamily: 'inherit' }}>
                <IconChevron down={!collapsedTopics.has(`${deck.id}:unassigned`)} />
                <span style={{ flex: 1 }}>No subtopic</span>
                <span className="topic-count">{unassignedCards.length}</span>
              </button>
              {!collapsedTopics.has(`${deck.id}:unassigned`) && unassignedCards.map((card, index) => renderCard(card, null, unassignedCards[index + 1]?.id))}
            </div>

            {!immutable && (creatingTopicForDeckId === deck.id ? (
              <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
                <input autoFocus value={newTopicName} onChange={event => setNewTopicName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { onCreateTopic(deck.id, newTopicName); setNewTopicName(''); setCreatingTopicForDeckId(null) }; if (event.key === 'Escape') setCreatingTopicForDeckId(null) }} placeholder="Subtopic name" style={{ minWidth: 0, flex: 1, height: '24px', padding: '0 5px', borderRadius: '4px', border: '1px solid #C8C4B8', background: '#F7F6F2', fontSize: '10.5px', fontFamily: 'inherit' }} />
                <button type="button" onClick={() => { onCreateTopic(deck.id, newTopicName); setNewTopicName(''); setCreatingTopicForDeckId(null) }} style={{ border: 'none', borderRadius: '4px', background: '#E3E0D7', color: '#4A4640', cursor: 'pointer', fontSize: '10.5px' }}>Add</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setCreatingTopicForDeckId(deck.id); setNewTopicName('') }} style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'transparent', color: '#6B6560', cursor: 'pointer', fontSize: '10.5px', fontFamily: 'inherit', padding: '3px 4px' }}><IconPlus /> Add subtopic</button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <aside className="sidebar"
      ref={sidebarRef}
      style={{
        width: `${sidebarWidth}px`,
        minWidth: '164px',
        maxWidth: `${maxSidebarWidth}px`,
        flexShrink: 0,
        background: '#EDEBE4',
        borderRight: '1px solid #E2DED4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Search */}
      <div style={{ padding: '12px 10px 8px' }}>
        <div style={{ position: 'relative' }}>
          <span className="deck-count"
            style={{
              position: 'absolute',
              left: '9px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9B9488',
              pointerEvents: 'none',
            }}
          >
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search decks…"
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            style={{
              width: '100%',
              height: '30px',
              paddingLeft: '28px',
              paddingRight: '8px',
              borderRadius: '6px',
              border: '1px solid #D8D4C8',
              background: '#F7F6F2',
              fontSize: '12px',
              color: '#111110',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => ((e.target as HTMLElement).style.borderColor = '#4F46E5')}
            onBlur={e => ((e.target as HTMLElement).style.borderColor = '#D8D4C8')}
          />
        </div>
      </div>

      {!immutable && importExportPanel}

      {/* All Decks */}
      <div style={{ padding: '0 10px 4px' }}>
        <button
          className={`deck-item${selectedDeckId === null ? ' is-selected' : ''}`}
          onClick={() => onSelectDeck(null)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: selectedDeckId === null ? '#D8D4C8' : 'transparent',
            color: selectedDeckId === null ? '#111110' : '#4A4640',
            fontSize: '12.5px',
            fontWeight: selectedDeckId === null ? 500 : 400,
            textAlign: 'left',
            transition: 'all 0.13s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            if (selectedDeckId !== null) (e.currentTarget as HTMLElement).style.background = '#E3E0D7'
          }}
          onMouseLeave={e => {
            if (selectedDeckId !== null) (e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <IconCards />
          <span style={{ flex: 1 }}>All Decks</span>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 500,
              color: selectedDeckId === null ? '#6B6560' : '#9B9488',
              background: selectedDeckId === null ? 'rgba(0,0,0,0.06)' : '#E3E0D7',
              borderRadius: '10px',
              padding: '1px 6px',
            }}
          >
            {totalCards}
          </span>
        </button>
      </div>

      <div style={{ padding: '0 10px 7px' }}>
        <button
          type="button"
          onClick={collapseAll}
          title="Collapse all categories, decks, and subtopics"
          style={{ width: '100%', height: '26px', borderRadius: '5px', border: '1px solid #D8D4C8', background: 'transparent', color: '#6B6560', cursor: 'pointer', fontSize: '10.5px', fontFamily: 'inherit', textAlign: 'left', padding: '0 10px' }}
        >
          Collapse all
        </button>
      </div>

      {!immutable && <div style={{ padding: '0 10px 7px' }}>
        <button
          type="button"
          disabled={decks.length === 0}
          onClick={onDeleteAllDecks}
          style={{ width: '100%', height: '26px', borderRadius: '5px', border: '1px solid #FCA5A5', background: 'transparent', color: decks.length === 0 ? '#C8C4B8' : '#DC2626', cursor: decks.length === 0 ? 'not-allowed' : 'pointer', fontSize: '10.5px', fontFamily: 'inherit' }}
        >
          Delete all decks
        </button>
      </div>}

      {immutable && onClearDecksFromView && <div style={{ padding: '0 10px 7px' }}>
        <button
          type="button"
          disabled={decks.length === 0}
          onClick={onClearDecksFromView}
          title="Remove all loaded decks from this view. Markdown files are not changed."
          style={{ width: '100%', height: '26px', borderRadius: '5px', border: '1px solid #C8C4B8', background: 'transparent', color: decks.length === 0 ? '#C8C4B8' : '#6B6560', cursor: decks.length === 0 ? 'not-allowed' : 'pointer', fontSize: '10.5px', fontFamily: 'inherit' }}
        >
          Clear loaded decks
        </button>
      </div>}

      {!immutable && <div style={{ padding: '0 10px 4px' }}>
        <button
          type="button"
          onClick={() => setTrashOpen(open => !open)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: trashOpen ? '#E3E0D7' : 'transparent', color: '#4A4640', fontSize: '12.5px', textAlign: 'left', fontFamily: 'inherit' }}
        >
          <IconTrash />
          <span style={{ flex: 1 }}>Trash</span>
          <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#9B9488', background: '#E3E0D7', borderRadius: '10px', padding: '1px 6px' }}>{trash.length}</span>
          <IconChevron down={trashOpen} />
        </button>
        {trashOpen && (
          <div style={{ padding: '4px 0 4px 18px' }}>
            {trash.map(card => (
              <button
                key={card.id}
                type="button"
                onClick={() => onRestoreCard(card.id)}
                title="Restore to its original position"
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#6B6560', cursor: 'pointer', padding: '4px 5px', textAlign: 'left', fontFamily: 'inherit', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                onMouseEnter={event => ((event.currentTarget as HTMLElement).style.background = '#E3E0D7')}
                onMouseLeave={event => ((event.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                ↩ {card.question}
              </button>
            ))}
            {trash.length === 0 && <p style={{ margin: '4px 0', color: '#9B9488', fontSize: '11px' }}>Trash is empty</p>}
            <button
              type="button"
              disabled={trash.length === 0}
              onClick={onEmptyTrash}
              style={{ marginTop: '5px', width: '100%', height: '25px', borderRadius: '5px', border: '1px solid #FCA5A5', background: 'transparent', color: trash.length === 0 ? '#C8C4B8' : '#DC2626', cursor: trash.length === 0 ? 'not-allowed' : 'pointer', fontSize: '10.5px', fontFamily: 'inherit' }}
            >
              Empty trash
            </button>
          </div>
        )}
      </div>}

      <div
        style={{
          height: '1px',
          background: '#D8D4C8',
          margin: '4px 10px 8px',
        }}
      />

      {/* Deck list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
        {categories.map(cat => {
          const catDecks = filteredDecks(cat.id)
          if (sidebarSearch && catDecks.length === 0) return null
          const isCollapsed = collapsedCats.has(cat.id)
          return (
            <div key={cat.id} style={{ marginBottom: '4px' }}>
              <button
                onClick={() => toggleCat(cat.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: flushCategoryLabels ? '5px 0' : '5px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: 'transparent',
                  color: '#9B9488',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'color 0.13s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#6B6560')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9B9488')}
              >
                <IconChevron down={!isCollapsed} />
                {cat.name}
              </button>
              {!isCollapsed && (
                <div style={{ marginTop: '2px', marginBottom: '4px' }}>
                  {catDecks.map(deckItem)}
                  {catDecks.length === 0 && (
                    <p style={{ fontSize: '11.5px', color: '#9B9488', padding: '4px 22px' }}>No decks</p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Uncategorized decks */}
        {filteredDecks(null).length > 0 && (
          <div style={{ marginBottom: '4px' }}>
            <button
              type="button"
              onClick={() => setUncategorizedCollapsed(value => !value)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: flushCategoryLabels ? '5px 0' : '5px 8px',
                border: 'none',
                borderRadius: '5px',
                background: 'transparent',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#9B9488',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <IconChevron down={!uncategorizedCollapsed} />
              Other
            </button>
            {!uncategorizedCollapsed && <div style={{ marginTop: '2px' }}>{filteredDecks(null).map(deckItem)}</div>}
          </div>
        )}
      </div>

      {/* Add deck button */}
      {!immutable && <div style={{ padding: '10px', borderTop: '1px solid #D8D4C8' }}>
        <button
          onClick={onAddDeck}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px',
            borderRadius: '6px',
            border: '1px dashed #C8C4B8',
            background: 'transparent',
            color: '#9B9488',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#E3E0D7'
            el.style.borderColor = '#9B9488'
            el.style.color = '#4A4640'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.borderColor = '#C8C4B8'
            el.style.color = '#9B9488'
          }}
        >
          <IconPlus />
          New Deck
        </button>
      </div>}
      <div
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        onPointerDown={event => {
          event.preventDefault()
          manuallyResizedRef.current = true
          resizingRef.current = true
          resizeStartRef.current = { x: event.clientX, width: sidebarWidth }
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
        }}
        style={{ position: 'absolute', top: 0, right: '-4px', bottom: 0, width: '8px', cursor: 'col-resize', zIndex: 5, touchAction: 'none' }}
      />
    </aside>
  )
}
