import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const [sourceArgument, outputArgument] = process.argv.slice(2)

if (!sourceArgument) {
  throw new Error(
    'Usage: node tools/import-illustrations.mjs "<source illustration folder>" [output folder]',
  )
}

const sourceDirectory = path.resolve(sourceArgument)
const outputDirectory = path.resolve(
  outputArgument ?? path.join('public', 'images', 'cards'),
)
const manifestPath = path.resolve('src', 'data', 'illustrations.json')

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function findImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const images = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      images.push(...(await findImages(fullPath)))
    } else if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)) {
      images.push(fullPath)
    }
  }

  return images.sort((left, right) =>
    path.basename(left).localeCompare(path.basename(right), 'fr'),
  )
}

const files = await findImages(sourceDirectory)
if (files.length === 0) {
  throw new Error(`Aucune illustration trouvée dans ${sourceDirectory}`)
}

await mkdir(outputDirectory, { recursive: true })
const usedNames = new Map()
const manifest = []
const batchSize = 6

for (let offset = 0; offset < files.length; offset += batchSize) {
  const batch = files.slice(offset, offset + batchSize)
  const converted = await Promise.all(
    batch.map(async (sourcePath) => {
      const sourceName = path.basename(sourcePath, path.extname(sourcePath))
      const key = slugify(sourceName)
      const occurrence = (usedNames.get(key) ?? 0) + 1
      usedNames.set(key, occurrence)
      const outputName = `${key}${occurrence > 1 ? `-${occurrence}` : ''}.webp`
      const destinationPath = path.join(outputDirectory, outputName)

      await sharp(sourcePath)
        .rotate()
        .resize({
          width: 720,
          height: 720,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 84, effort: 5 })
        .toFile(destinationPath)

      return {
        name: sourceName,
        key,
        src: `/${path.posix.join(
          path.relative(path.resolve('public'), destinationPath).split(path.sep).join('/'),
        )}`,
      }
    }),
  )

  manifest.push(...converted)
  console.log(`Illustrations converties : ${manifest.length}/${files.length}`)
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Manifeste écrit : ${manifestPath}`)
