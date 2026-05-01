import fs from "node:fs";
import path from "node:path";

const SRC = "viajes-corregido.jsx";
const OUT = "src/data/viajes.json";

const src = fs.readFileSync(SRC, "utf8");

const marker = "const RAW = ";
const start = src.indexOf(marker);
if (start === -1) throw new Error("No se encontró 'const RAW =' en " + SRC);

const arrStart = src.indexOf("[", start);
let depth = 0;
let inString = false;
let stringChar = "";
let inLineComment = false;
let i = arrStart;

for (; i < src.length; i++) {
  const ch = src[i];
  const next = src[i + 1];

  if (inLineComment) {
    if (ch === "\n") inLineComment = false;
    continue;
  }
  if (inString) {
    if (ch === "\\") { i++; continue; }
    if (ch === stringChar) inString = false;
    continue;
  }
  if (ch === "/" && next === "/") { inLineComment = true; i++; continue; }
  if (ch === '"' || ch === "'" || ch === "`") { inString = true; stringChar = ch; continue; }
  if (ch === "[") depth++;
  else if (ch === "]") {
    depth--;
    if (depth === 0) { i++; break; }
  }
}

const literal = src.slice(arrStart, i);
const RAW = new Function("return " + literal)();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(RAW, null, 2) + "\n");
console.log(`wrote ${RAW.length} rows to ${OUT}`);
