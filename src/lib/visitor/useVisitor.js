// Pega los signals (URL, identidad, DB) con classify(). El componente App
// llama esto y obtiene el tipo de visitante listo para rutear.
//
// Fast-path: si tenemos familiaId en localStorage, podemos clasificar sin
// esperar DB (FAMILIA_ACTIVA por defecto, refinamos a TIBIO si el fetch
// devuelve last_seen viejo).

import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { loadIdentity } from "../identity";
import { classify, VISITOR } from "./classify";
import { resolveUTM } from "../funnel/tracking";

export function useVisitor() {
  const [identity] = useState(() => loadIdentity());
  const [urlState] = useState(() => parseURL());
  const [dbState, setDbState] = useState({
    ventaConfirmada: false,
    lastSeenAtMs: null,
    leadKnown: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) setDbState((s) => ({ ...s, loading: false }));
        return;
      }
      const ventaConfirmadaP = identity.grupoId
        ? supabase.from("ventas")
            .select("id", { count: "exact", head: true })
            .eq("grupo_id", identity.grupoId)
            .in("estado", ["confirmada", "pagada", "liquidada"])
        : Promise.resolve({ count: 0 });

      const familiaP = identity.familiaId
        ? supabase.from("familias")
            .select("created_at")
            .eq("id", identity.familiaId)
            .maybeSingle()
        : Promise.resolve({ data: null });

      // Si vino email por URL o token, buscar lead conocido.
      const leadP = (urlState.urlToken || urlState.urlEmail)
        ? supabase.from("leads")
            .select("id, familia_id, last_seen_at")
            .eq("email", urlState.urlEmail || "__none__")
            .maybeSingle()
        : Promise.resolve({ data: null });

      const [venta, fam, lead] = await Promise.all([ventaConfirmadaP, familiaP, leadP]);
      if (cancelled) return;

      const lastSeen = lead?.data?.last_seen_at || fam?.data?.created_at || null;
      setDbState({
        ventaConfirmada: (venta?.count ?? 0) > 0,
        lastSeenAtMs: lastSeen ? new Date(lastSeen).getTime() : null,
        leadKnown: !!(lead?.data?.id && !lead?.data?.familia_id),
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, [identity.familiaId, identity.grupoId, urlState.urlToken, urlState.urlEmail]);

  const type = classify({
    identity,
    urlToken: urlState.urlToken,
    urlUTM: urlState.urlUTM,
    leadKnown: dbState.leadKnown,
    ventaConfirmada: dbState.ventaConfirmada,
    lastSeenAtMs: dbState.lastSeenAtMs,
  });

  return {
    type,
    identity,
    url: urlState,
    loading: dbState.loading,
    isAnon: type === VISITOR.ANON_PURO || type === VISITOR.ANON_UTM,
    isFamilia: type === VISITOR.FAMILIA_ACTIVA || type === VISITOR.LEAD_TIBIO || type === VISITOR.CLIENTE_CONFIRMADO,
  };
}

function parseURL() {
  if (typeof window === "undefined") return { urlToken: null, urlEmail: null, urlInvitacion: null, urlUTM: {} };
  const sp = new URLSearchParams(window.location.search);
  const urlToken = sp.get("t") || sp.get("token") || null;
  const urlEmail = sp.get("email") || null;
  const urlInvitacion = sp.get("inv") || null;
  let urlUTM = {};
  try {
    urlUTM = resolveUTM({ search: window.location.search, storage: window.localStorage });
  } catch { /* ignore */ }
  return { urlToken, urlEmail, urlInvitacion, urlUTM };
}
