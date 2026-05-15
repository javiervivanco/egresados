#!/usr/bin/env node
// Migra todos los JSON de src/data/*.json a la tabla "planes" de Supabase vía REST API.
// Uso: SUPABASE_KEY=$(cat api.txt) node scripts/migrate-to-supabase.mjs

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SUPABASE_URL = "https://mjmeaoysabmauxfbmbri.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error("Falta SUPABASE_KEY. Uso: SUPABASE_KEY=$(cat api.txt) node scripts/migrate-to-supabase.mjs");
  process.exit(1);
}

const dataDir = join(import.meta.dirname, "..", "src", "data");
const files = readdirSync(dataDir).filter(f => f.endsWith(".json") && f !== "viajes.json");

// Mapeo de claves JSON (PascalCase) a columnas de la tabla (snake_case)
const keyMap = {
  Empresa: "empresa",
  Destino: "destino",
  Transporte: "transporte",
  Dias: "dias",
  Noches: "noches",
  Plan_Pago: "plan_pago",
  Cantidad_Cuotas: "cantidad_cuotas",
  Inscripcion: "inscripcion",
  Reserva: "reserva",
  Primera_Cuota: "primera_cuota",
  Cuota_Mensual: "cuota_mensual",
  Anticipo_Saldo: "anticipo_saldo",
  Total_Final: "total_final",
  Liberados: "liberados",
  Seguro: "seguro",
  Descuentos: "descuentos",
  Actividades: "actividades",
  Vigencia: "vigencia",
};

function mapRow(row) {
  const mapped = {};
  for (const [jsonKey, dbCol] of Object.entries(keyMap)) {
    // Siempre incluir todas las claves; null para los faltantes
    const val = row[jsonKey];
    mapped[dbCol] = (val !== undefined && val !== null && val !== "") ? val : null;
  }
  return mapped;
}

// Recopilar todas las filas
let allRows = [];
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(dataDir, file), "utf-8"));
  const rows = (Array.isArray(raw) ? raw : []).filter(r => r && r.Empresa);
  allRows.push(...rows.map(mapRow));
  console.log(`  ${file}: ${rows.length} filas`);
}

console.log(`\nTotal: ${allRows.length} filas a insertar`);

// Supabase REST API acepta hasta ~1000 filas por request. Insertamos en batches de 500.
const BATCH = 500;
let inserted = 0;

for (let i = 0; i < allRows.length; i += BATCH) {
  const batch = allRows.slice(i, i + BATCH);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/planes`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Error en batch ${i}-${i + batch.length}: ${res.status} ${err}`);
    process.exit(1);
  }

  inserted += batch.length;
  console.log(`  Insertados ${inserted}/${allRows.length}`);
}

console.log(`\n✓ Migración completa: ${inserted} filas insertadas en "planes"`);
