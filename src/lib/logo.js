const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024
const MAX_SIDE = 480

// Logo dibaca ulang lewat canvas: hanya piksel yang dipakai, tanpa metadata atau skrip.
// SVG sengaja tidak diizinkan. Hasil selalu PNG skala abu-abu agar cetakan hitam-putih konsisten.
export async function processLogo(file, hard = false) {
  if (!ALLOWED.includes(file.type)) throw new Error('Format logo harus PNG, JPG, atau WebP.')
  if (file.size > MAX_BYTES) throw new Error('Ukuran logo maksimal 2 MB.')

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('File logo tidak bisa dibaca. Coba file lain.')
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    const v = hard ? (lum < 165 ? 0 : 255) : Math.min(255, Math.max(0, (lum - 128) * 1.25 + 128))
    px[i] = px[i + 1] = px[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}
