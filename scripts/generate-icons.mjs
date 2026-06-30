// Generates PWA + Apple icons from inline SVG sources using sharp.
// Run with: npm run icons
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')

// Rounded "squircle" icon, transparent corners — used for standard PWA icons.
const rounded = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38bdf8"/>
      <stop offset="1" stop-color="#0284c7"/>
    </linearGradient>
    <mask id="crescent">
      <rect width="512" height="512" fill="black"/>
      <circle cx="238" cy="262" r="132" fill="white"/>
      <circle cx="292" cy="236" r="120" fill="black"/>
    </mask>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#bg)"/>
  <rect width="512" height="512" fill="#ffffff" mask="url(#crescent)"/>
  <path d="M348 150 l12 30 l30 12 l-30 12 l-12 30 l-12 -30 l-30 -12 l30 -12 z" fill="#ffffff"/>
</svg>`

// Full-bleed icon (no transparent corners), crescent kept within the maskable
// safe zone — used for Apple touch icon and the maskable PWA icon.
const fullBleed = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38bdf8"/>
      <stop offset="1" stop-color="#0284c7"/>
    </linearGradient>
    <mask id="crescent">
      <rect width="512" height="512" fill="black"/>
      <circle cx="244" cy="266" r="104" fill="white"/>
      <circle cx="288" cy="244" r="95" fill="black"/>
    </mask>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="#ffffff" mask="url(#crescent)"/>
  <path d="M336 178 l10 25 l25 10 l-25 10 l-10 25 l-10 -25 l-25 -10 l25 -10 z" fill="#ffffff"/>
</svg>`

const targets = [
  { svg: rounded, size: 192, file: 'pwa-192x192.png' },
  { svg: rounded, size: 512, file: 'pwa-512x512.png' },
  { svg: fullBleed, size: 512, file: 'maskable-512x512.png' },
  { svg: fullBleed, size: 180, file: 'apple-touch-icon.png' },
]

await Promise.all(
  targets.map(({ svg, size, file }) =>
    sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(resolve(publicDir, file))
      .then(() => console.log(`✓ ${file} (${size}×${size})`)),
  ),
)

console.log('Icons generated in public/.')
