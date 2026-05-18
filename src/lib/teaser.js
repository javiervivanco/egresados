// Teaser de destinos para anon: muestra opciones SIN precio antes del
// registro. El precio solo aparece tras completar onboarding + teléfono.
// El gancho de marketing es: ver el universo de opciones, no la
// comparativa real.
//
// Devuelve destinos únicos (deduplica por nombre normalizado) con
// metadata mínima: nombre, provincia, conteo de empresas que lo
// ofrecen. Sin total_final, sin cuotas.

import { supabase } from "../supabase";

const dataModules = import.meta.glob("../data/*.json", { eager: true, import: "default" });

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function fromJSON() {
  const rows = Object.entries(dataModules)
    .filter(([p]) => !p.endsWith("/viajes.json"))
    .flatMap(([, mod]) => (Array.isArray(mod) ? mod : []))
    .filter((r) => r && r.Destino && r.Empresa);

  const byDestino = new Map();
  for (const r of rows) {
    const key = normalize(r.Destino);
    if (!byDestino.has(key)) {
      byDestino.set(key, { nombre: r.Destino, empresas: new Set(), provincia: null });
    }
    byDestino.get(key).empresas.add(r.Empresa);
  }
  return [...byDestino.values()].map((d) => ({
    nombre: d.nombre, provincia: d.provincia, empresas: d.empresas.size,
  })).sort((a, b) => b.empresas - a.empresas);
}

export async function loadTeaser({ ciudadId = null } = {}) {
  if (!supabase) return fromJSON();

  let q = supabase
    .from("destinos")
    .select("id, nombre, empresa_id, empresas!inner(nombre)")
    .eq("activo", true);

  if (ciudadId) {
    // Filtrar por empresas que operen desde esa ciudad.
    const { data: orig } = await supabase
      .from("empresas_origenes").select("empresa_id").eq("ciudad_id", ciudadId);
    const empresaIds = (orig || []).map((r) => r.empresa_id);
    if (empresaIds.length === 0) return [];
    q = q.in("empresa_id", empresaIds);
  }

  const { data, error } = await q;
  if (error || !data || data.length === 0) return fromJSON();

  const byDestino = new Map();
  for (const d of data) {
    const key = normalize(d.nombre);
    if (!byDestino.has(key)) {
      byDestino.set(key, { nombre: d.nombre, empresas: new Set() });
    }
    byDestino.get(key).empresas.add(d.empresas.nombre);
  }
  return [...byDestino.values()].map((d) => ({
    nombre: d.nombre, empresas: d.empresas.size,
  })).sort((a, b) => b.empresas - a.empresas);
}
