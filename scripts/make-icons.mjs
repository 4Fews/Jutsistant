// Membuat ikon PWA tanpa dependency apa pun (encoder PNG kecil + zlib bawaan Node).
// Jalankan ulang kapan saja: npm run icons
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

const BG = [0xc2, 0x51, 0x2c] // terracotta
const FG = [0xfd, 0xf6, 0xee] // krem

// ---------- encoder PNG ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePNG(size, rgba) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- gambar: planet + cincin orbit ----------
// Mengembalikan [r,g,b,a] untuk satu titik (koordinat 0..1).
function sample(x, y, opts) {
  const { rounded, scale } = opts
  // latar
  let inBg = true
  if (rounded) {
    const r = 0.22
    const dx = Math.max(r - x, x - (1 - r), 0)
    const dy = Math.max(r - y, y - (1 - r), 0)
    inBg = dx * dx + dy * dy <= r * r
  }
  if (!inBg) return [0, 0, 0, 0]

  // koordinat relatif pusat, diskalakan untuk safe-zone maskable
  const ux = (x - 0.5) / scale
  const uy = (y - 0.5) / scale

  // cincin: elips miring -20 derajat
  const th = (-20 * Math.PI) / 180
  const cu = ux * Math.cos(th) - uy * Math.sin(th)
  const cv = ux * Math.sin(th) + uy * Math.cos(th)
  const a = 0.4, b = 0.155, w = 0.03
  const outer = (cu / (a + w)) ** 2 + (cv / (b + w)) ** 2
  const inner = (cu / (a - w)) ** 2 + (cv / (b - w)) ** 2
  const onRing = outer <= 1 && inner >= 1

  const d = Math.hypot(ux, uy)
  if (d <= 0.2) return [...FG, 255]        // planet
  if (d <= 0.235) return [...BG, 255]      // celah pemisah
  if (onRing) return [...FG, 255]          // cincin
  return [...BG, 255]
}

function render(size, opts) {
  const buf = Buffer.alloc(size * size * 4)
  const S = 3 // supersampling 3x3 untuk tepi halus
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, bl = 0, al = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const [cr, cg, cb, ca] = sample((px + (sx + 0.5) / S) / size, (py + (sy + 0.5) / S) / size, opts)
          const w = ca / 255
          r += cr * w; g += cg * w; bl += cb * w; al += ca
        }
      }
      const n = S * S
      const aAvg = al / n
      const wSum = al / 255 || 1
      const i = (py * size + px) * 4
      buf[i] = Math.round(r / wSum)
      buf[i + 1] = Math.round(g / wSum)
      buf[i + 2] = Math.round(bl / wSum)
      buf[i + 3] = Math.round(aAvg)
    }
  }
  return encodePNG(size, buf)
}

const out = path.resolve(import.meta.dirname, '..', 'public')
fs.mkdirSync(out, { recursive: true })
const files = [
  ['icon-192.png', 192, { rounded: true, scale: 1 }],
  ['icon-512.png', 512, { rounded: true, scale: 1 }],
  ['icon-maskable-512.png', 512, { rounded: false, scale: 1.45 }], // mark lebih kecil = aman dari crop
  ['apple-touch-icon.png', 180, { rounded: false, scale: 1 }],
]
for (const [name, size, opts] of files) {
  fs.writeFileSync(path.join(out, name), render(size, opts))
  console.log('dibuat:', name, `${size}x${size}`)
}

fs.writeFileSync(
  path.join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#C2512C"/>
  <ellipse cx="32" cy="32" rx="25.6" ry="9.9" fill="none" stroke="#FDF6EE" stroke-width="3.8" transform="rotate(-20 32 32)"/>
  <circle cx="32" cy="32" r="15" fill="#C2512C"/>
  <circle cx="32" cy="32" r="12.8" fill="#FDF6EE"/>
</svg>
`,
)
console.log('dibuat: favicon.svg')

fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
console.log('dibuat: robots.txt (noindex)')
