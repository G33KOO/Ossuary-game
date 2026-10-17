import type { Card } from '../types/card'
import type { Locale } from './LocaleProvider'
import { cardContentEn, cardRequirementEn } from './cardContent.en'

const cardTypesEn: Record<string, string> = {
  Action: 'Action',
  'Artefact de classe': 'Class Artifact',
  Armure: 'Armor',
  Arme: 'Weapon',
  Boss: 'Boss',
  Classe: 'Class',
  Monstre: 'Monster',
  Race: 'Race',
  Serment: 'Oath',
  Butin: 'Loot',
  Esprit: 'Spirit',
  'Aide de jeu': 'Reference card',
}

const cardSubtypesEn: Record<string, string> = {
  Guerrier: 'Warrior',
  Druide: 'Druid',
  Chasseur: 'Hunter',
  Mage: 'Mage',
  Voleur: 'Rogue',
  Nécromancien: 'Necromancer',
  'Tour et équipement': 'Turns and Equipment',
  'Combat et Actions': 'Combat and Actions',
  'Taverne et Boss': 'Tavern and Bosses',
  Plastron: 'Chest Armor',
  Bottes: 'Boots',
  Gants: 'Gloves',
  Casque: 'Helmet',
  'Deux mains': 'Two-handed',
  'Une main': 'One-handed',
  'Artefact unique': 'Unique Artifact',
  'Recherche de pioche': 'Deck Search',
  Éveil: 'Awakening',
  'Échange Taverne': 'Tavern Trade',
  Bête: 'Beast',
  'Mort-vivant': 'Undead',
  Humanoïde: 'Humanoid',
  Démon: 'Demon',
  Fléau: 'Abomination',
  Automate: 'Construct',
  Serment: 'Oath',
}

const opponentBonusesEn: Record<string, string> = {
  '+1 contre les Nains': '+1 against Dwarves',
  '+1 contre les Revenants': '+1 against Revenants',
  '+1 contre les Humains': '+1 against Humans',
  '+1 contre les Vesskars': '+1 against Vesskars',
  '+1 contre les Elfes': '+1 against Elves',
  '+1 contre les Orcs': '+1 against Orcs',
}

export function localizeCard(card: Card, locale: Locale): Card {
  if (locale === 'fr') return card

  const translation = cardContentEn[card.name]

  return {
    ...card,
    name: translation?.name ?? card.name,
    type: cardTypesEn[card.type] ?? card.type,
    deck: cardTypesEn[card.deck] ?? card.deck,
    subtype: cardSubtypesEn[card.subtype] ?? card.subtype,
    text: translation?.text ?? card.text,
    requirement: card.requirement
      ? cardRequirementEn[card.requirement] ?? card.requirement
      : card.requirement,
    opponentBonus: opponentBonusesEn[card.opponentBonus] ?? card.opponentBonus,
  }
}

export function localizeCardType(type: string, locale: Locale) {
  return locale === 'en' ? cardTypesEn[type] ?? type : type
}

export function localizeCardSubtype(subtype: string, locale: Locale) {
  return locale === 'en' ? cardSubtypesEn[subtype] ?? subtype : subtype
}

export function localizeCardRequirement(requirement: string, locale: Locale) {
  return locale === 'en' ? cardRequirementEn[requirement] ?? requirement : requirement
}
