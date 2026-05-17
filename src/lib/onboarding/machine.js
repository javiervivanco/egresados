// FSM pura del onboarding. Sin React, sin Supabase, sin DOM — sólo data +
// funciones de transición. Esto permite testear el árbol de estados de
// forma exhaustiva: que ningún prospecto quede en un nodo sin salida.
//
// Cada nodo del árbol es un STATE. Las transiciones son funciones puras
// (state, event, ctx, payload) → { state, ctx } que devuelven el siguiente
// estado y el contexto actualizado.
//
// El componente OnboardingFunnel dispatcha eventos via `dispatch(event,
// payload)` provistos por `useOnboarding`. Las llamadas a Supabase viven en
// `effects.js`; el view las invoca antes de dispatchar el evento.
//
// Invariante crítica que cubren los tests:
//   * desde cualquier STATE no terminal hay al menos un EVENT que lleva a
//     un STATE más cercano a DONE.
//   * DONE es alcanzable desde LANDING via algún camino.
//   * No hay STATE no terminal sin transiciones salientes.

export const STATES = Object.freeze({
  LANDING:         "landing",
  CONTACTO:        "contacto",
  ESCUELA_BUSCAR:  "escuela.buscar",
  ESCUELA_LIBRE:   "escuela.libre",
  GRUPO_ELEGIR:    "grupo.elegir",
  GRUPO_CREAR:     "grupo.crear",
  APELLIDO:        "apellido",
  SUBMITTING:      "submitting",
  DONE:            "done",
});

export const EVENTS = Object.freeze({
  START:            "START",
  SUBMIT_CONTACTO:  "SUBMIT_CONTACTO",
  TO_LIBRE:         "TO_LIBRE",
  TO_BUSCAR:        "TO_BUSCAR",
  PICK_ESCUELA:     "PICK_ESCUELA",     // payload: { escuela, grupos }
  SUBMIT_COLD:      "SUBMIT_COLD",      // payload: { escuela, grupo }
  PICK_GRUPO:       "PICK_GRUPO",       // payload: { grupo }
  SUBMIT_GRUPO:     "SUBMIT_GRUPO",     // payload: { grupo }
  SUBMIT_APELLIDO:  "SUBMIT_APELLIDO",  // payload: { apellido }
  SUBMIT_OK:        "SUBMIT_OK",        // payload: { familiaId }
  SUBMIT_FAIL:      "SUBMIT_FAIL",      // payload: { error }
  BACK:             "BACK",
});

const TERMINAL = new Set([STATES.DONE]);

export function isTerminal(state) {
  return TERMINAL.has(state);
}

export function initialState() {
  return {
    state: STATES.LANDING,
    ctx: {
      contacto: {},      // { email, apellido?, telefono? }
      escuela: null,     // { id, nombre, _pendiente? }
      grupos: [],        // grupos de la escuela elegida (puede estar vacío)
      grupo: null,       // { id, grado, anio_egreso, _pendiente? }
      apellido: "",
      familiaId: null,
      error: null,
    },
  };
}

// =============================================================
// Tabla de transiciones. Clave: `${state}|${event}`.
// El handler recibe (ctx, payload) y devuelve { state, ctx }.
// Si la combinación no existe, transition() devuelve el estado actual
// sin modificar (no-op silencioso) — los tests catchean los huérfanos.
// =============================================================
const T = {
  [k(STATES.LANDING, EVENTS.START)]:
    (ctx) => ({ state: STATES.CONTACTO, ctx }),

  [k(STATES.CONTACTO, EVENTS.SUBMIT_CONTACTO)]:
    (ctx, p) => ({ state: STATES.ESCUELA_BUSCAR, ctx: { ...ctx, contacto: { ...ctx.contacto, ...p } } }),
  [k(STATES.CONTACTO, EVENTS.BACK)]:
    (ctx) => ({ state: STATES.LANDING, ctx }),

  [k(STATES.ESCUELA_BUSCAR, EVENTS.TO_LIBRE)]:
    (ctx) => ({ state: STATES.ESCUELA_LIBRE, ctx }),
  [k(STATES.ESCUELA_BUSCAR, EVENTS.PICK_ESCUELA)]:
    (ctx, p) => ({
      state: (p.grupos || []).length === 0 ? STATES.GRUPO_CREAR : STATES.GRUPO_ELEGIR,
      ctx: { ...ctx, escuela: p.escuela, grupos: p.grupos || [], grupo: null },
    }),
  [k(STATES.ESCUELA_BUSCAR, EVENTS.BACK)]:
    (ctx) => ({ state: STATES.CONTACTO, ctx }),

  [k(STATES.ESCUELA_LIBRE, EVENTS.TO_BUSCAR)]:
    (ctx) => ({ state: STATES.ESCUELA_BUSCAR, ctx }),
  [k(STATES.ESCUELA_LIBRE, EVENTS.SUBMIT_COLD)]:
    (ctx, p) => ({
      state: STATES.APELLIDO,
      ctx: { ...ctx, escuela: p.escuela, grupos: [p.grupo], grupo: p.grupo },
    }),
  [k(STATES.ESCUELA_LIBRE, EVENTS.BACK)]:
    (ctx) => ({ state: STATES.CONTACTO, ctx }),

  [k(STATES.GRUPO_ELEGIR, EVENTS.PICK_GRUPO)]:
    (ctx, p) => ({ state: STATES.APELLIDO, ctx: { ...ctx, grupo: p.grupo } }),
  [k(STATES.GRUPO_ELEGIR, EVENTS.BACK)]:
    (ctx) => ({ state: STATES.ESCUELA_BUSCAR, ctx: { ...ctx, escuela: null, grupos: [], grupo: null } }),

  [k(STATES.GRUPO_CREAR, EVENTS.SUBMIT_GRUPO)]:
    (ctx, p) => ({ state: STATES.APELLIDO, ctx: { ...ctx, grupo: p.grupo, grupos: [p.grupo] } }),
  [k(STATES.GRUPO_CREAR, EVENTS.BACK)]:
    (ctx) => ({ state: STATES.ESCUELA_BUSCAR, ctx: { ...ctx, escuela: null, grupos: [], grupo: null } }),

  [k(STATES.APELLIDO, EVENTS.SUBMIT_APELLIDO)]:
    (ctx, p) => ({ state: STATES.SUBMITTING, ctx: { ...ctx, apellido: p.apellido, error: null } }),
  [k(STATES.APELLIDO, EVENTS.BACK)]:
    (ctx) => ({
      // Si el grupo fue auto-creado (cold path), volver al picker de escuela.
      // Si fue elegido de una lista, volver al picker de grupos.
      state: ctx.grupo?._pendiente && ctx.grupos.length <= 1
        ? STATES.ESCUELA_BUSCAR
        : STATES.GRUPO_ELEGIR,
      ctx: { ...ctx, grupo: null },
    }),

  [k(STATES.SUBMITTING, EVENTS.SUBMIT_OK)]:
    (ctx, p) => ({ state: STATES.DONE, ctx: { ...ctx, familiaId: p.familiaId } }),
  [k(STATES.SUBMITTING, EVENTS.SUBMIT_FAIL)]:
    (ctx, p) => ({ state: STATES.APELLIDO, ctx: { ...ctx, error: p?.error || "Falló el alta" } }),
};

function k(state, event) {
  return `${state}|${event}`;
}

// =============================================================
// API pública
// =============================================================

export function transition(current, event, payload) {
  const handler = T[k(current.state, event)];
  if (!handler) return current; // no-op
  const next = handler(current.ctx, payload);
  return next;
}

// availableEvents(state) → lista de eventos que el state acepta.
// Útil para tests (BFS) y para el debug overlay.
export function availableEvents(state) {
  const prefix = `${state}|`;
  return Object.keys(T)
    .filter((k2) => k2.startsWith(prefix))
    .map((k2) => k2.slice(prefix.length));
}

// allStates() / allEvents() para tests.
export function allStates() { return Object.values(STATES); }
export function allEvents() { return Object.values(EVENTS); }
