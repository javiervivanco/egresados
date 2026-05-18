import { describe, it, expect } from "vitest";
import { filtrarPorCiudad } from "../data";

const MENDOZA = 9;
const CORDOBA = 5;
const BSAS = 1;

// Empresas:
//   E1 opera Mendoza+Córdoba
//   E2 opera solo Córdoba
//   E3 sin origenes (no debería aparecer si plan no override)
const EMPRESAS_DESDE_MENDOZA = [1];          // E1
const EMPRESAS_DESDE_CORDOBA = [1, 2];       // E1, E2

const PLANES = [
  // (a) plan con origen específico Mendoza
  { id: 1, origen_ciudad_id: MENDOZA, destinos: { empresa_id: 1 } },
  // (a) plan con origen específico Córdoba
  { id: 2, origen_ciudad_id: CORDOBA, destinos: { empresa_id: 1 } },
  // (b) plan sin override de E1 → hereda (Mendoza Y Córdoba)
  { id: 3, origen_ciudad_id: null, destinos: { empresa_id: 1 } },
  // (b) plan sin override de E2 → hereda solo Córdoba
  { id: 4, origen_ciudad_id: null, destinos: { empresa_id: 2 } },
  // (b) plan de E3 sin overrides → no aparece para ninguna ciudad
  { id: 5, origen_ciudad_id: null, destinos: { empresa_id: 3 } },
  // (a) plan de E3 override Bs As → solo aparece en Bs As
  { id: 6, origen_ciudad_id: BSAS, destinos: { empresa_id: 3 } },
];

describe("data · filtrarPorCiudad", () => {
  it("sin ciudadId devuelve data intacta (modo legacy / admin preview)", () => {
    expect(filtrarPorCiudad(PLANES, null, [])).toEqual(PLANES);
  });

  it("ciudadId=Mendoza incluye override Mendoza y heredados de empresas que operan Mendoza", () => {
    const out = filtrarPorCiudad(PLANES, MENDOZA, EMPRESAS_DESDE_MENDOZA);
    const ids = out.map((p) => p.id).sort();
    expect(ids).toEqual([1, 3]);
  });

  it("ciudadId=Córdoba incluye override Córdoba + heredados de E1, E2", () => {
    const out = filtrarPorCiudad(PLANES, CORDOBA, EMPRESAS_DESDE_CORDOBA);
    const ids = out.map((p) => p.id).sort();
    expect(ids).toEqual([2, 3, 4]);
  });

  it("ciudadId=BsAs sin empresas herencia → solo override directo a BsAs", () => {
    const out = filtrarPorCiudad(PLANES, BSAS, []);
    const ids = out.map((p) => p.id).sort();
    expect(ids).toEqual([6]);
  });

  it("override gana sobre herencia: si plan tiene origen propio NO matchea ciudad, no aparece aunque empresa opere ahí", () => {
    // Plan id=1 tiene origen Mendoza. Si la familia es de Córdoba, no debe verlo
    // aunque E1 opere desde Córdoba.
    const out = filtrarPorCiudad([PLANES[0]], CORDOBA, EMPRESAS_DESDE_CORDOBA);
    expect(out).toEqual([]);
  });

  it("empresaIdsHerencia null se trata como [] (no rompe)", () => {
    expect(filtrarPorCiudad(PLANES, MENDOZA, null).map((p) => p.id).sort()).toEqual([1]);
  });
});
