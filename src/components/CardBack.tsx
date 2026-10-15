import { cardBackArt } from '../utils/cardBack'
import type { CardBackKind } from '../utils/cardBack'
import '../styles/card-back.css'

export function CardBack({ kind, size = 'md' }: { kind: CardBackKind; size?: 'sm' | 'md' | 'lg' }) {
  const illustration = cardBackArt[kind]
  return (
    <span aria-hidden="true" className={`gb-back kind-${kind} size-${size}${illustration ? ' has-illustration' : ''}`}>
      {illustration ? <img alt="" src={illustration} draggable={false} /> : <span>{kind === 'loot' ? '✦' : kind === 'monster' ? '☠' : '♜'}</span>}
    </span>
  )
}
