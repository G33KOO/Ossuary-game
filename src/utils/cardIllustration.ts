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

export function getCardIllustration(name: string) {
  const key = slugify(name)
  return (
    illustrations.find((illustration) => illustration.key === key) ??
    illustrations.find((illustration) => illustration.key === `${key}-male`) ??
    illustrations.find((illustration) => new RegExp(`^${key}-?\\d+$`).test(illustration.key))
  )
}
