// Capa de tracking del funnel para medir drop-off + atribución.
//
// Convenciones:
//   * Los eventos son strings kebab-case ("onboarding_landing_view",
//     "voto_fecha_si", "comparativa_open", "venta_confirmada_view").
//   * `ctx` es un objeto plano (lo serializamos a JSON en el RPC).
//   * UTM se captura una sola vez por sesión y se persiste en localStorage
//     para que sobreviva navegación interna. Si el lead se identifica más
//     tarde (al capturar email), las UTM se mergen al lead via
//     `tracking.attachLead(email)`.
//
// Separamos pure helpers (parseUTM, buildPayload) de los side-effects
// (track, attachLead) para que los tests sean triviales sin tocar el DOM ni
// la red.

const STORAGE_UTM    = "egresados_utm";
const STORAGE_SESSION = "egresados_session_id";

// ---------------------------------------------------------------
// Pure helpers (testeables sin DOM)
// ---------------------------------------------------------------

// Extrae las claves UTM del query string. Devuelve un objeto con las que
// vinieron presentes (las ausentes se omiten — no queremos undefined en JSON).
export function parseUTM(search) {
  if (!search || typeof search !== "string") return {};
  const sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = sp.get(k);
    if (v && v.trim()) out[k] = v.trim();
  }
  return out;
}

// Genera un session_id determinístico-por-sesión. Si el storage devuelve
// uno, lo reusa; si no, lo genera (random). Es puro respecto al storage
// argumentado (no toca localStorage global).
export function getOrCreateSessionId(storage) {
  const existing = storage.getItem(STORAGE_SESSION);
  if (existing) return existing;
  const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  storage.setItem(STORAGE_SESSION, id);
  return id;
}

// Lee UTM de URL + storage, los merguea (URL gana sobre storage) y devuelve
// el objeto final. También persiste en storage si vinieron UTM nuevos.
export function resolveUTM({ search, storage }) {
  const fromUrl = parseUTM(search);
  let stored = {};
  try {
    stored = JSON.parse(storage.getItem(STORAGE_UTM) || "{}");
  } catch { /* JSON corrupto: lo descartamos */ }
  if (Object.keys(fromUrl).length > 0) {
    storage.setItem(STORAGE_UTM, JSON.stringify(fromUrl));
    return fromUrl;
  }
  return stored;
}

// Construye el payload final que se manda al RPC. Mantiene ctx + UTM en
// claves separadas para que el admin pueda filtrar en queries.
export function buildPayload({ evento, email, ctx = {}, utm = {}, sessionId }) {
  const fullCtx = { ...ctx, ...(Object.keys(utm).length ? { utm } : {}) };
  return {
    p_evento: evento,
    p_email: email || null,
    p_ctx: fullCtx,
    p_session_id: sessionId || null,
  };
}

// ---------------------------------------------------------------
// Side-effects (browser/Supabase)
// ---------------------------------------------------------------

// Estado en módulo: email del lead actual (lo seteamos cuando capturamos
// contacto) y supabase client lazy-imported para que los tests no toquen la
// red.
let _email = null;
let _supabase = null;

async function getSupabase() {
  if (_supabase) return _supabase;
  const mod = await import("../../supabase");
  _supabase = mod.supabase;
  return _supabase;
}

// El view llama esto en cuanto el lead da su email (ContactoStep). A partir
// de ese momento los eventos quedan asociados al lead, no anon.
export function attachLead(email) {
  _email = (email || "").trim() || null;
}

// Track del evento. No bloquea — fire-and-forget. Si falla, no rompe el UX.
export async function track(evento, ctx = {}) {
  try {
    if (typeof window === "undefined") return; // SSR/test sin DOM
    const utm = resolveUTM({ search: window.location.search, storage: window.localStorage });
    const sessionId = getOrCreateSessionId(window.localStorage);
    const payload = buildPayload({ evento, email: _email, ctx, utm, sessionId });
    const supabase = await getSupabase();
    if (!supabase) return;
    await supabase.rpc("evento_funnel_log", payload);
  } catch (e) {
    if (typeof console !== "undefined") console.warn("track failed:", e?.message);
  }
}

// UTM que ya hayamos capturado (para mergear al lead en upsertLead).
export function currentUTM() {
  try {
    if (typeof window === "undefined") return {};
    return resolveUTM({ search: window.location.search, storage: window.localStorage });
  } catch {
    return {};
  }
}

export function _reset() { _email = null; _supabase = null; }
