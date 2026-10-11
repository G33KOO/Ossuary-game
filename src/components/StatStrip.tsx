import { useLocale } from '../i18n/LocaleProvider'
import { assetUrl } from '../utils/assetUrl'

const stats = [
  { value: '240', key: 'stats.cards', icon: 'indicateur-butin' },
  { value: '06', key: 'stats.bosses', icon: 'monstre-demon' },
  { value: '12', key: 'stats.oaths', icon: 'indicateur-puissance' },
  { value: '10', key: 'stats.levels', icon: 'indicateur-niveau' },
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
