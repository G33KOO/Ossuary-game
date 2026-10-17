import illustrationsData from '../data/illustrations.json'
import facesData from '../data/cardFaces.json'
import references from '../data/referenceCards.json'
import type { Illustration } from '../types/card'
import { slugify } from './slugify'

import { assetUrl } from './assetUrl'

const illustrations = (illustrationsData as Illustration[]).map((illustration) => ({
  ...illustration,
  src: assetUrl(illustration.src),
}))

export function getIllustrationByKey(key: string) {
  return illustrations.find((illustration) => illustration.key === key)
}

export type CardGender = 'male' | 'female'

type IllustratedCard = { id?: string; name: string; copy?: string; type?: string }
const faces: Record<string, { front: string; back: string }> = {
  ...facesData,
  ...Object.fromEntries(references.map((entry) => [entry.id, { front: entry.front, back: entry.back }])),
}

export function getCardBackIllustration(card: IllustratedCard) {
  return card.id && faces[card.id] ? assetUrl(faces[card.id].back) : undefined
}

/** Illustration d'une carte : exemplaire numéroté (copy) pour les doublons, genre pour les Races. */
export function getCardIllustration(card: IllustratedCard, gender: CardGender = 'male') {
  if (card.id && faces[card.id]) {
    return { name: card.name, key: `${slugify(card.name)}${gender === 'female' && card.type === 'Race' ? '-femelle' : ''}`, src: assetUrl(gender === 'female' && card.type === 'Race' ? faces[card.id].back : faces[card.id].front) }
  }
  const key = slugify(card.name)
  const find = (candidate: string) => illustrations.find((illustration) => illustration.key === candidate)
  const copy = card.copy && Number(card.copy) > 0 ? card.copy : ''

  return (
    (gender === 'female' ? find(`${key}-femelle`) : undefined) ??
    (copy ? find(`${key}${copy}`) : undefined) ??
    find(key) ??
    find(`${key}-male`) ??
    illustrations.find((illustration) => new RegExp(`^${key}-?\\d+$`).test(illustration.key))
  )
}

export function hasFemaleVariant(card: IllustratedCard) {
  return Boolean(getCardIllustration(card, 'female')?.key.endsWith('-femelle'))
}
