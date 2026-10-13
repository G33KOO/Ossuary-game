import { useLocale } from '../hooks/useLocale'
import {
  localizeCardRequirement,
  localizeCardSubtype,
  localizeCardType,
} from '../i18n/cardTranslations'
import type { MessageKey } from '../i18n/messages'
import { cardSorts, countActiveFilters, valueBands } from '../utils/cardFilters'
import type { CardFilters, CardSort, ValueBand } from '../utils/cardFilters'

export type FilterOption = {
  value: string
  count: number
}

type CardFilterBarProps = {
  filters: CardFilters
  total: number
  resultCount: number
  typeOptions: FilterOption[]
  subtypeOptions: FilterOption[]
  requirementOptions: FilterOption[]
  searchRef: React.RefObject<HTMLInputElement | null>
  onChange: (patch: Partial<CardFilters>) => void
  onReset: () => void
}

const sortLabels: Record<CardSort, MessageKey> = {
  id: 'catalog.sortId',
  name: 'catalog.sortName',
  valueDesc: 'catalog.sortValueDesc',
  valueAsc: 'catalog.sortValueAsc',
}

const valueBandLabels: Record<ValueBand, string> = {
  low: '1–3',
  mid: '4–9',
  high: '10+',
  none: '',
}

export function CardFilterBar({
  filters,
  total,
  resultCount,
  typeOptions,
  subtypeOptions,
  requirementOptions,
  searchRef,
  onChange,
  onReset,
}: CardFilterBarProps) {
  const { locale, t } = useLocale()
  const activeFilters = countActiveFilters(filters)

  return (
    <div className="filter-bar">
      <div className="catalog-controls">
        <label className="search-box">
          <span aria-hidden="true" className="search-icon">⌕</span>
          <span className="visually-hidden">{t('catalog.searchLabel')}</span>
          <input
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder={t('catalog.searchPlaceholder')}
            ref={searchRef}
            type="search"
            value={filters.query}
          />
          <kbd>/</kbd>
        </label>
        <span aria-live="polite" className="result-count">
          {resultCount}
          <span> / {total} {t('catalog.cards')}</span>
        </span>
      </div>

      <div aria-label={t('catalog.filterLabel')} className="filter-list" role="group">
        <button
          aria-pressed={filters.type === ''}
          className={`filter-chip${filters.type === '' ? ' active' : ''}`}
          onClick={() => onChange({ type: '' })}
          type="button"
        >
          {t('catalog.all')} <span>{typeOptions.reduce((sum, option) => sum + option.count, 0)}</span>
        </button>
        {typeOptions.map((option) => (
          <button
            aria-pressed={filters.type === option.value}
            className={`filter-chip${filters.type === option.value ? ' active' : ''}`}
            disabled={option.count === 0 && filters.type !== option.value}
            key={option.value}
            onClick={() => onChange({ type: option.value })}
            type="button"
          >
            {localizeCardType(option.value, locale)} <span>{option.count}</span>
          </button>
        ))}
      </div>

      <div className="filter-selects">
        {subtypeOptions.length > 0 && (
          <label className="select-field">
            <span>{t('catalog.subtype')}</span>
            <select
              onChange={(event) => onChange({ subtype: event.target.value })}
              value={filters.subtype}
            >
              <option value="">{t('catalog.anySubtype')}</option>
              {subtypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {localizeCardSubtype(option.value, locale)} ({option.count})
                </option>
              ))}
            </select>
          </label>
        )}

        {requirementOptions.length > 0 && (
          <label className="select-field">
            <span>{t('catalog.mastery')}</span>
            <select
              onChange={(event) => onChange({ requirement: event.target.value })}
              value={filters.requirement}
            >
              <option value="">{t('catalog.anyMastery')}</option>
              {requirementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {localizeCardRequirement(option.value, locale)} ({option.count})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="select-field">
          <span>{t('catalog.value')}</span>
          <select
            onChange={(event) => onChange({ valueBand: event.target.value as ValueBand | '' })}
            value={filters.valueBand}
          >
            <option value="">{t('catalog.anyValue')}</option>
            {valueBands.map((band) => (
              <option key={band} value={band}>
                {band === 'none' ? t('catalog.valueNone') : valueBandLabels[band]}
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <span>{t('catalog.sort')}</span>
          <select
            onChange={(event) => onChange({ sort: event.target.value as CardSort })}
            value={filters.sort}
          >
            {cardSorts.map((sort) => (
              <option key={sort} value={sort}>{t(sortLabels[sort])}</option>
            ))}
          </select>
        </label>

        {activeFilters > 0 && (
          <button className="text-link link-light reset-filters" onClick={onReset} type="button">
            {t('catalog.reset')} ({activeFilters}) <span aria-hidden="true">↺</span>
          </button>
        )}
      </div>
    </div>
  )
}
