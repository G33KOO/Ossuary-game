import { fill } from '../content/solo'

export function BossEnrage({ count, sim, className = '' }: { count: number; sim: Record<string, string>; className?: string }) {
  return <div className={`gb-boss-enrage ${count > 0 ? 'is-active' : ''} ${className}`} role="status" title={sim.timelineEnrageRule}>
    <span>{sim.bossEnrageLabel}</span>
    <strong key={count}>{fill(sim.bossEnrageBonus, { n: count })}</strong>
    <small>{fill(sim.bossStartingHand, { n: 5 + count })}</small>
  </div>
}
