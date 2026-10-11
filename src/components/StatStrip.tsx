import { useLocale } from '../i18n/LocaleProvider'

const stats = [
  { value: '240', key: 'stats.cards' },
  { value: '06', key: 'stats.bosses' },
  { value: '12', key: 'stats.oaths' },
  { value: '10', key: 'stats.levels' },
] as const

export function StatStrip() {
  const { t } = useLocale()

  return (
    <section aria-label={t('stats.label')} className="stat-strip">
      {stats.map((stat) => (
        <div key={stat.key}>
          <strong>{stat.value}</strong>
          <span>{t(stat.key)}</span>
        </div>
      ))}
    </section>
  )
}
