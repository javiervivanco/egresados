import { describe, it, expect, beforeEach } from "vitest";
import {
  parseUTM, getOrCreateSessionId, resolveUTM, buildPayload,
} from "../tracking";

// In-memory storage compatible con la interfaz localStorage para no tocar
// el DOM en los tests.
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    _raw: m,
  };
}

describe("tracking · parseUTM", () => {
  it("extrae todas las claves utm presentes en query string", () => {
    const out = parseUTM("?utm_source=fb&utm_campaign=egresados26&otra=x");
    expect(out).toEqual({ utm_source: "fb", utm_campaign: "egresados26" });
  });

  it("acepta search sin '?' inicial", () => {
    const out = parseUTM("utm_medium=cpc");
    expect(out).toEqual({ utm_medium: "cpc" });
  });

  it("ignora valores vacíos o whitespace-only", () => {
    expect(parseUTM("?utm_source=&utm_medium=   ")).toEqual({});
  });

  it("devuelve {} para inputs no string", () => {
    expect(parseUTM(undefined)).toEqual({});
    expect(parseUTM(null)).toEqual({});
    expect(parseUTM("")).toEqual({});
  });
});

describe("tracking · getOrCreateSessionId", () => {
  it("reusa el session_id existente", () => {
    const s = memStorage();
    s.setItem("egresados_session_id", "fixed_session");
    expect(getOrCreateSessionId(s)).toBe("fixed_session");
  });

  it("genera y persiste uno nuevo si no existe", () => {
    const s = memStorage();
    const id1 = getOrCreateSessionId(s);
    expect(id1).toMatch(/^s_[a-z0-9]+_[a-z0-9]+$/i);
    const id2 = getOrCreateSessionId(s);
    expect(id2).toBe(id1); // estable
  });
});

describe("tracking · resolveUTM", () => {
  beforeEach(() => {});

  it("URL gana sobre storage cuando vienen UTM en URL", () => {
    const s = memStorage();
    s.setItem("egresados_utm", JSON.stringify({ utm_source: "old" }));
    const out = resolveUTM({ search: "?utm_source=new", storage: s });
    expect(out).toEqual({ utm_source: "new" });
    expect(JSON.parse(s.getItem("egresados_utm"))).toEqual({ utm_source: "new" });
  });

  it("usa storage si URL no trae UTM", () => {
    const s = memStorage();
    s.setItem("egresados_utm", JSON.stringify({ utm_campaign: "primavera" }));
    const out = resolveUTM({ search: "?foo=bar", storage: s });
    expect(out).toEqual({ utm_campaign: "primavera" });
  });

  it("devuelve {} y no rompe con JSON corrupto en storage", () => {
    const s = memStorage();
    s.setItem("egresados_utm", "{not json");
    const out = resolveUTM({ search: "", storage: s });
    expect(out).toEqual({});
  });
});

describe("tracking · buildPayload", () => {
  it("compone payload con email y ctx + utm bajo la misma clave", () => {
    const p = buildPayload({
      evento: "onboarding_complete",
      email: "a@b.com",
      ctx: { grupoId: 5 },
      utm: { utm_source: "ig" },
      sessionId: "s_abc",
    });
    expect(p).toEqual({
      p_evento: "onboarding_complete",
      p_email: "a@b.com",
      p_ctx: { grupoId: 5, utm: { utm_source: "ig" } },
      p_session_id: "s_abc",
    });
  });

  it("omite utm si no hay claves (no contamina ctx con {utm:{}})", () => {
    const p = buildPayload({ evento: "x", email: null, ctx: { a: 1 }, utm: {} });
    expect(p.p_ctx).toEqual({ a: 1 });
    expect(p.p_email).toBeNull();
    expect(p.p_session_id).toBeNull();
  });

  it("preserva email vacío como null (no string vacío)", () => {
    const p = buildPayload({ evento: "x", email: "", ctx: {}, utm: {} });
    expect(p.p_email).toBeNull();
  });
});
