// Tabla de verdad de classify(). Cubrimos cada tipo + casos límite.

import { describe, it, expect } from "vitest";
import { classify, nudgeFor, VISITOR, TIBIO_HOURS } from "../classify";

const NOW = 1700000000000;
const HOURS = (n) => n * 3600_000;

describe("visitor · classify", () => {
  it("ANON_PURO sin nada", () => {
    expect(classify({ nowMs: NOW })).toBe(VISITOR.ANON_PURO);
  });

  it("ANON_UTM con cualquier utm key presente", () => {
    expect(classify({ urlUTM: { utm_source: "ig" }, nowMs: NOW })).toBe(VISITOR.ANON_UTM);
  });

  it("ANON_PURO si urlUTM es objeto vacío", () => {
    expect(classify({ urlUTM: {}, nowMs: NOW })).toBe(VISITOR.ANON_PURO);
  });

  it("LEAD_FRIO con urlToken (sin familia)", () => {
    expect(classify({ urlToken: "t_xyz", nowMs: NOW })).toBe(VISITOR.LEAD_FRIO);
  });

  it("LEAD_FRIO con leadKnown (sin familia)", () => {
    expect(classify({ leadKnown: true, nowMs: NOW })).toBe(VISITOR.LEAD_FRIO);
  });

  it("FAMILIA_ACTIVA cuando hay familiaId y la última actividad es reciente", () => {
    expect(classify({
      identity: { familiaId: 1 },
      lastSeenAtMs: NOW - HOURS(2),
      nowMs: NOW,
    })).toBe(VISITOR.FAMILIA_ACTIVA);
  });

  it("FAMILIA_ACTIVA sin lastSeenAt (asumimos activa por defecto)", () => {
    expect(classify({
      identity: { familiaId: 1 },
      lastSeenAtMs: null,
      nowMs: NOW,
    })).toBe(VISITOR.FAMILIA_ACTIVA);
  });

  it("LEAD_TIBIO si pasó más del umbral sin actividad", () => {
    expect(classify({
      identity: { familiaId: 1 },
      lastSeenAtMs: NOW - HOURS(TIBIO_HOURS + 1),
      nowMs: NOW,
    })).toBe(VISITOR.LEAD_TIBIO);
  });

  it("FAMILIA_ACTIVA justo en el umbral (boundary inclusive del lado activo)", () => {
    expect(classify({
      identity: { familiaId: 1 },
      lastSeenAtMs: NOW - HOURS(TIBIO_HOURS),
      nowMs: NOW,
    })).toBe(VISITOR.FAMILIA_ACTIVA);
  });

  it("CLIENTE_CONFIRMADO gana incluso si la familia parece tibia o no hay identity", () => {
    expect(classify({ ventaConfirmada: true, nowMs: NOW })).toBe(VISITOR.CLIENTE_CONFIRMADO);
    expect(classify({
      ventaConfirmada: true,
      identity: { familiaId: 1 }, lastSeenAtMs: NOW - HOURS(1000),
      nowMs: NOW,
    })).toBe(VISITOR.CLIENTE_CONFIRMADO);
  });

  it("urlToken se ignora si ya hay familia (la familia gana)", () => {
    expect(classify({
      identity: { familiaId: 1 },
      urlToken: "t_xyz",
      nowMs: NOW,
    })).toBe(VISITOR.FAMILIA_ACTIVA);
  });

  it("UTM se ignora si hay urlToken (el token es señal más fuerte)", () => {
    expect(classify({
      urlToken: "t_xyz",
      urlUTM: { utm_source: "ig" },
      nowMs: NOW,
    })).toBe(VISITOR.LEAD_FRIO);
  });
});

describe("visitor · nudgeFor", () => {
  it("devuelve copy para cada tipo no terminal", () => {
    expect(nudgeFor(VISITOR.ANON_PURO)).toMatchObject({ title: expect.any(String) });
    expect(nudgeFor(VISITOR.ANON_UTM)).toMatchObject({ title: expect.any(String) });
    expect(nudgeFor(VISITOR.LEAD_FRIO)).toMatchObject({ title: expect.any(String) });
    expect(nudgeFor(VISITOR.LEAD_TIBIO)).toMatchObject({ title: expect.any(String) });
  });

  it("devuelve null para FAMILIA_ACTIVA y CLIENTE_CONFIRMADO (no necesitan banner)", () => {
    expect(nudgeFor(VISITOR.FAMILIA_ACTIVA)).toBeNull();
    expect(nudgeFor(VISITOR.CLIENTE_CONFIRMADO)).toBeNull();
  });

  it("null para tipo desconocido", () => {
    expect(nudgeFor("???")).toBeNull();
  });
});
