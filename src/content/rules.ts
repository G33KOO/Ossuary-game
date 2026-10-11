import type { Locale } from '../i18n/LocaleProvider'
import { rulesEn } from './rules.en'
import { rulesFr } from './rules.fr'
import type { RulesContent } from './rules.types'

const rulesByLocale: Record<Locale, RulesContent> = { fr: rulesFr, en: rulesEn }

export function getRules(locale: Locale) {
  return rulesByLocale[locale]
}
