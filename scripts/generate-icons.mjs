import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const GREEN = "#16a34a";

// Desenho da carteira (ícone "wallet" do Lucide, grade de 24x24)
const GLYPH =
  '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>' +
  '<path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>';

function buildSvg({ rounded, glyphPercent }) {
  const scale = (64 * glyphPercent) / 24;
  const offset = (64 - 24 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" ${rounded ? 'rx="14"' : ""} fill="${GREEN}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPH}</g>
</svg>`;
}

// "maskable" e iOS recortam as bordas por conta própria: fundo cheio e desenho menor,
// para nada importante ser cortado.
const targets = [
  { path: "public/icons/icon-192.png", size: 192, rounded: true, glyphPercent: 0.625 },
  { path: "public/icons/icon-512.png", size: 512, rounded: true, glyphPercent: 0.625 },
  { path: "public/icons/icon-maskable-512.png", size: 512, rounded: false, glyphPercent: 0.55 },
  { path: "src/app/apple-icon.png", size: 180, rounded: false, glyphPercent: 0.6 },
];

await mkdir("public/icons", { recursive: true });

for (const t of targets) {
  const svg = buildSvg(t);
  await sharp(Buffer.from(svg), { density: (72 * t.size) / 64 })
    .resize(t.size, t.size)
    .png()
    .toFile(t.path);
  console.log("gerado:", t.path);
}