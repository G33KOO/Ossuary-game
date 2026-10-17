import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { withCardBleed } from './card-bleed.mjs'

// Usage: node tools/import-finished-cards.mjs <export directory> <rendered page 11 PNG>
const [source, page11] = process.argv.slice(2)
if (!source || !page11) throw new Error('Supply the export directory and rendered page 11 PNG.')
const cards = JSON.parse(await fs.readFile('src/data/cards.json', 'utf8'))
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const out = 'public/images/finished-cards'
await fs.mkdir(out, { recursive: true })
const faces = {}
const illustrations = []
const files = await fs.readdir(path.join(source, "Cartes à l'unité", 'Recto'))
const page = await sharp(page11).metadata()
for (const card of cards) {
  const number = card.id.slice(-3)
  const file = files.find((f) => f.startsWith(`${number}_`))
  const front = `${out}/${number}-recto.webp`
  const back = `${out}/${number}-verso.webp`
  if (file) {
    await (await withCardBleed(path.join(source, "Cartes à l'unité", 'Recto', file))).webp({ quality: 92 }).toFile(front)
    const backInput = path.join(source, "Cartes à l'unité", 'Verso', file)
    await (card.type === 'Race' ? await withCardBleed(backInput) : sharp(backInput)).webp({ quality: 92 }).toFile(back)
  } else {
    if (+number < 91 || +number > 99) throw new Error(`Missing export: ${card.id}`)
    // Include the complete printed frames from the A4 sheet at 2480 px wide.
    const index = +number - 91
    const scale = page.width / 2480
    const recovered = await sharp(page11).extract({ left: Math.round((27 + index % 3 * 810) * scale), top: Math.round((90 + Math.floor(index / 3) * 1107) * scale), width: Math.round(806 * scale), height: Math.round(1107 * scale) }).resize(750, 1050).png().toBuffer()
    await (await withCardBleed(recovered)).webp({ quality: 92 }).toFile(front)
    await fs.copyFile(`${out}/088-verso.webp`, back)
  }
  faces[card.id] = { front: `/images/finished-cards/${number}-recto.webp`, back: `/images/finished-cards/${number}-verso.webp` }
  const key = slug(card.name)
  illustrations.push({ name: card.name, key: `${key}${card.copy}`, src: faces[card.id].front })
  if (!illustrations.some((i) => i.key === key)) illustrations.push({ name: card.name, key, src: faces[card.id].front })
  if (card.type === 'Race') illustrations.push({ name: `${card.name} femelle`, key: `${key}-femelle`, src: faces[card.id].back })
}
const aids = []
for (const file of files.filter((f) => f.startsWith('A'))) {
  const id = file.slice(0, 3)
  for (const side of ['Recto', 'Verso']) await (await withCardBleed(path.join(source, "Cartes à l'unité", side, file))).webp({ quality: 92 }).toFile(`${out}/${id}-${side.toLowerCase()}.webp`)
  aids.push({ id, name: file.slice(4, -4), front: `/images/finished-cards/${id}-recto.webp`, back: `/images/finished-cards/${id}-verso.webp` })
}
for (const [deck, name] of [['Butin', 'butin'], ['Monstre', 'monstre'], ['Boss', 'boss'], ['Serment', 'serment'], ['Classe', 'classe']]) {
  const card = cards.find((c) => c.deck === deck)
  await fs.copyFile(`public${faces[card.id].back}`, `public/images/card-backs/${name}.webp`)
}
await fs.writeFile('src/data/cardFaces.json', JSON.stringify(faces, null, 2) + '\n')
await fs.writeFile('src/data/illustrations.json', JSON.stringify(illustrations, null, 2) + '\n')
await fs.writeFile('src/data/referenceCards.json', JSON.stringify(aids, null, 2) + '\n')
console.log(`Imported ${cards.length} cards and ${aids.length} reference cards, both sides.`)
