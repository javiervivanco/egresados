// Hook que pega la FSM pura con los side-effects. El componente view
// (OnboardingFunnel.jsx) lo consume y obtiene:
//   * state, ctx — para renderizar
//   * actions    — closures que ya saben qué effect llamar y qué evento
//                  dispatchar.
//
// La FSM en sí queda 100% testeable con `transition(state, event, ctx)`.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { EVENTS, STATES, initialState, transition } from "./machine";
import * as fx from "./effects";
import { track, attachLead, currentUTM } from "../funnel/tracking";

function reducer(state, action) {
  return transition(state, action.type, action.payload);
}

export function useOnboarding({ leadIdInitial = null } = {}) {
  const [machine, dispatch] = useReducer(reducer, undefined, initialState);
  const leadRef = useRef(leadIdInitial);
  const [escuelas, setEscuelas] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [legacyMode, setLegacyMode] = useState(false);

  // Bootstrap: cargar escuelas + ciudades. Si no hay escuelas pero sí
  // ciudades, el flow nuevo igual sirve (cold path con ciudad explícita).
  // Solo cae a legacyMode si supabase no responde en absoluto.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [esc, ciu] = await Promise.all([fx.fetchEscuelas(), fx.fetchCiudades()]);
        if (cancelled) return;
        setEscuelas(esc);
        setCiudades(ciu);
        setLegacyMode(ciu.length === 0); // sin ciudades el matching no opera
      } catch {
        if (!cancelled) setLegacyMode(true);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cuando se elige escuela, cargamos sus grupos.
  useEffect(() => {
    const id = machine.ctx.escuela?.id;
    if (!id || machine.ctx.escuela?._pendiente) { setGrupos([]); return; }
    let cancelled = false;
    fx.fetchGruposByEscuela(id).then((list) => { if (!cancelled) setGrupos(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, [machine.ctx.escuela?.id, machine.ctx.escuela?._pendiente]);

  // -------- Actions (closures que envuelven effects + dispatch) --------

  const start = useCallback(() => {
    track("onboarding_landing_start");
    dispatch({ type: EVENTS.START });
  }, []);

  const submitContacto = useCallback(async (contacto) => {
    leadRef.current = await fx.upsertLead({
      id: leadRef.current, ...contacto, ...currentUTM(),
    });
    attachLead(contacto.email);
    track("onboarding_contacto_submit", { lead_id: leadRef.current });
    dispatch({ type: EVENTS.SUBMIT_CONTACTO, payload: contacto });
  }, []);

  const toLibre = useCallback(() => { track("onboarding_escuela_libre"); dispatch({ type: EVENTS.TO_LIBRE }); }, []);
  const toBuscar = useCallback(() => dispatch({ type: EVENTS.TO_BUSCAR }), []);

  const pickEscuela = useCallback(async (escuela) => {
    const lista = await fx.fetchGruposByEscuela(escuela.id);
    setGrupos(lista);
    leadRef.current = await fx.upsertLead({ id: leadRef.current, email: machine.ctx.contacto.email, escuela_id: escuela.id });
    track("onboarding_escuela_pick", {
      escuela_id: escuela.id,
      ciudad_id: escuela.ciudad_id || null,
      grupos_cargados: lista.length,
    });
    dispatch({ type: EVENTS.PICK_ESCUELA, payload: { escuela, grupos: lista } });
  }, [machine.ctx.contacto.email]);

  const submitColdEscuela = useCallback(async ({ escuela_libre, grado_libre, anio_egreso, ciudad_id }) => {
    const nombre = (escuela_libre || "").trim();
    const grado = (grado_libre || "").trim();
    const anio = Number(anio_egreso) || new Date().getFullYear() + 1;
    const ciudadId = ciudad_id ? Number(ciudad_id) : null;
    leadRef.current = await fx.upsertLead({
      id: leadRef.current, email: machine.ctx.contacto.email,
      escuela_libre: nombre, grado_buscado: grado || null, anio_egreso: anio,
    });
    const escuelaId = await fx.createEscuelaPendiente({ nombre, ciudadId });
    const grupoId = await fx.createGrupoPendiente({ escuela_id: escuelaId, grado, anio_egreso: anio });
    track("onboarding_escuela_cold_submit", { escuela_id: escuelaId, grupo_id: grupoId, ciudad_id: ciudadId });
    dispatch({
      type: EVENTS.SUBMIT_COLD,
      payload: {
        escuela: { id: escuelaId, nombre, ciudad_id: ciudadId, _pendiente: true },
        grupo:   { id: grupoId, grado, anio_egreso: anio, _pendiente: true },
      },
    });
  }, [machine.ctx.contacto.email]);

  const pickGrupo = useCallback((grupo) => {
    dispatch({ type: EVENTS.PICK_GRUPO, payload: { grupo } });
  }, []);

  const submitGrupoCrear = useCallback(async ({ grado, anio_egreso }) => {
    const grp = (grado || "").trim();
    const anio = Number(anio_egreso) || new Date().getFullYear() + 1;
    const grupoId = await fx.createGrupoPendiente({
      escuela_id: machine.ctx.escuela.id, grado: grp, anio_egreso: anio,
    });
    dispatch({
      type: EVENTS.SUBMIT_GRUPO,
      payload: { grupo: { id: grupoId, grado: grp, anio_egreso: anio, _pendiente: true } },
    });
  }, [machine.ctx.escuela?.id]);

  const submitApellido = useCallback(async ({ apellido }) => {
    dispatch({ type: EVENTS.SUBMIT_APELLIDO, payload: { apellido } });
    try {
      const familiaId = await fx.findOrCreateFamilia({
        grupo_id: machine.ctx.grupo.id, apellido,
        email: machine.ctx.contacto.email, telefono: machine.ctx.contacto.telefono,
      });
      await fx.upsertLead({
        id: leadRef.current, email: machine.ctx.contacto.email,
        escuela_id: machine.ctx.escuela._pendiente ? null : machine.ctx.escuela.id,
        escuela_libre: machine.ctx.escuela._pendiente ? machine.ctx.escuela.nombre : null,
        grado_buscado: machine.ctx.grupo.grado || null,
        anio_egreso: machine.ctx.grupo.anio_egreso,
        familia_id: familiaId, apellido,
      });
      await fx.signInAnonAndLinkProfile({ familia_id: familiaId });
      track("onboarding_complete", { familia_id: familiaId, grupo_id: machine.ctx.grupo.id });
      dispatch({ type: EVENTS.SUBMIT_OK, payload: { familiaId } });
    } catch (err) {
      track("onboarding_fail", { error: err.message });
      dispatch({ type: EVENTS.SUBMIT_FAIL, payload: { error: err.message } });
    }
  }, [machine.ctx]);

  const back = useCallback(() => dispatch({ type: EVENTS.BACK }), []);

  const actions = useMemo(() => ({
    start, submitContacto, toLibre, toBuscar,
    pickEscuela, submitColdEscuela, pickGrupo, submitGrupoCrear,
    submitApellido, back,
  }), [start, submitContacto, toLibre, toBuscar, pickEscuela, submitColdEscuela, pickGrupo, submitGrupoCrear, submitApellido, back]);

  return {
    state: machine.state,
    ctx: machine.ctx,
    escuelas, ciudades, grupos,
    bootLoading, legacyMode,
    actions,
    isTerminal: machine.state === STATES.DONE,
  };
}
