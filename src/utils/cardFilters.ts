import type { Card } from '../types/card'

export type ValueBand = 'none' | 'low' | 'mid' | 'high'
export type CardSort = 'id' | 'name' | 'valueDesc' | 'valueAsc'

export type CardFilters = {
  query: string
  type: string
  subtype: string
  requirement: string
  valueBand: ValueBand | ''
  sort: CardSort
}

export const defaultFilters: CardFilters = {
  query: '',
  type: '',
  subtype: '',
  requirement: '',
  valueBand: '',
  sort: 'id',
}

export const valueBands: ValueBand[] = ['low', 'mid', 'high', 'none']
export const cardSorts: CardSort[] = ['id', 'name', 'valueDesc', 'valueAsc']

const filterKeys = {
  query: 'q',
  type: 'type',
  subtype: 'subtype',
  requirement: 'req',
  valueBand: 'value',
  sort: 'sort',
} as const

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
}

function numericValue(card: Card) {
  return card.value === '' ? null : Number(card.value)
}

function matchesValueBand(card: Card, band: ValueBand) {
  const value = numericValue(card)
  if (band === 'none') return value === null
  if (value === null) return false
  if (band === 'low') return value <= 3
  if (band === 'mid') return value >= 4 && value <= 9
  return value >= 10
}

export function readFilters(params: URLSearchParams): CardFilters {
  const valueBand = params.get(filterKeys.valueBand)
  const sort = params.get(filterKeys.sort)

  return {
    query: params.get(filterKeys.query) ?? '',
    type: params.get(filterKeys.type) ?? '',
    subtype: params.get(filterKeys.subtype) ?? '',
    requirement: params.get(filterKeys.requirement) ?? '',
    valueBand: valueBands.includes(valueBand as ValueBand) ? (valueBand as ValueBand) : '',
    sort: cardSorts.includes(sort as CardSort) ? (sort as CardSort) : 'id',
  }
}

export function writeFilters(params: URLSearchParams, filters: CardFilters) {
  const next = new URLSearchParams(params)

  for (const key of Object.keys(filterKeys) as (keyof CardFilters)[]) {
    const value = filters[key]
    if (value && value !== defaultFilters[key]) {
      next.set(filterKeys[key], value)
    } else {
      next.delete(filterKeys[key])
    }
  }

  return next
}

export function countActiveFilters(filters: CardFilters) {
  return (['query', 'type', 'subtype', 'requirement', 'valueBand'] as const).filter(
    (key) => filters[key] !== '',
  ).length
}

type SearchableCard = {
  card: Card
  searchText: string
}

export function buildSearchIndex(cards: Card[], localizedCards: Card[]): SearchableCard[] {
  return cards.map((card, index) => {
    const localized = localizedCards[index]
    const fields = [card, localized].flatMap((entry) => [
      entry.id,
      entry.name,
      entry.deck,
      entry.type,
      entry.subtype,
      entry.text,
      entry.requirement,
    ])

    return { card, searchText: normalize(fields.filter(Boolean).join(' ')) }
  })
}

export function matchesFilters(
  entry: SearchableCard,
  filters: CardFilters,
  ignore?: keyof CardFilters,
) {
  const { card, searchText } = entry
  const query = normalize(filters.query.trim())

  if (ignore !== 'query' && query && !searchText.includes(query)) return false
  if (ignore !== 'type' && filters.type && card.type !== filters.type) return false
  if (ignore !== 'subtype' && filters.subtype && card.subtype !== filters.subtype) return false
  if (ignore !== 'requirement' && filters.requirement && card.requirement !== filters.requirement) {
    return false
  }
  if (ignore !== 'valueBand' && filters.valueBand && !matchesValueBand(card, filters.valueBand)) {
    return false
  }

  return true
}

export function sortCards(cards: Card[], sort: CardSort, localizedNames: Map<string, string>, locale: string) {
  const sorted = [...cards]

  if (sort === 'name') {
    return sorted.sort((left, right) =>
      (localizedNames.get(left.id) ?? left.name).localeCompare(
        localizedNames.get(right.id) ?? right.name,
        locale,
      ),
    )
  }

  if (sort === 'valueDesc' || sort === 'valueAsc') {
    const direction = sort === 'valueDesc' ? -1 : 1

    return sorted.sort((left, right) => {
      const leftValue = numericValue(left)
      const rightValue = numericValue(right)
      if (leftValue === null && rightValue === null) return left.id.localeCompare(right.id)
      if (leftValue === null) return 1
      if (rightValue === null) return -1
      return (leftValue - rightValue) * direction || left.id.localeCompare(right.id)
    })
  }

  return sorted
}
