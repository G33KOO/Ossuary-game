import { CLASS_NAMES } from '../game/data'
import type { Card } from '../types/card'
import { assetUrl } from './assetUrl'
import { slugify } from './slugify'

export function getCardClass(entry: Card) {
  return CLASS_NAMES.find((name) =>
    (entry.type === 'Classe' && entry.name === name) ||
    (entry.requirement ?? '').includes(`Maîtrise ${name}`) ||
    (entry.requirement ?? '').includes(`Classe : ${name}`) ||
    entry.name === `Voie du ${name}`,
  )
}

export function getClassIcon(name: string) {
  return assetUrl(`/images/icons/classe-${slugify(name)}.webp`)
}
