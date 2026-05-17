// Pipeline de leads — orden visual + colores para Tags y badges.

export const LEAD_ESTADOS = [
  { value: "nuevo",       label: "Nuevo",       color: "blue",    description: "Recién entró — sin contactar" },
  { value: "contactado",  label: "Contactado",  color: "geekblue", description: "Ya le escribimos / llamamos" },
  { value: "calificado",  label: "Calificado",  color: "purple",  description: "Confirmado interés, en negociación" },
  { value: "convertido",  label: "Convertido",  color: "green",   description: "Vinculado a familia — completó onboarding" },
  { value: "descartado",  label: "Descartado",  color: "default", description: "No responde / sin interés" },
];

export const LEAD_ESTADO_COLOR = Object.fromEntries(LEAD_ESTADOS.map((e) => [e.value, e.color]));
export const LEAD_ESTADO_LABEL = Object.fromEntries(LEAD_ESTADOS.map((e) => [e.value, e.label]));

export const ACTIVIDAD_TIPOS = [
  { value: "nota",          label: "Nota",          color: "default" },
  { value: "email",         label: "Email",         color: "blue" },
  { value: "llamada",       label: "Llamada",       color: "geekblue" },
  { value: "whatsapp",      label: "WhatsApp",      color: "green" },
  { value: "reunion",       label: "Reunión",       color: "purple" },
  { value: "cambio_estado", label: "Estado",        color: "orange" },
  { value: "otro",          label: "Otro",          color: "default" },
];

export const ACTIVIDAD_COLOR = Object.fromEntries(ACTIVIDAD_TIPOS.map((t) => [t.value, t.color]));
export const ACTIVIDAD_LABEL = Object.fromEntries(ACTIVIDAD_TIPOS.map((t) => [t.value, t.label]));
