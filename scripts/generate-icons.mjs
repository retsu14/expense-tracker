import { mkdir, writeFile } from "node:fs/promises";

import sharp from "sharp";

const BG = "#141414";

const pig = (scale = 1, offset = 0) => `
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="M46 66 C36 38 42 22 54 24 C66 26 78 42 80 58 Z" fill="#F4A7B9"/>
    <path d="M53 57 C48 42 50 33 56 34 C62 35 69 45 70 53 Z" fill="#E8879E"/>
    <path d="M154 66 C164 38 158 22 146 24 C134 26 122 42 120 58 Z" fill="#F4A7B9"/>
    <path d="M147 57 C152 42 150 33 144 34 C138 35 131 45 130 53 Z" fill="#E8879E"/>
    <ellipse cx="100" cy="112" rx="72" ry="65" fill="#F4A7B9"/>
    <ellipse cx="72" cy="74" rx="18" ry="9" fill="#fff" opacity="0.28" transform="rotate(-24 72 74)"/>
    <ellipse cx="52" cy="120" rx="12" ry="7" fill="#E8879E" opacity="0.6"/>
    <ellipse cx="148" cy="120" rx="12" ry="7" fill="#E8879E" opacity="0.6"/>
    <ellipse cx="74" cy="98" rx="7" ry="9" fill="#2b1d22"/>
    <circle cx="76.5" cy="94.5" r="2.6" fill="#fff"/>
    <ellipse cx="126" cy="98" rx="7" ry="9" fill="#2b1d22"/>
    <circle cx="128.5" cy="94.5" r="2.6" fill="#fff"/>
    <ellipse cx="100" cy="124" rx="23" ry="16" fill="#E8879E"/>
    <ellipse cx="92" cy="124" rx="3.6" ry="5.2" fill="#8a3f52"/>
    <ellipse cx="108" cy="124" rx="3.6" ry="5.2" fill="#8a3f52"/>
    <path d="M89 145 Q100 155 111 145" stroke="#8a3f52" stroke-width="3" stroke-linecap="round" fill="none"/>
  </g>`;

const svg = ({ size, padding, rounded, background = true }) => {
  const inner = size - padding * 2;
  const scale = inner / 200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background ? `<rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${BG}"/>` : ""}
    ${pig(scale, padding)}
  </svg>`;
};

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, padding: 18, rounded: false },
  { file: "public/icons/icon-512.png", size: 512, padding: 48, rounded: false },
  { file: "public/icons/maskable-512.png", size: 512, padding: 110, rounded: false },
  { file: "public/icons/badge-96.png", size: 96, padding: 6, rounded: false, background: false },
  { file: "src/app/apple-icon.png", size: 180, padding: 18, rounded: false },
];

await mkdir("public/icons", { recursive: true });
for (const o of outputs) {
  await sharp(Buffer.from(svg(o)))
    .png()
    .toFile(o.file);
  console.log("wrote", o.file);
}
await writeFile("src/app/icon.svg", svg({ size: 64, padding: 2, rounded: true }).trim());
console.log("wrote src/app/icon.svg");
