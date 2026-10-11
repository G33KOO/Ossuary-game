import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import cardsData from '../data/cards.json'
import { CardDetailsDialog } from '../components/CardDetailsDialog'
import { CardFilterBar } from '../components/CardFilterBar'
import type { FilterOption } from '../components/CardFilterBar'
import { CardTile } from '../components/CardTile'
import { SectionLabel } from '../components/SectionLabel'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useLocale } from '../i18n/LocaleProvider'
import { localizeCard } from '../i18n/cardTranslations'
import { paths } from '../routes/paths'
import type { Card } from '../types/card'
import {
  buildSearchIndex,
  defaultFilters,
  matchesFilters,
  readFilters,
  sortCards,
  writeFilters,
} from '../utils/cardFilters'
import type { CardFilters } from '../utils/cardFilters'

const cards = cardsData as Card[]
const pageSize = 24
const typeOrder = [...new Set(cards.map((card) => card.type))]

function countOptions(entries: Card[], pick: (card: Card) => string): FilterOption[] {
  const counts = new Map<string, number>()
  for (const card of entries) {
    const value = pick(card)
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts].map(([value, count]) => ({ value, count }))
}

export function CardsPage() {
  const { locale, t } = useLocale()
  const navigate = useNavigate()
  const { search } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const cardMatch = useMatch(`${paths.cards}/:cardId`)
  const searchRef = useRef<HTMLInputElement>(null)

  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const filterKey = `${locale}|${searchParams.toString()}`
  const [growth, setGrowth] = useState({ key: filterKey, count: pageSize })
  const visibleCount = growth.key === filterKey ? growth.count : pageSize

  const localizedCards = useMemo(() => cards.map((card) => localizeCard(card, locale)), [locale])
  const localizedNames = useMemo(
    () => new Map(localizedCards.map((card) => [card.id, card.name])),
    [localizedCards],
  )
  const searchIndex = useMemo(() => buildSearchIndex(cards, localizedCards), [localizedCards])

  const results = useMemo(
    () =>
      sortCards(
        searchIndex.filter((entry) => matchesFilters(entry, filters)).map((entry) => entry.card),
        filters.sort,
        localizedNames,
        locale,
      ),
    [filters, localizedNames, locale, searchIndex],
  )

  const typeOptions = useMemo(() => {
    const counts = countOptions(
      searchIndex.filter((entry) => matchesFilters(entry, filters, 'type')).map((entry) => entry.card),
      (card) => card.type,
    )
    return typeOrder.map((type) => ({
      value: type,
      count: counts.find((option) => option.value === type)?.count ?? 0,
    }))
  }, [filters, searchIndex])

  const subtypeOptions = useMemo(
    () =>
      countOptions(
        searchIndex
          .filter((entry) => matchesFilters(entry, filters, 'subtype'))
          .map((entry) => entry.card),
        (card) => card.subtype,
      ),
    [filters, searchIndex],
  )

  const requirementOptions = useMemo(
    () =>
      countOptions(
        searchIndex
          .filter((entry) => matchesFilters(entry, filters, 'requirement'))
          .map((entry) => entry.card),
        (card) => card.requirement ?? '',
      ),
    [filters, searchIndex],
  )

  const loadMore = useCallback(() => {
    setGrowth((current) => ({
      key: filterKey,
      count: (current.key === filterKey ? current.count : pageSize) + pageSize,
    }))
  }, [filterKey])

  const hasMore = visibleCount < results.length
  const sentinelRef = useInfiniteScroll({ enabled: hasMore, onReachEnd: loadMore })

  const selectedIndex = cardMatch?.params.cardId
    ? results.findIndex((card) => card.id === cardMatch.params.cardId)
    : -1
  const selectedCard =
    selectedIndex >= 0
      ? results[selectedIndex]
      : cards.find((card) => card.id === cardMatch?.params.cardId) ?? null

  useEffect(() => {
    function focusSearchShortcut(event: KeyboardEvent) {
      const target = event.target
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    document.addEventListener('keydown', focusSearchShortcut)
    return () => document.removeEventListener('keydown', focusSearchShortcut)
  }, [])

  function updateFilters(patch: Partial<CardFilters>) {
    const next = { ...filters, ...patch }
    if (patch.type !== undefined && patch.type !== filters.type) {
      next.subtype = ''
      next.requirement = ''
    }
    setSearchParams(writeFilters(searchParams, next), { replace: true })
  }

  function resetFilters() {
    setSearchParams(writeFilters(searchParams, { ...defaultFilters, sort: filters.sort }), {
      replace: true,
    })
  }

  function openCard(card: Card, replace = false) {
    navigate({ pathname: paths.card(card.id), search }, { replace })
  }

  function closeCard() {
    navigate({ pathname: paths.cards, search }, { replace: true })
  }

  const previousCard = selectedIndex > 0 ? results[selectedIndex - 1] : null
  const nextCard =
    selectedIndex >= 0 && selectedIndex < results.length - 1 ? results[selectedIndex + 1] : null

  return (
    <section className="catalog-section section-wrap">
      <SectionLabel number="03">{t('catalog.section')}</SectionLabel>
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">{t('catalog.eyebrow')}</p>
          <h1>
            {t('catalog.titleOne')}
            <br />
            <em>{t('catalog.titleTwo')}</em>
          </h1>
        </div>
        <p>{t('catalog.description')}</p>
      </div>

      <CardFilterBar
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        requirementOptions={requirementOptions}
        resultCount={results.length}
        searchRef={searchRef}
        subtypeOptions={subtypeOptions}
        total={cards.length}
        typeOptions={typeOptions}
      />

      {results.length > 0 ? (
        <div className="card-grid">
          {results.slice(0, visibleCount).map((card) => (
            <CardTile card={card} key={card.id} locale={locale} onSelect={openCard} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">⌕</span>
          <h2>{t('catalog.noResults')}</h2>
          <p>{t('catalog.noResultsDescription')}</p>
          <button className="text-link link-light" onClick={resetFilters} type="button">
            {t('catalog.reset')} <span aria-hidden="true">↺</span>
          </button>
        </div>
      )}

      {hasMore ? (
        <div className="scroll-sentinel" ref={sentinelRef} role="status">
          {t('catalog.loadingMore')}
        </div>
      ) : (
        results.length > 0 && <p className="scroll-end">{t('catalog.end')}</p>
      )}

      <CardDetailsDialog
        card={selectedCard}
        onClose={closeCard}
        onNext={nextCard ? () => openCard(nextCard, true) : undefined}
        onPrevious={previousCard ? () => openCard(previousCard, true) : undefined}
      />
    </section>
  )
}
