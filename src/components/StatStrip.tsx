import { useLocale } from '../hooks/useLocale'
import { assetUrl } from '../utils/assetUrl'

const stats = [
  { value: '2–6', key: 'stats.players', icon: 'classe-guerrier' },
  { value: '60–90', key: 'stats.duration', icon: 'indicateur-niveau' },
  { value: '240', key: 'stats.cards', icon: 'indicateur-butin' },
  { value: '1', key: 'stats.winner', icon: 'monstre-demon' },
] as const

export function StatStrip() {
  const { t } = useLocale()

  return (
    <section aria-label={t('stats.label')} className="stat-strip">
      {stats.map((stat) => (
        <div key={stat.key}>
          <img alt="" height="48" src={assetUrl(`images/icons/${stat.icon}.webp`)} width="48" />
          <strong>{stat.value}</strong>
          <span>{t(stat.key)}</span>
        </div>
      ))}
    </section>
  )
}
