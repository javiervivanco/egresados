// Fuente de datos de planes para el frontend público.
//
// Orden de fallback:
//   1) DB (destinos + planes_viaje + empresas) si supabase responde con filas.
//   2) JSON locales en src/data/*.json — siempre como fallback (sin supabase
//      o si la DB está vacía).
//
// Devuelve filas en el formato legacy PascalCase que ya consume App.jsx
// (Empresa, Destino, Transporte, Dias, Noches, Plan_Pago, Total_Final, etc).
// Esto evita propagar el cambio de shape por toda la UI en este paso.

import { supabase } from "../supabase";

// Carga de los JSON locales (mismo glob de antes, ahora vive acá).
const dataModules = import.meta.glob("../data/*.json", { eager: true, import: "default" });

const RAW_LEGACY = Object.entries(dataModules)
  .filter(([path]) => !path.endsWith("/viajes.json"))
  .flatMap(([, mod]) => (Array.isArray(mod) ? mod : []))
  .filter((r) => r && r.Empresa);

function dbRowToLegacy(row, destinoNombre, empresaNombre) {
  return {
    id_db: row.id,                       // plan_id en DB — usado por votos_plan
    destino_id: row.destino_id,          // FK al destino en DB
    origen_ciudad_id: row.origen_ciudad_id || null, // FK ciudad de salida del plan (null = hereda empresa)
    Empresa: empresaNombre,
    Destino: destinoNombre,
    Transporte: row.transporte,
    Dias: row.dias,
    Noches: row.noches,
    Plan_Pago: row.plan_pago,
    Cantidad_Cuotas: row.cantidad_cuotas,
    Inscripcion: row.inscripcion,
    Reserva: row.reserva,
    Primera_Cuota: row.primera_cuota,
    Cuota_Mensual: row.cuota_mensual,
    Anticipo_Saldo: row.anticipo_saldo,
    Total_Final: row.total_final,
    Liberados: row.liberados,
    Seguro: row.seguro,
    Descuentos: row.descuentos,
    Actividades: row.actividades,
    Vigencia: row.vigencia,
  };
}

// Filtro puro plan-by-plan: matchea plan.origen_ciudad_id O hereda de
// empresa. Exportado para testear sin Supabase.
//
// data: array de planes con shape { origen_ciudad_id, destinos: { empresa_id } }
// ciudadId: number | null  — sin ciudadId devuelve data intacta
// empresaIdsHerencia: array de IDs de empresas que operan desde ciudadId
//                    (cuando plan.origen_ciudad_id es null, el plan "hereda"
//                    los orígenes de la empresa).
export function filtrarPorCiudad(data, ciudadId, empresaIdsHerencia) {
  if (!ciudadId) return data;
  const herencia = new Set(empresaIdsHerencia || []);
  return data.filter((p) => {
    if (p.origen_ciudad_id != null) return p.origen_ciudad_id === ciudadId;
    return herencia.has(p.destinos?.empresa_id);
  });
}

// Devuelve { rows, source, filteredByCiudad }
//   source: "db" | "json"
//   filteredByCiudad: true si la query se filtró por ciudad.
//
// Lógica de filtrado plan-by-plan (cuando hay ciudadId):
//   a) Plan con origen_ciudad_id propio → solo si coincide con ciudadId.
//   b) Plan sin origen_ciudad_id → hereda: empresa debe operar desde ciudadId
//      (via empresas_origenes).
// Sin ciudadId devuelve catálogo completo.
export async function loadPlanes({ ciudadId = null } = {}) {
  if (!supabase) return { rows: RAW_LEGACY, source: "json", filteredByCiudad: false };

  let empresaIdsHerencia = null;
  if (ciudadId) {
    const { data: orig } = await supabase
      .from("empresas_origenes")
      .select("empresa_id")
      .eq("ciudad_id", ciudadId);
    empresaIdsHerencia = (orig || []).map((r) => r.empresa_id);
  }

  const { data, error } = await supabase
    .from("planes_viaje")
    .select("*, destinos!inner(id, nombre, empresa_id, empresas!inner(nombre))")
    .eq("activo", true);

  if (error || !data) {
    return { rows: RAW_LEGACY, source: "json", filteredByCiudad: false };
  }

  // Filtrado plan-by-plan en JS (más simple que armar query OR compuesta).
  const filtered = filtrarPorCiudad(data, ciudadId, empresaIdsHerencia);

  if (filtered.length === 0) {
    if (ciudadId) return { rows: [], source: "db", filteredByCiudad: true };
    return { rows: RAW_LEGACY, source: "json", filteredByCiudad: false };
  }

  const rows = filtered.map((p) =>
    dbRowToLegacy(p, p.destinos.nombre, p.destinos.empresas.nombre)
  );
  return { rows, source: "db", filteredByCiudad: !!ciudadId };
}
