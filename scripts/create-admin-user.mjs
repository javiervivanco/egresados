#!/usr/bin/env node
// Crea un user admin (super_admin o empresa_admin) en la instancia local de
// Supabase. Usa la service-role key (debe estar en .env.local como
// SUPABASE_SECRET_KEY).
//
// Uso:
//   make admin-create-user EMAIL=foo@bar PASSWORD=Pass123 ROL=super_admin
//   make admin-create-user EMAIL=ana@flecha.com PASSWORD=Pass123 ROL=empresa_admin EMPRESA_SLUG=flecha NOMBRE="Ana Pérez"
//
// El password por default es "Cambiar123" si no se pasa.

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

function loadEnv() {
  let url, key;
  try {
    for (const line of readFileSync(join(repoRoot, ".env.local"), "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      if (m[1] === "VITE_SUPABASE_URL") url = m[2];
      if (m[1] === "SUPABASE_SECRET_KEY") key = m[2];
    }
  } catch {}
  return { url: process.env.SUPABASE_URL || url, key: process.env.SUPABASE_SECRET_KEY || key };
}

const env = (k, fallback) => process.env[k] ?? fallback;

const EMAIL = env("EMAIL");
const PASSWORD = env("PASSWORD", "Cambiar123!");
const ROL = env("ROL");
const NOMBRE = env("NOMBRE", null);
const EMPRESA_SLUG = env("EMPRESA_SLUG", null);

if (!EMAIL || !ROL) {
  console.error(`Uso: EMAIL=... ROL=super_admin|empresa_admin [PASSWORD=...] [NOMBRE=...] [EMPRESA_SLUG=...] node scripts/create-admin-user.mjs`);
  process.exit(1);
}

if (!["super_admin", "empresa_admin", "familia"].includes(ROL)) {
  console.error(`ROL inválido. Valores: super_admin, empresa_admin, familia.`);
  process.exit(1);
}

const { url, key } = loadEnv();
if (!url || !key) {
  console.error("Falta VITE_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

let empresaId = null;
if (ROL === "empresa_admin") {
  if (!EMPRESA_SLUG) {
    console.error("ROL=empresa_admin requiere EMPRESA_SLUG.");
    process.exit(1);
  }
  const { data, error } = await admin.from("empresas").select("id, nombre").eq("slug", EMPRESA_SLUG).maybeSingle();
  if (error || !data) { console.error(`Empresa con slug "${EMPRESA_SLUG}" no encontrada.`); process.exit(1); }
  empresaId = data.id;
  console.log(`Empresa: ${data.nombre} (id=${empresaId})`);
}

// Crear o reusar el user en auth.
const { data: list } = await admin.auth.admin.listUsers();
let userId = list?.users?.find((u) => u.email === EMAIL)?.id;
if (userId) {
  console.log(`User ya existía (id=${userId}). Reseteo password y profile.`);
  await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) { console.error("Auth createUser:", error.message); process.exit(1); }
  userId = data.user.id;
  console.log(`User creado (id=${userId})`);
}

// Upsert profile.
const { error: pe } = await admin.from("profiles").upsert({
  user_id: userId,
  rol: ROL,
  nombre: NOMBRE || EMAIL.split("@")[0],
  empresa_id: empresaId,
});
if (pe) { console.error("Profile upsert:", pe.message); process.exit(1); }

console.log(`\n✓ Listo. Login:\n  email: ${EMAIL}\n  password: ${PASSWORD}\n  rol: ${ROL}${empresaId ? ` (empresa=${EMPRESA_SLUG})` : ""}`);
