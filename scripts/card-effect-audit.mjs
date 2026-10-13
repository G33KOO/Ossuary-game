import fs from 'node:fs/promises'

const cards = JSON.parse(await fs.readFile('src/data/cards.json', 'utf8'))
const engine = await fs.readFile('src/game/engine.ts', 'utf8')
const power = await fs.readFile('src/game/power.ts', 'utf8')
const data = await fs.readFile('src/game/data.ts', 'utf8')
const oaths = await fs.readFile('src/game/oaths.ts', 'utf8')
const excludedSection = data.slice(data.indexOf('export const SOLO_EXCLUDED_ACTIONS'), data.indexOf('export const COMBAT_ONLY_ACTIONS'))
const excludedActions = new Set([...excludedSection.matchAll(/'([^']+)'/g)].map((match) => match[1]))
const soloOaths = new Set([...oaths.matchAll(/'OSS-CARD-\d+'/g)].map((match) => match[0].slice(1, -1)))
const fieldMonsters = new Set(['Reliquaire', 'Vigile', 'Inachevé', 'Sans-Maître'])
function inspect(card) {
  if (card.type === 'Action' && excludedActions.has(card.name) || card.type === 'Serment' && !soloOaths.has(card.id)) return ['Multijoueur : exclue du solo', 'Catalogue uniquement']
  if (card.type === 'Classe') return [card.name === 'Voleur' ? 'Adaptation solo : choix d’un Butin parmi cinq' : 'Actif de classe + coût + choix', 'Choix, dé, puissance ou pioche']
  if (card.type === 'Race') return ['Passif : main, dé, armes, pioche, serments ou fuite', 'Puissance, dé, choix ou pioche']
  if (card.type === 'Armure') return ['Puissance imprimée, emplacement et doublement', 'Valeur dorée + puissance']
  if (card.type === 'Artefact de classe') return ['Niveau 10 + classe requise + amélioration de l’actif', 'Actif, dé, choix ou pioche']
  if (card.type === 'Arme') {
    if (card.text && !engine.includes(card.name) && !power.includes(card.name)) throw new Error(`Weapon effect missing: ${card.name}`)
    return [card.text ? 'Effet spécial + emplacement + puissance' : 'Emplacement + maîtrise ×2 + bonus de race', 'Halo, puissance, sacrifice ou pioche']
  }
  if (card.type === 'Action') {
    if (!card.name.startsWith('Voie du ') && !engine.includes(`case '${card.name}'`)) throw new Error(`Action missing: ${card.name}`)
    return ['Action solo : condition, coût, cible et effet', 'Animation depuis la main vers la cible']
  }
  if (card.type === 'Monstre') {
    if (card.name === 'Usurpateur') return ['Adaptation solo : Butins standards, aucun vol de main adverse', 'Pioche et récompense']
    if (!fieldMonsters.has(card.name) && !engine.includes(card.name)) throw new Error(`Monster missing: ${card.name}`)
    return [fieldMonsters.has(card.name) ? 'Récompenses imprimées + révélation des Butins' : 'Début, restriction, choix ou conséquence de combat', 'Révélation, effet à côté de la carte, dé ou choix']
  }
  if (card.type === 'Boss') {
    if (!engine.includes(card.name)) throw new Error(`Boss missing: ${card.name}`)
    return ['Préparation solo et réactions selon les priorités du Boss', 'Pioche, préparation, cartes jouées et étape Suivant']
  }
  if (card.type === 'Serment') return ['Condition d’accomplissement + récompense permanente', 'Carte et bonus célébrés avant de continuer']
  throw new Error(`Unclassified type: ${card.type}`)
}
const rows = cards.map((card) => ({ card, behavior: inspect(card) }))
const excluded = rows.filter((row) => row.behavior[0].startsWith('Multijoueur'))
const text = `# Audit des effets de cartes

Le catalogue contient ${cards.length} cartes physiques. Chaque copie est classée ci-dessous ; les doublons partagent leur comportement. Cet inventaire vérifie le raccordement au moteur, pas une preuve exhaustive de toutes les combinaisons possibles.

## Périmètre solo

${cards.length - excluded.length} cartes sont utilisables ou adaptées au solo ; ${excluded.length} copies demandent des interactions entre joueurs et restent exclues des pioches solo. Les 14 Actions multijoueur et les 4 Serments multijoueur sont visibles dans le catalogue. Le Voleur et l’Usurpateur utilisent les adaptations solo indiquées ci-dessous. Le Boss suit les priorités définies dans les règles solo ; il ne reproduit pas un joueur humain pour toutes les Actions de sa main.

## Vérification

- engine.test.ts : parties complètes déterministes, conservation des cartes, ordre des réactions, équipement et navigation de la Taverne.
- effects.test.ts : toutes les Armures, Armes maîtrisées et Actions utilisables en solo, effets spéciaux d’Armes, restrictions et choix de Monstres, classes, races et effets persistants.
- oaths.test.ts : les 8 Serments compatibles solo, leurs conditions et leurs bonus.
- scripts/browser-qa.mjs : navigateur isolé, géométrie du plateau, pages, fiche mobile, centrage et retour de Taverne.

## Inventaire

| Carte | Nom | Comportement | Présentation |
| --- | --- | --- | --- |
${rows.map(({card,behavior})=>`| ${card.id} | ${card.name} | ${behavior[0]} | ${behavior[1]} |`).join('\n')}
`
await fs.mkdir('docs', { recursive: true })
await fs.writeFile('docs/card-effects.md', text)
console.log(JSON.stringify({ total: cards.length, solo: cards.length-excluded.length, multiplayerOnlyCopies: excluded.length, report: 'docs/card-effects.md' }))
