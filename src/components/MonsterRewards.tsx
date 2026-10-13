import type { Card } from '../types/card'
import type { Locale } from '../i18n/LocaleProvider'

export function MonsterRewards({ card, locale }: { card: Card; locale: Locale }) {
  if (card.type !== 'Monstre') return null
  const levels = locale === 'fr' ? 'Niveaux gagnés en cas de victoire' : 'Levels gained on victory'
  const loot = locale === 'fr' ? 'Butins gagnés en cas de victoire' : 'Loot gained on victory'
  return <span className="gb-monster-rewards">
    <span title={`${levels} : ${card.levelGain || 0}`} aria-label={`${levels} : ${card.levelGain || 0}`}><img alt="" src={`${import.meta.env.BASE_URL}images/icons/indicateur-niveau.webp`} /><strong>{card.levelGain || 0}</strong></span>
    <span title={`${loot} : ${card.loot || 0}`} aria-label={`${loot} : ${card.loot || 0}`}><img alt="" src={`${import.meta.env.BASE_URL}images/icons/indicateur-butin.webp`} /><strong>{card.loot || 0}</strong></span>
  </span>
}
