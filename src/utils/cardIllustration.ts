import illustrationsData from '../data/illustrations.json'
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

type IllustratedCard = { name: string; copy?: string; type?: string }

/** Illustration d'une carte : exemplaire numéroté (copy) pour les doublons, genre pour les Races. */
export function getCardIllustration(card: IllustratedCard, gender: CardGender = 'male') {
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
