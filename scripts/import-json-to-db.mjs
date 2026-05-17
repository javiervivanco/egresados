#!/usr/bin/env node
// Importa los JSON de src/data/*.json al modelo normalizado en Supabase:
//   empresas (1) ←─ destinos (N) ←─ planes_viaje (N)
//
// Idempotente: upsert por (empresas.slug) y por (destinos.empresa_id + nombre),
// y reemplaza los planes_viaje de cada destino (delete + insert).
// Pensado para correr en dev local tras `make db-reset` para poblar la DB con
// el dataset histórico.
//
// Uso (lee secret de .env.local):
//   make data-import
// O manualmente:
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SECRET_KEY=sb_secret_xxx node scripts/import-json-to-db.mjs

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

function loadEnv() {
  const path = join(repoRoot, ".env.local");
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SECRET_KEY;
  try {
    const raw = readFileSync(path, "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      const [, k, v] = m;
      if (k === "VITE_SUPABASE_URL" && !url) url = v;
      if (k === "SUPABASE_SECRET_KEY" && !key) key = v;
    }
  } catch {}
  if (!url || !key) {
    console.error("Falta SUPABASE_URL o SUPABASE_SECRET_KEY. Comentá esa línea en .env.local o exportalas.");
    process.exit(1);
  }
  return { url, key };
}

// Mapeo desde una row JSON (PascalCase) al shape de planes_viaje (snake_case).
function toPlanRow(r, destinoId) {
  return {
    destino_id:       destinoId,
    transporte:       r.Transporte || null,
    dias:             r.Dias ?? null,
    noches:           r.Noches ?? null,
    plan_pago:        r.Plan_Pago || null,
    cantidad_cuotas:  r.Cantidad_Cuotas ?? null,
    inscripcion:      r.Inscripcion ?? null,
    reserva:          r.Reserva ?? null,
    primera_cuota:    r.Primera_Cuota ?? null,
    cuota_mensual:    r.Cuota_Mensual ?? null,
    anticipo_saldo:   r.Anticipo_Saldo ?? null,
    total_final:      r.Total_Final ?? null,
    liberados:        r.Liberados || null,
    seguro:           r.Seguro || null,
    descuentos:       r.Descuentos || null,
    actividades:      r.Actividades || null,
    vigencia:         r.Vigencia || null,
  };
}

const slugify = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const main = async () => {
  const { url, key } = loadEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const dataDir = join(repoRoot, "src", "data");
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".json") && f !== "viajes.json");

  // 1) Agrupar filas por (empresa, destino)
  const groups = new Map();
  for (const file of files) {
    const rows = JSON.parse(readFileSync(join(dataDir, file), "utf-8"));
    for (const r of rows) {
      if (!r.Empresa || !r.Destino) continue;
      const key = `${r.Empresa}|||${r.Destino}`;
      if (!groups.has(key)) groups.set(key, { empresa: r.Empresa, destino: r.Destino, rows: [] });
      groups.get(key).rows.push(r);
    }
  }

  console.log(`Importando ${files.length} archivos → ${groups.size} (empresa, destino) únicos`);

  // 2) Upsert empresas (por slug)
  const empresasUnicas = [...new Set([...groups.values()].map((g) => g.empresa))];
  for (const nombre of empresasUnicas) {
    const slug = slugify(nombre);
    const { error } = await supabase
      .from("empresas")
      .upsert({ nombre, slug }, { onConflict: "slug" });
    if (error) { console.error(`Empresa ${nombre}:`, error.message); process.exit(1); }
  }
  const { data: empresasDb } = await supabase.from("empresas").select("id, nombre");
  const empresaIdByNombre = Object.fromEntries(empresasDb.map((e) => [e.nombre, e.id]));

  // 3) Por cada (empresa, destino): upsert destino, borrar planes existentes, insertar nuevos
  let totalPlanes = 0;
  for (const { empresa, destino, rows } of groups.values()) {
    const empresaId = empresaIdByNombre[empresa];
    if (!empresaId) { console.error(`Empresa no encontrada: ${empresa}`); continue; }

    // Upsert destino por (empresa_id, nombre).
    const { data: existing } = await supabase
      .from("destinos").select("id").eq("empresa_id", empresaId).eq("nombre", destino).maybeSingle();

    let destinoId = existing?.id;
    if (!destinoId) {
      const { data, error } = await supabase
        .from("destinos").insert({ empresa_id: empresaId, nombre: destino }).select("id").single();
      if (error) { console.error(`Destino ${destino} (${empresa}):`, error.message); continue; }
      destinoId = data.id;
    } else {
      // Reset: borramos planes previos para evitar duplicados al re-correr.
      await supabase.from("planes_viaje").delete().eq("destino_id", destinoId);
    }

    const planRows = rows.map((r) => toPlanRow(r, destinoId));
    const { error } = await supabase.from("planes_viaje").insert(planRows);
    if (error) { console.error(`Planes ${destino} (${empresa}):`, error.message); continue; }
    totalPlanes += planRows.length;
    console.log(`  ✓ ${empresa} · ${destino}: ${planRows.length} planes`);
  }

  console.log(`\nListo. ${totalPlanes} planes importados en ${groups.size} destinos.`);
};

main().catch((e) => { console.error(e); process.exit(1); });
