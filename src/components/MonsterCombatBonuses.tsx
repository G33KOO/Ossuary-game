import type { GameState } from '../game/types'
import { CARDS, card } from '../game/data'
import { computePower, monsterRaceBonus } from '../game/power'
import { combatRewards } from '../game/combatRewards'
import type { Locale } from '../i18n/LocaleProvider'
import { localizeCard } from '../i18n/cardTranslations'

export function MonsterCombatBonuses({ game, id, locale, compact = false }: { game: GameState; id: string; locale: Locale; compact?: boolean }) {
  const combat = game.combat
  if (!combat || combat.kind !== 'monster') return null
  const fr = locale === 'fr'
  const raceBonus = monsterRaceBonus(game, id)
  const raceCard = CARDS.find(entry => entry.type === 'Race' && entry.name === game.race)
  const raceName = raceCard ? localizeCard(raceCard, locale).name : game.race
  const power = computePower(game)
  const rewards = combatRewards(combat, Boolean(power && power.player.total === power.opponent.total))
  const first = !compact && combat.monsters[0] === id
  const changedLoot = rewards.multiplier > 1 || combat.forgoLoot || rewards.tieLoot > 0 || rewards.sporule
  if (!raceBonus && !(first && changedLoot)) return null
  return <div className="gb-combat-bonuses" aria-live="polite">
    {raceBonus ? <span className="gb-combat-bonus is-negative" title={fr ? `${card(id).name} gagne ${raceBonus} puissance contre votre race. Ce bonus est inclus dans sa puissance totale.` : `${card(id).name} gains ${raceBonus} power against your race. This is included in its total power.`}>+{raceBonus} {fr ? 'contre' : 'against'} {raceName}</span> : null}
    {first && combat.lootMultiplier > 1 ? <span key={`greed-${combat.lootMultiplier}`} className="gb-combat-bonus" title={fr ? 'Cupidité réussie : ce multiplicateur est appliqué au butin de la victoire.' : 'Successful Greed: this multiplier applies to victory loot.'}>{fr ? 'Cupidité' : 'Greed'} · ×{combat.lootMultiplier}</span> : null}
    {first && rewards.immaculate ? <span className="gb-combat-bonus">{fr ? 'Immaculée · Butin ×2 (dé : 6)' : 'Immaculate · Loot ×2 (die: 6)'}</span> : null}
    {first && rewards.tieLoot > 0 ? <span className="gb-combat-bonus">{fr ? 'Cisailleur · +1 Butin (égalité)' : 'Shearer · +1 Loot (tie)'}</span> : null}
    {first && changedLoot ? <span className={`gb-combat-bonus${combat.forgoLoot ? ' is-negative' : ''}`} title={fr ? 'Récompense calculée avec les effets actifs. Les jets et choix après la victoire peuvent encore ajouter du butin.' : 'Reward calculated with active effects. Post-victory rolls and choices may add more loot.'}><img alt="" src={`${import.meta.env.BASE_URL}images/icons/indicateur-butin.webp`} />{rewards.sporule ? fr ? 'Sporule · récompense à choisir' : 'Sporule · choose your reward' : combat.forgoLoot ? fr ? 'Butin perdu · 0' : 'Loot forfeited · 0' : fr ? `Butin de victoire : ${rewards.loot}` : `Victory loot: ${rewards.loot}`}</span> : null}
  </div>
}
