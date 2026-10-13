export const CARD_SYMBOLS: Record<string, string> = {
  Arme: '⚔', Armure: '⬡', Action: '✧', Monstre: '☠', Boss: '♜',
  'Artefact de classe': '✦', Serment: '✳', Classe: '◈', Race: '◈',
}
export function symbolFor(type: string) { return CARD_SYMBOLS[type] ?? '✦' }
