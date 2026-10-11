export type Card = {
  id: string
  deck: string
  type: string
  subtype: string
  name: string
  copy: string
  value: string
  text: string | null
  requirement: string | null
  levelGain: string
  opponentBonus: string
  loot: string
}

export type Illustration = {
  name: string
  key: string
  src: string
}
