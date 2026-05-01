import fs from "node:fs";
import path from "node:path";

const SRC = "src/data/viajes.json";
const OUT_DIR = "src/data";

if (!fs.existsSync(SRC)) {
  console.error(`No existe ${SRC}. Corré 'make extract' primero o restaurá el archivo.`);
  process.exit(1);
}

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const all = JSON.parse(fs.readFileSync(SRC, "utf8"));
const groups = {};
for (const r of all) {
  const k = r.Empresa;
  if (!k) continue;
  (groups[k] ??= []).push(r);
}

let written = 0;
let skipped = 0;
for (const [empresa, rows] of Object.entries(groups)) {
  const fname = path.join(OUT_DIR, `${slugify(empresa)}.json`);
  if (fs.existsSync(fname)) {
    console.log(`skip   ${fname.padEnd(34)} (existe, preservando ediciones)`);
    skipped++;
    continue;
  }
  fs.writeFileSync(fname, JSON.stringify(rows, null, 2) + "\n");
  console.log(`wrote  ${fname.padEnd(34)} ${rows.length} filas (${empresa})`);
  written++;
}

console.log(`\nResumen: ${written} archivos nuevos, ${skipped} preservados`);
console.log("Para sobrescribir uno existente: borralo a mano y volvé a correr el script.");
