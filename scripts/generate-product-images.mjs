import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceFiles = [1, 2, 3, 4, 5].map((n) => path.join(root, "prisma", `productos-0${n}.json`));
const outputDir = path.join(root, "public", "images", "productos");

const categoryLooks = {
  limpiadores: { bg: "#DDECEE", accent: "#3F7C82", vessel: "tube" },
  "tonicos-esencias": { bg: "#E1EEE7", accent: "#4F826C", vessel: "bottle" },
  serums: { bg: "#EEE5F0", accent: "#8A638B", vessel: "dropper" },
  hidratantes: { bg: "#E8ECDF", accent: "#687E4A", vessel: "jar" },
  "protectores-solares": { bg: "#F5EAC7", accent: "#C08A32", vessel: "tube" },
  mascarillas: { bg: "#F2E0E5", accent: "#A95F75", vessel: "jar" },
  exfoliantes: { bg: "#F4E2D5", accent: "#B26B42", vessel: "bottle" },
  "contornos-ojos": { bg: "#E4E5F0", accent: "#62698F", vessel: "tube" },
  "tratamientos-acne": { bg: "#E1ECE2", accent: "#52775A", vessel: "tube" },
  "tratamientos-antiedad": { bg: "#EEE2DC", accent: "#9A6457", vessel: "dropper" },
};

const brandTints = {
  cosrx: "#F4EEE1",
  anua: "#E8F0E8",
  "beauty-of-joseon": "#EEE8DC",
  isntree: "#E8EFE7",
  innisfree: "#E5EFE4",
  laneige: "#E5EEF4",
  "la-roche-posay": "#E7EFF3",
  loreal: "#F1E6E3",
  medicube: "#F2E6E8",
  neutrogena: "#E6EEF4",
  "round-lab": "#E5EEF1",
  skin1004: "#EEE9DE",
  torriden: "#E2EFF0",
};

const esc = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
const titleCase = (value) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

function lines(text, limit = 21) {
  const words = text.split(/\s+/);
  const result = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > limit && current) {
      result.push(current);
      current = word;
    } else current = `${current} ${word}`.trim();
  }
  if (current) result.push(current);
  return result.slice(0, 3);
}

function label(product, x, y, width, dark = false) {
  const nameLines = lines(product.nombre, Math.max(14, Math.floor(width / 7)));
  const color = dark ? "#FFFFFF" : "#24352C";
  const brand = esc(titleCase(product.marca));
  return `
    <text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${color}" opacity=".76">${brand.toUpperCase()}</text>
    <line x1="${x - width / 3}" y1="${y + 13}" x2="${x + width / 3}" y2="${y + 13}" stroke="${color}" opacity=".22"/>
    ${nameLines.map((line, i) => `<text x="${x}" y="${y + 39 + i * 21}" text-anchor="middle" font-family="Georgia, serif" font-size="15" font-weight="700" fill="${color}">${esc(line)}</text>`).join("\n")}
    <text x="${x}" y="${y + 116}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" letter-spacing="1.5" fill="${color}" opacity=".62">GLASSKIN SELECTION</text>`;
}

function vessel(product, look, tint) {
  const commonShadow = `<ellipse cx="320" cy="505" rx="132" ry="20" fill="#26352D" opacity=".12"/>`;
  if (look.vessel === "jar") return `${commonShadow}
    <rect x="194" y="272" width="252" height="53" rx="15" fill="${look.accent}"/>
    <path d="M210 325h220v139c0 24-19 43-43 43H253c-24 0-43-19-43-43V325Z" fill="#FFFEFA" stroke="#FFFFFF" stroke-width="5"/>
    <rect x="218" y="340" width="204" height="137" rx="18" fill="${tint}"/>
    ${label(product, 320, 365, 190)}`;
  if (look.vessel === "dropper") return `${commonShadow}
    <rect x="270" y="111" width="100" height="84" rx="22" fill="${look.accent}"/>
    <rect x="286" y="178" width="68" height="45" rx="10" fill="#D9D4C9"/>
    <path d="M231 246c0-19 15-34 34-34h110c19 0 34 15 34 34v219c0 25-20 45-45 45h-88c-25 0-45-20-45-45V246Z" fill="#FFFEFA" stroke="#FFFFFF" stroke-width="5"/>
    <rect x="248" y="267" width="144" height="210" rx="18" fill="${tint}"/>
    ${label(product, 320, 303, 134)}`;
  if (look.vessel === "bottle") return `${commonShadow}
    <rect x="253" y="120" width="134" height="74" rx="12" fill="${look.accent}"/>
    <rect x="240" y="181" width="160" height="320" rx="28" fill="#FFFEFA" stroke="#FFFFFF" stroke-width="5"/>
    <rect x="257" y="211" width="126" height="254" rx="15" fill="${tint}"/>
    ${label(product, 320, 253, 116)}`;
  return `${commonShadow}
    <path d="M225 166h190l-15 307c-1 24-21 43-45 43h-70c-24 0-44-19-45-43l-15-307Z" fill="#FFFEFA" stroke="#FFFFFF" stroke-width="5"/>
    <rect x="247" y="204" width="146" height="239" rx="12" fill="${tint}"/>
    <rect x="250" y="494" width="140" height="42" rx="8" fill="${look.accent}"/>
    ${label(product, 320, 249, 136)}`;
}

function makeSvg(product) {
  const look = categoryLooks[product.categoria] ?? categoryLooks.hidratantes;
  const tint = brandTints[product.marca] ?? "#ECF0E9";
  const scale = { jar: 2, dropper: 1.3, bottle: 1.45, tube: 1.45 }[look.vessel] ?? 1.4;
  const anchorY = look.vessel === "jar" ? 390 : 400;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="720" viewBox="0 0 640 720" role="img" aria-labelledby="title desc">
  <title id="title">${esc(product.nombre)} de ${esc(titleCase(product.marca))}</title>
  <desc id="desc">Ilustración editorial del envase de ${esc(product.nombre)}</desc>
  <rect width="640" height="720" fill="#FFFFFF"/>
  <g transform="translate(320 ${anchorY}) scale(${scale}) translate(-320 -${anchorY})">${vessel(product, look, tint)}</g>
</svg>`;
}

fs.mkdirSync(outputDir, { recursive: true });
const products = sourceFiles.flatMap((file) => JSON.parse(fs.readFileSync(file, "utf8")));
for (const product of products) {
  fs.writeFileSync(path.join(outputDir, `${product.slug}.svg`), makeSvg(product), "utf8");
}
console.log(`Generated ${products.length} product images in ${outputDir}`);
