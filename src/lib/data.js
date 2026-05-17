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

// Devuelve { rows, source, filteredByCiudad }
//   source: "db" | "json"
//   filteredByCiudad: true si la query se redujo a empresas que operan
//                     desde ciudadId. Útil para mostrar el copy correcto
//                     cuando no hay match.
//
// Si se pasa ciudadId, sólo devuelve planes de empresas que tengan esa
// ciudad listada en `empresas_origenes`. Sin ciudadId (admin / preview)
// devuelve el catálogo completo.
export async function loadPlanes({ ciudadId = null } = {}) {
  if (!supabase) return { rows: RAW_LEGACY, source: "json", filteredByCiudad: false };

  let empresaIds = null;
  if (ciudadId) {
    const { data: orig, error: errOrig } = await supabase
      .from("empresas_origenes")
      .select("empresa_id")
      .eq("ciudad_id", ciudadId);
    if (!errOrig && orig) {
      empresaIds = orig.map((r) => r.empresa_id);
      if (empresaIds.length === 0) {
        // Sin empresas para esa ciudad → resultado vacío explícito (no
        // caemos al fallback JSON que mostraría irrelevantes).
        return { rows: [], source: "db", filteredByCiudad: true };
      }
    }
  }

  let q = supabase
    .from("planes_viaje")
    .select("*, destinos!inner(id, nombre, empresa_id, empresas!inner(nombre))")
    .eq("activo", true);

  if (empresaIds && empresaIds.length > 0) {
    q = q.in("destinos.empresa_id", empresaIds);
  }

  const { data, error } = await q;

  if (error || !data) {
    return { rows: RAW_LEGACY, source: "json", filteredByCiudad: false };
  }
  if (data.length === 0) {
    // Sin filtro y vacío → JSON fallback. Con filtro y vacío → vacío real.
    if (ciudadId) return { rows: [], source: "db", filteredByCiudad: true };
    return { rows: RAW_LEGACY, source: "json", filteredByCiudad: false };
  }

  const rows = data.map((p) =>
    dbRowToLegacy(p, p.destinos.nombre, p.destinos.empresas.nombre)
  );
  return { rows, source: "db", filteredByCiudad: !!ciudadId };
}
