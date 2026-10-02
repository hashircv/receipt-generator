const MAX_LOGO_BYTES = 1_500_000
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  return false
}

export async function readLogoFile(file: File) {
  if (file.size > MAX_LOGO_BYTES) throw new Error('Use a logo under 1.5 MB')
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Use a PNG, JPEG, or WebP logo')
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!hasValidSignature(file.type, header)) throw new Error('The selected logo file is not a valid image')
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the selected logo'))
    reader.readAsDataURL(file)
  })
}
