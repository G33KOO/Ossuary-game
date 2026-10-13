import type { DiceRoll } from '../game/types'
import { Die } from './game-ui'

export function DiceResults({ roll, value = roll?.total ?? null, sides = roll?.sides ?? 6, count = roll?.raw.length ?? 1, rolling = false, modifier = roll?.bonus ?? 0, compact = false, sim }: {
  roll?: DiceRoll
  value?: number | null
  sides?: number
  count?: number
  rolling?: boolean
  modifier?: number
  compact?: boolean
  sim: Record<string, string>
}) {
  const tone = modifier > 0 ? 'positive' : modifier < 0 ? 'negative' : undefined
  const multiple = count > 1
  return <div className={`gb-dice-results${compact ? ' is-compact' : ''}`}>
    <div className="gb-dice-faces">
      {Array.from({ length: count }, (_, index) => <Die key={index} sides={sides} value={multiple ? roll?.raw[index] ?? null : value} rolling={rolling} label="" tone={tone} />)}
      {multiple ? <strong className="gb-dice-combined" title={roll?.mode === 'lowest' ? sim.dieLowest : sim.dieSum}>{rolling ? '?' : value ?? '—'}</strong> : null}
    </div>
    {roll && !compact && !rolling ? <p className="gb-dice-calculation">{sim.dieNatural} : {roll.raw.join(roll.mode === 'sum' ? ' + ' : ', ')}{roll.mode === 'lowest' ? ` · ${sim.dieLowest}` : ''}{roll.bonus ? ` · ${sim.dieModifiers} ${roll.bonus > 0 ? '+' : ''}${roll.bonus}` : ''}{value !== roll.total && value !== null ? ` · ${sim.dieModifiers} ${value - roll.total > 0 ? '+' : ''}${value - roll.total}` : ''} = <strong>{value}</strong></p> : null}
  </div>
}
