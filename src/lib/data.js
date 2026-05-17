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

// Devuelve { rows, source: "db" | "json" }
export async function loadPlanes() {
  if (!supabase) return { rows: RAW_LEGACY, source: "json" };

  // Embed: planes_viaje → destinos → empresas
  const { data, error } = await supabase
    .from("planes_viaje")
    .select("*, destinos!inner(id, nombre, empresa_id, empresas!inner(nombre))")
    .eq("activo", true);

  if (error || !data || data.length === 0) {
    return { rows: RAW_LEGACY, source: "json" };
  }

  const rows = data.map((p) =>
    dbRowToLegacy(p, p.destinos.nombre, p.destinos.empresas.nombre)
  );
  return { rows, source: "db" };
}
