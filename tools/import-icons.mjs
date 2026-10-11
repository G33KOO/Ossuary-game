import { readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const src = process.argv[2]
for (const f of await readdir(src)) {
  if (!f.endsWith('.png')) continue
  await sharp(path.join(src, f)).resize(256, 256, { fit: 'inside' }).webp({ quality: 85 }).toFile(path.join('public/images/icons', f.replace('.png', '.webp').replace(/_/g, '-')))
}
