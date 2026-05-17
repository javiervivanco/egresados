// Clasificación pura del visitante en uno de 6 tipos. Sin React, sin DB,
// sin DOM — toma inputs ya resueltos y devuelve un VisitorType. El hook
// useVisitor() se encarga de los side-effects (fetch DB, leer URL,
// localStorage) y le pasa los inputs ya normalizados.
//
// Por qué pura: queremos testear *toda* la matriz de decisiones sin levantar
// browser ni Supabase. La hook de arriba es delgada y los bugs reales caen
// acá, donde son detectables.

export const VISITOR = Object.freeze({
  ANON_PURO:           "anon.puro",
  ANON_UTM:            "anon.utm",
  LEAD_FRIO:           "lead.frio",       // tiene email/lead conocido pero sin familia
  LEAD_TIBIO:          "lead.tibio",      // familia identificada pero inactiva (>3d)
  FAMILIA_ACTIVA:      "familia.activa",  // familia con actividad reciente
  CLIENTE_CONFIRMADO:  "cliente.confirmado", // venta cerrada
});

// Umbral en horas para considerar a una familia como tibia.
export const TIBIO_HOURS = 72;

// Argumentos:
//   identity        — { familiaId, grupoId, ciudadId } | null campos
//   urlToken        — string | null   (`?t=xxx` de email transaccional)
//   urlUTM          — objeto con utm_*; si tiene al menos una clave, hay UTM
//   leadKnown       — boolean (DB encontró lead por email/token sin familia)
//   ventaConfirmada — boolean (DB encontró venta del grupo en estado terminal)
//   lastSeenAtMs    — number | null (timestamp ms; null → desconocido)
//   nowMs           — number (inyectado para tests)
export function classify({
  identity = {}, urlToken = null, urlUTM = {},
  leadKnown = false, ventaConfirmada = false,
  lastSeenAtMs = null, nowMs = Date.now(),
} = {}) {
  if (ventaConfirmada) return VISITOR.CLIENTE_CONFIRMADO;

  if (identity?.familiaId) {
    if (lastSeenAtMs != null && (nowMs - lastSeenAtMs) > TIBIO_HOURS * 3600_000) {
      return VISITOR.LEAD_TIBIO;
    }
    return VISITOR.FAMILIA_ACTIVA;
  }

  if (urlToken || leadKnown) return VISITOR.LEAD_FRIO;

  if (urlUTM && Object.keys(urlUTM).length > 0) return VISITOR.ANON_UTM;

  return VISITOR.ANON_PURO;
}

// Devuelve un copy de "nudge" para mostrar arriba en cada tipo. Pure: sin
// dependencias del view. El componente escoge el formato (alert, badge,
// etc.). Para tipos que no necesitan nudge devuelve null.
export function nudgeFor(type) {
  switch (type) {
    case VISITOR.ANON_PURO:
      return { tone: "info", title: "Compará viajes de egresados",
               body: "Tres minutos: te registrás y ves cuotas reales por empresa." };
    case VISITOR.ANON_UTM:
      return { tone: "info", title: "¡Llegaste por una campaña!",
               body: "Te guiamos paso a paso: en cinco minutos sabés qué empresa te conviene." };
    case VISITOR.LEAD_FRIO:
      return { tone: "warn", title: "Te encontramos",
               body: "Empezaste tu registro pero falta poco. ¿Lo completamos?" };
    case VISITOR.LEAD_TIBIO:
      return { tone: "warn", title: "Hace días que no entrás",
               body: "Hay novedad de tu grupo. Revisá qué cambió desde tu última visita." };
    case VISITOR.FAMILIA_ACTIVA:
      return null; // dashboard mismo es el nudge
    case VISITOR.CLIENTE_CONFIRMADO:
      return null; // venta cerrada habla por sí sola
    default:
      return null;
  }
}
