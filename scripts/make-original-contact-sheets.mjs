import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.join(process.cwd(), "import-images");
const images = (await fs.readdir(root)).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort();
const output = path.join(process.cwd(), "reports", "original-contact-sheets");
await fs.mkdir(output, { recursive: true });
for (let batch = 0; batch < Math.ceil(images.length / 20); batch++) {
  const subset = images.slice(batch * 20, batch * 20 + 20);
  const cells = await Promise.all(subset.map(async (name) => {
    const img = await sharp(path.join(root, name)).resize(150, 180, { fit: "contain", background: "white" }).png().toBuffer();
    const label = path.basename(name, path.extname(name)).slice(0, 24);
    const svg = Buffer.from(`<svg width="180" height="215"><rect width="180" height="215" fill="#fff"/><text x="6" y="207" font-family="Arial" font-size="9" fill="#333">${label}</text></svg>`);
    return sharp(svg).composite([{ input: img, left: 15, top: 4 }]).png().toBuffer();
  }));
  const composites = cells.map((input, i) => ({ input, left: (i % 4) * 180, top: Math.floor(i / 4) * 215 }));
  await sharp({ create: { width: 720, height: Math.ceil(cells.length / 4) * 215, channels: 3, background: "white" } })
    .composite(composites).jpeg({ quality: 92 }).toFile(path.join(output, `originales-${batch + 1}.jpg`));
}
console.log(`${images.length} fuentes`);
