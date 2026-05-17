// Resources de Refine. Cada `name` matchea exactamente el nombre de la tabla
// en Supabase (el data provider lo usa para construir queries).
//
// Resources "virtuales" (sin tabla) actúan como agrupadores en el sidebar.
//
// `meta.label` controla el texto en el sidebar; `meta.parent` agrupa en submenús.
// `meta.canDelete: true` hace que `<DeleteButton>` aparezca en el list scaffold.

export const resources = [
  // ─── Gobierno (solo super_admin via access control) ──────────
  { name: "gobierno", meta: { label: "Gobierno" } },
  {
    name: "empresas",
    list: "/empresas",
    create: "/empresas/create",
    edit: "/empresas/edit/:id",
    meta: { label: "Empresas", parent: "gobierno", canDelete: true },
  },
  {
    name: "escuelas",
    list: "/escuelas",
    create: "/escuelas/create",
    edit: "/escuelas/edit/:id",
    meta: { label: "Escuelas", parent: "gobierno", canDelete: true },
  },
  {
    name: "grupos",
    list: "/grupos",
    create: "/grupos/create",
    edit: "/grupos/edit/:id",
    meta: { label: "Grupos", parent: "gobierno", canDelete: true },
  },
  {
    name: "familias",
    list: "/familias",
    edit: "/familias/edit/:id",
    meta: { label: "Familias", parent: "gobierno", canDelete: true },
  },
  {
    name: "alumnos",
    list: "/alumnos",
    meta: { label: "Alumnos", parent: "gobierno" },
  },
  {
    name: "profiles",
    list: "/profiles",
    edit: "/profiles/edit/:id",
    meta: { label: "Usuarios", parent: "gobierno", idColumnName: "user_id" },
  },

  // ─── Oferta ───────────────────────────────────────────────────
  { name: "oferta", meta: { label: "Oferta" } },
  {
    name: "ciudades",
    list: "/ciudades",
    create: "/ciudades/create",
    edit: "/ciudades/edit/:id",
    meta: { label: "Ciudades", parent: "oferta", canDelete: true },
  },
  {
    name: "empresas_origenes",
    meta: { hide: true }, // gestionado dentro de empresas/edit, no en sidebar
  },
  {
    name: "destinos",
    list: "/destinos",
    create: "/destinos/create",
    edit: "/destinos/edit/:id",
    meta: { label: "Destinos", parent: "oferta", canDelete: true },
  },
  {
    name: "planes_viaje",
    list: "/planes",
    create: "/planes/create",
    edit: "/planes/edit/:id",
    meta: { label: "Planes", parent: "oferta", canDelete: true },
  },
  {
    name: "documentos",
    list: "/documentos",
    create: "/documentos/create",
    show: "/documentos/show/:id",
    meta: { label: "Documentos", parent: "oferta", canDelete: true },
  },

  // ─── Interacción ──────────────────────────────────────────────
  { name: "interaccion", meta: { label: "Interacción" } },
  {
    name: "fechas_reunion",
    list: "/fechas-reunion",
    create: "/fechas-reunion/create",
    edit: "/fechas-reunion/edit/:id",
    meta: { label: "Reuniones", parent: "interaccion", canDelete: true },
  },
  {
    name: "votos_fecha",
    list: "/votos-fecha",
    meta: { label: "Votos de fecha", parent: "interaccion" },
  },
  {
    name: "votos_plan",
    list: "/votos-plan",
    meta: { label: "Votos de plan", parent: "interaccion" },
  },
  {
    name: "mensajes",
    list: "/mensajes",
    meta: { label: "Mensajes", parent: "interaccion" },
  },

  // ─── Comercio ─────────────────────────────────────────────────
  { name: "comercio", meta: { label: "Comercio" } },
  {
    name: "ventas",
    list: "/ventas",
    create: "/ventas/create",
    edit: "/ventas/edit/:id",
    meta: { label: "Ventas", parent: "comercio", canDelete: true },
  },
  {
    name: "ventas_dashboard",
    list: "/ventas-dashboard",
    meta: { label: "Dashboard ventas", parent: "comercio" },
  },
  {
    name: "correcciones",
    list: "/correcciones",
    meta: { label: "Correcciones", parent: "comercio", canDelete: true },
  },
  {
    name: "leads",
    list: "/leads",
    show: "/leads/show/:id",
    edit: "/leads/edit/:id",
    meta: { label: "Leads", parent: "comercio", canDelete: true },
  },
  {
    name: "lead_actividades",
    meta: { hide: true }, // gestionado desde show de lead, no expuesto en sidebar
  },
];
