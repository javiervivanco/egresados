// Tests de la FSM pura. Sin React, sin DOM, sin Supabase.
//
// Cubren dos clases de garantías:
// 1) Transiciones puntuales: cada (state, event) bien definido produce el
//    estado esperado y actualiza el ctx correctamente.
// 2) Reachability: BFS sobre todas las combinaciones (state, event); cada
//    estado del enum debe ser alcanzable desde LANDING y DONE debe ser
//    alcanzable desde cada estado no terminal.
//
// Si en el futuro se agrega un STATE nuevo, la reachability hace fallar el
// build hasta que existan transiciones desde y hacia él. Esto es lo que
// evita el dead-end class de bug que motivó este refactor.

import { describe, it, expect } from "vitest";
import {
  STATES, EVENTS, transition, initialState,
  availableEvents, allStates, allEvents, isTerminal,
} from "../machine";

describe("FSM onboarding · transiciones puntuales", () => {
  it("LANDING → CONTACTO con START", () => {
    const init = initialState();
    const next = transition(init, EVENTS.START);
    expect(next.state).toBe(STATES.CONTACTO);
  });

  it("CONTACTO → ESCUELA_BUSCAR persiste contacto en ctx", () => {
    const s = { state: STATES.CONTACTO, ctx: initialState().ctx };
    const next = transition(s, EVENTS.SUBMIT_CONTACTO, { email: "a@b.com", apellido: "García" });
    expect(next.state).toBe(STATES.ESCUELA_BUSCAR);
    expect(next.ctx.contacto.email).toBe("a@b.com");
    expect(next.ctx.contacto.apellido).toBe("García");
  });

  it("PICK_ESCUELA con grupos.length===0 → GRUPO_CREAR (no GRUPO_ELEGIR)", () => {
    const s = { state: STATES.ESCUELA_BUSCAR, ctx: initialState().ctx };
    const next = transition(s, EVENTS.PICK_ESCUELA, { escuela: { id: 1, nombre: "X" }, grupos: [] });
    expect(next.state).toBe(STATES.GRUPO_CREAR);
    expect(next.ctx.escuela.id).toBe(1);
  });

  it("PICK_ESCUELA con grupos cargados → GRUPO_ELEGIR", () => {
    const s = { state: STATES.ESCUELA_BUSCAR, ctx: initialState().ctx };
    const next = transition(s, EVENTS.PICK_ESCUELA, {
      escuela: { id: 1, nombre: "X" },
      grupos: [{ id: 10, grado: "6to", anio_egreso: 2026 }],
    });
    expect(next.state).toBe(STATES.GRUPO_ELEGIR);
    expect(next.ctx.grupos).toHaveLength(1);
  });

  it("ESCUELA_LIBRE → APELLIDO con SUBMIT_COLD (puente sin dead-end)", () => {
    const s = { state: STATES.ESCUELA_LIBRE, ctx: initialState().ctx };
    const next = transition(s, EVENTS.SUBMIT_COLD, {
      escuela: { id: 99, nombre: "Mi colegio", _pendiente: true },
      grupo:   { id: 100, grado: "6to A", anio_egreso: 2026, _pendiente: true },
    });
    expect(next.state).toBe(STATES.APELLIDO);
    expect(next.ctx.grupo._pendiente).toBe(true);
  });

  it("APELLIDO → SUBMITTING → DONE", () => {
    let s = { state: STATES.APELLIDO, ctx: { ...initialState().ctx, grupo: { id: 1 } } };
    s = transition(s, EVENTS.SUBMIT_APELLIDO, { apellido: "García" });
    expect(s.state).toBe(STATES.SUBMITTING);
    s = transition(s, EVENTS.SUBMIT_OK, { familiaId: 42 });
    expect(s.state).toBe(STATES.DONE);
    expect(s.ctx.familiaId).toBe(42);
  });

  it("SUBMITTING → APELLIDO en SUBMIT_FAIL (recuperable)", () => {
    const s = { state: STATES.SUBMITTING, ctx: initialState().ctx };
    const next = transition(s, EVENTS.SUBMIT_FAIL, { error: "boom" });
    expect(next.state).toBe(STATES.APELLIDO);
    expect(next.ctx.error).toBe("boom");
  });

  it("evento desconocido es no-op", () => {
    const s = { state: STATES.CONTACTO, ctx: initialState().ctx };
    const next = transition(s, "EVENTO_QUE_NO_EXISTE");
    expect(next).toBe(s);
  });

  it("BACK desde APELLIDO con grupo pendiente vuelve a ESCUELA_BUSCAR", () => {
    const s = {
      state: STATES.APELLIDO,
      ctx: { ...initialState().ctx, grupo: { id: 1, _pendiente: true }, grupos: [{ id: 1 }] },
    };
    const next = transition(s, EVENTS.BACK);
    expect(next.state).toBe(STATES.ESCUELA_BUSCAR);
  });

  it("BACK desde APELLIDO con grupo elegido vuelve a GRUPO_ELEGIR", () => {
    const s = {
      state: STATES.APELLIDO,
      ctx: { ...initialState().ctx, grupo: { id: 1 }, grupos: [{ id: 1 }, { id: 2 }] },
    };
    const next = transition(s, EVENTS.BACK);
    expect(next.state).toBe(STATES.GRUPO_ELEGIR);
  });
});

describe("FSM onboarding · invariantes del árbol", () => {
  it("isTerminal solo es true para DONE", () => {
    expect(isTerminal(STATES.DONE)).toBe(true);
    for (const s of allStates()) {
      if (s !== STATES.DONE) expect(isTerminal(s)).toBe(false);
    }
  });

  it("todo STATE no terminal tiene al menos un evento saliente", () => {
    const huerfanos = allStates().filter((s) => !isTerminal(s) && availableEvents(s).length === 0);
    expect(huerfanos).toEqual([]);
  });

  it("DONE no tiene eventos salientes (es terminal absoluto)", () => {
    expect(availableEvents(STATES.DONE)).toEqual([]);
  });

  it("reachability: todo STATE es alcanzable desde LANDING", () => {
    const alcanzados = bfs();
    const faltantes = allStates().filter((s) => !alcanzados.has(s));
    expect(faltantes).toEqual([]);
  });

  it("DONE es alcanzable desde cada STATE no terminal (no hay dead-ends)", () => {
    for (const inicio of allStates()) {
      if (isTerminal(inicio)) continue;
      const alcanzados = bfs(inicio);
      expect.soft(alcanzados.has(STATES.DONE)).toBe(true);
    }
  });
});

// BFS por el grafo de transiciones. Para cada (state, event) probamos
// TODAS las variantes de payload que branchean (p.ej. PICK_ESCUELA con y
// sin grupos). Si la transición devuelve un nuevo estado, se enqueue.
function bfs(start = STATES.LANDING) {
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const ev of availableEvents(cur)) {
      for (const payload of mockPayloads(cur, ev)) {
        const ctxBase = ctxFor(cur, payload);
        const next = transition({ state: cur, ctx: ctxBase }, ev, payload);
        if (!visited.has(next.state)) {
          visited.add(next.state);
          queue.push(next.state);
        }
      }
    }
  }
  return visited;
}

// Devuelve TODAS las variantes representativas para que el BFS visite las
// ramas de un evento branchy.
function mockPayloads(state, event) {
  if (event === EVENTS.SUBMIT_CONTACTO) return [{ email: "x@y.com" }];
  if (event === EVENTS.PICK_ESCUELA) return [
    { escuela: { id: 1, nombre: "x" }, grupos: [{ id: 1 }] },  // → GRUPO_ELEGIR
    { escuela: { id: 1, nombre: "x" }, grupos: [] },           // → GRUPO_CREAR
  ];
  if (event === EVENTS.SUBMIT_COLD) return [
    { escuela: { id: 1, _pendiente: true }, grupo: { id: 1, _pendiente: true } },
  ];
  if (event === EVENTS.PICK_GRUPO) return [{ grupo: { id: 1 } }];
  if (event === EVENTS.SUBMIT_GRUPO) return [{ grupo: { id: 1, _pendiente: true } }];
  if (event === EVENTS.SUBMIT_APELLIDO) return [{ apellido: "García" }];
  if (event === EVENTS.SUBMIT_OK) return [{ familiaId: 42 }];
  if (event === EVENTS.SUBMIT_FAIL) return [{ error: "x" }];
  return [undefined];
}

function ctxFor(state, _payload) {
  const base = initialState().ctx;
  if (state === STATES.APELLIDO || state === STATES.SUBMITTING) {
    return { ...base, escuela: { id: 1 }, grupo: { id: 1 }, grupos: [{ id: 1 }] };
  }
  return base;
}

describe("FSM onboarding · escenarios end-to-end", () => {
  it("camino happy con escuela existente y grupo elegido", () => {
    let s = initialState();
    s = transition(s, EVENTS.START);
    s = transition(s, EVENTS.SUBMIT_CONTACTO, { email: "a@b.com" });
    s = transition(s, EVENTS.PICK_ESCUELA, {
      escuela: { id: 1, nombre: "X" },
      grupos: [{ id: 10, grado: "6to", anio_egreso: 2026 }],
    });
    s = transition(s, EVENTS.PICK_GRUPO, { grupo: { id: 10 } });
    s = transition(s, EVENTS.SUBMIT_APELLIDO, { apellido: "García" });
    s = transition(s, EVENTS.SUBMIT_OK, { familiaId: 99 });
    expect(s.state).toBe(STATES.DONE);
    expect(s.ctx.familiaId).toBe(99);
  });

  it("camino cold: escuela no existe → crear pendiente → done", () => {
    let s = initialState();
    s = transition(s, EVENTS.START);
    s = transition(s, EVENTS.SUBMIT_CONTACTO, { email: "a@b.com" });
    s = transition(s, EVENTS.TO_LIBRE);
    s = transition(s, EVENTS.SUBMIT_COLD, {
      escuela: { id: 50, nombre: "Mi cole", _pendiente: true },
      grupo:   { id: 60, grado: "6to", anio_egreso: 2026, _pendiente: true },
    });
    s = transition(s, EVENTS.SUBMIT_APELLIDO, { apellido: "Pérez" });
    s = transition(s, EVENTS.SUBMIT_OK, { familiaId: 7 });
    expect(s.state).toBe(STATES.DONE);
    expect(s.ctx.escuela._pendiente).toBe(true);
  });

  it("camino híbrido: escuela existe pero sin grupos → crear grupo pendiente → done", () => {
    let s = initialState();
    s = transition(s, EVENTS.START);
    s = transition(s, EVENTS.SUBMIT_CONTACTO, { email: "a@b.com" });
    s = transition(s, EVENTS.PICK_ESCUELA, { escuela: { id: 1, nombre: "X" }, grupos: [] });
    expect(s.state).toBe(STATES.GRUPO_CREAR);
    s = transition(s, EVENTS.SUBMIT_GRUPO, { grupo: { id: 11, grado: "7mo", anio_egreso: 2026, _pendiente: true } });
    expect(s.state).toBe(STATES.APELLIDO);
    s = transition(s, EVENTS.SUBMIT_APELLIDO, { apellido: "López" });
    s = transition(s, EVENTS.SUBMIT_OK, { familiaId: 11 });
    expect(s.state).toBe(STATES.DONE);
  });

  it("recovery: SUBMIT_FAIL deja al usuario en APELLIDO con error y permite reintento", () => {
    let s = initialState();
    s = transition(s, EVENTS.START);
    s = transition(s, EVENTS.SUBMIT_CONTACTO, { email: "a@b.com" });
    s = transition(s, EVENTS.PICK_ESCUELA, { escuela: { id: 1, nombre: "X" }, grupos: [{ id: 10 }] });
    s = transition(s, EVENTS.PICK_GRUPO, { grupo: { id: 10 } });
    s = transition(s, EVENTS.SUBMIT_APELLIDO, { apellido: "García" });
    s = transition(s, EVENTS.SUBMIT_FAIL, { error: "RLS" });
    expect(s.state).toBe(STATES.APELLIDO);
    expect(s.ctx.error).toBe("RLS");
    s = transition(s, EVENTS.SUBMIT_APELLIDO, { apellido: "García" });
    s = transition(s, EVENTS.SUBMIT_OK, { familiaId: 1 });
    expect(s.state).toBe(STATES.DONE);
  });
});
