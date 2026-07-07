/** Сжатие фото на клиенте: длинная сторона ≤ 1280px, JPEG ~0.7 → обычно 150–300 КБ */
export async function compressPhoto(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const maxSide = 1280
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.7),
  )
  if (!blob) throw new Error('compressPhoto: canvas.toBlob failed')
  return blob
}
