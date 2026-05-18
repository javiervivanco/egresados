// Tests de integración: ejecutan el flow completo del onboarding contra
// Supabase local. Detectan bugs que viven en la frontera entre schema,
// RLS, RPC signatures y client code — los que el suite puro (Vitest sin
// red) no puede tocar.
//
// Opt-in: solo corren con `npm run test:integration`. Necesitan:
//   - Supabase local levantado (`make up`)
//   - Migrations al día (`npx supabase migration up --local`)
//   - .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY apuntando
//     al stack local
//
// Cada test usa un email único por run para no chocar con seed/runs previos.

import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

function loadEnvLocal() {
  const out = {};
  try {
    for (const line of readFileSync(join(repoRoot, ".env.local"), "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch { /* archivo no existe, fallback a process.env */ }
  return out;
}

const env = loadEnvLocal();
const URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

// Cliente anon — el mismo que usa el frontend público.
const supabase = createClient(URL, KEY);

const uniq = () => `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

beforeAll(() => {
  if (!URL || !KEY) throw new Error("Faltan VITE_SUPABASE_URL / ANON_KEY en .env.local");
});

describe("integración · onboarding end-to-end", () => {
  it("cold path completo: anon crea escuela+grupo+familia+profile sin errores RLS", async () => {
    const email = `${uniq()}@test.local`;

    // 1. Lead inicial (lead_upsert con UTM)
    const { data: leadId, error: errLead } = await supabase.rpc("lead_upsert", {
      p_email: email,
      p_telefono: "+54 9 11 1234-5678",
      p_utm_source: "test", p_utm_campaign: "integration",
    });
    expect(errLead, "lead_upsert").toBeNull();
    expect(leadId).toBeGreaterThan(0);

    // 2. Necesitamos una ciudad para asociar la escuela cold.
    const { data: ciudades, error: errC } = await supabase
      .from("ciudades").select("id").limit(1);
    expect(errC, "fetch ciudades").toBeNull();
    expect(ciudades?.length, "hay ciudades cargadas").toBeGreaterThan(0);
    const ciudadId = ciudades[0].id;

    // 3. Escuela pendiente
    const { data: escuelaId, error: errE } = await supabase.rpc("escuela_lead_create", {
      p_nombre: `Test School ${uniq()}`,
      p_ciudad_id: ciudadId,
    });
    expect(errE, "escuela_lead_create").toBeNull();
    expect(escuelaId).toBeGreaterThan(0);

    // 4. Grupo pendiente
    const { data: grupoId, error: errG } = await supabase.rpc("grupo_lead_create", {
      p_escuela_id: escuelaId, p_grado: "6to A", p_anio_egreso: 2027,
    });
    expect(errG, "grupo_lead_create").toBeNull();
    expect(grupoId).toBeGreaterThan(0);

    // 5. Familia (RPC nueva 0014: familia_unirse)
    const { data: fam, error: errF } = await supabase.rpc("familia_unirse", {
      p_grupo_id: grupoId, p_apellido: "García", p_email: email,
      p_telefono: "+54 9 11 1234-5678",
    });
    expect(errF, "familia_unirse").toBeNull();
    expect(fam?.familia_id).toBeGreaterThan(0);
    expect(fam?.es_nueva_familia).toBe(true);

    // 6. Anon sign-in (la familia se autentica)
    const { data: session, error: errSign } = await supabase.auth.signInAnonymously();
    expect(errSign, "signInAnonymously").toBeNull();
    const user = session?.user;
    expect(user?.id, "anon user creado").toBeTruthy();

    // 7. Upsert del profile vinculando user_id → familia_id.
    //    Esta es la operación que se rompía con RLS antes de la mig 0017.
    const { error: errProfile } = await supabase.from("profiles").upsert({
      user_id: user.id, rol: "familia", familia_id: fam.familia_id,
    }, { onConflict: "user_id" });
    expect(errProfile, "profile self-insert (req mig 0017)").toBeNull();

    // 8. Verificar que las RLS lo dejan leer su propio profile.
    const { data: prof, error: errProf2 } = await supabase
      .from("profiles").select("rol, familia_id").eq("user_id", user.id).maybeSingle();
    expect(errProf2).toBeNull();
    expect(prof?.rol).toBe("familia");
    expect(prof?.familia_id).toBe(fam.familia_id);

    // Cleanup: signOut para no dejar sesión persistida.
    await supabase.auth.signOut();
  }, 30000);

  it("warm path: segunda familia se suma a familia existente sin duplicar miembros", async () => {
    const email1 = `${uniq()}-1@test.local`;
    const email2 = `${uniq()}-2@test.local`;

    const { data: ciudades } = await supabase.from("ciudades").select("id").limit(1);
    const ciudadId = ciudades[0].id;

    const { data: escuelaId } = await supabase.rpc("escuela_lead_create", {
      p_nombre: `Test School ${uniq()}`, p_ciudad_id: ciudadId,
    });
    const { data: grupoId } = await supabase.rpc("grupo_lead_create", {
      p_escuela_id: escuelaId, p_grado: "7mo", p_anio_egreso: 2027,
    });

    // Primer miembro
    const { data: r1 } = await supabase.rpc("familia_unirse", {
      p_grupo_id: grupoId, p_apellido: "Pérez", p_email: email1,
    });
    expect(r1?.es_nueva_familia).toBe(true);

    // Segundo miembro mismo apellido + email distinto
    const { data: r2 } = await supabase.rpc("familia_unirse", {
      p_grupo_id: grupoId, p_apellido: "Pérez", p_email: email2,
    });
    expect(r2?.es_nueva_familia).toBe(false);
    expect(r2?.familia_id).toBe(r1.familia_id);

    // Tercer intento con mismo email → idempotente
    const { data: r3 } = await supabase.rpc("familia_unirse", {
      p_grupo_id: grupoId, p_apellido: "Pérez", p_email: email1,
    });
    expect(r3?.miembro_id).toBe(r1.miembro_id);
  }, 30000);

  it("invitación: el token resuelve grupo + escuela y respeta expiración", async () => {
    const { data: ciudades } = await supabase.from("ciudades").select("id").limit(1);
    const ciudadId = ciudades[0].id;

    const { data: escuelaId } = await supabase.rpc("escuela_lead_create", {
      p_nombre: `Invitable ${uniq()}`, p_ciudad_id: ciudadId,
    });
    const { data: grupoId } = await supabase.rpc("grupo_lead_create", {
      p_escuela_id: escuelaId, p_grado: "8vo", p_anio_egreso: 2027,
    });

    // El grupo tiene un token por default (mig 0013).
    const { data: grupo } = await supabase.from("grupos")
      .select("invitacion_token").eq("id", grupoId).single();
    expect(grupo?.invitacion_token).toMatch(/^[0-9a-f-]{36}$/);

    const { data: res, error } = await supabase.rpc("grupo_resolver_invitacion", {
      p_token: grupo.invitacion_token,
    });
    expect(error).toBeNull();
    const row = Array.isArray(res) ? res[0] : res;
    expect(row?.grupo_id).toBe(grupoId);
    expect(row?.escuela_id).toBe(escuelaId);
    expect(row?.expirado).toBe(false);

    // Token inexistente
    const { data: noRes } = await supabase.rpc("grupo_resolver_invitacion", {
      p_token: "00000000-0000-0000-0000-000000000000",
    });
    const noRow = Array.isArray(noRes) ? noRes[0] : noRes;
    expect(noRow).toBeFalsy();
  }, 30000);
});

describe("integración · catálogo filtrado por ciudad", () => {
  it("loadPlanes con ciudadId sin empresas operando → vacío explícito (no fallback JSON)", async () => {
    // Tomamos una ciudad probablemente sin empresas en el seed.
    const { data: ciudades } = await supabase.from("ciudades")
      .select("id, nombre").eq("slug", "jujuy").maybeSingle();
    if (!ciudades) return; // si el seed no tiene jujuy lo skipeamos
    const ciudadId = ciudades.id;

    const { data: empresas } = await supabase.from("empresas_origenes")
      .select("empresa_id").eq("ciudad_id", ciudadId);
    expect(empresas?.length || 0).toBe(0);

    // Si no hay empresas operando, planes_relevantes debería devolver 0.
    const { data: planes } = await supabase.rpc("planes_relevantes", { p_ciudad_id: ciudadId });
    expect(planes?.length || 0).toBe(0);
  });
});
