import sharp from 'sharp'

// The 300 dpi exports have their main frame 50 px from the edge.
// Keep 2 mm (24 px) outside that frame, removing the extra 26 px.
export async function withCardBleed(input) {
  const image = sharp(input)
  const { width, height } = await image.metadata()
  const inset = Math.round(26 * width / 750)
  return image.extract({ left: inset, top: inset, width: width - inset * 2, height: height - inset * 2 })
}
