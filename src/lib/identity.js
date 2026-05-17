// Identidad de la familia visitando la app.
//
// Hoy convivimos con dos modelos:
//   * LEGACY: un string libre ("familia García") guardado en localStorage como
//     `egresados_familia`. Usado por el frontend pre-multi-tenancy.
//   * NUEVO: familia_id + grupo_id (FKs a la DB), guardados como
//     `egresados_familia_id` y `egresados_grupo_id`. El string libre se sigue
//     guardando para que el VotingResults legacy (que filtra por nombre) siga
//     funcionando.
//
// Esta es la única superficie donde se lee/escribe la identidad. App.jsx y
// componentes nuevos deberían pasar por acá.

const KEY_LEGACY = "egresados_familia";
const KEY_FAMILIA = "egresados_familia_id";
const KEY_GRUPO = "egresados_grupo_id";

export function loadIdentity() {
  return {
    nombre:    localStorage.getItem(KEY_LEGACY) || "",
    familiaId: numOrNull(localStorage.getItem(KEY_FAMILIA)),
    grupoId:   numOrNull(localStorage.getItem(KEY_GRUPO)),
  };
}

export function saveIdentity({ nombre, familiaId, grupoId }) {
  if (nombre != null)    localStorage.setItem(KEY_LEGACY, nombre);
  if (familiaId != null) localStorage.setItem(KEY_FAMILIA, String(familiaId));
  if (grupoId != null)   localStorage.setItem(KEY_GRUPO, String(grupoId));
}

export function clearIdentity() {
  localStorage.removeItem(KEY_LEGACY);
  localStorage.removeItem(KEY_FAMILIA);
  localStorage.removeItem(KEY_GRUPO);
}

function numOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
