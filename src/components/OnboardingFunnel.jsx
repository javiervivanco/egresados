import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users, GraduationCap, MapPin, CalendarClock, MessageSquare, Vote,
  ArrowRight, ArrowLeft, Check, Mail, Search,
} from "lucide-react";
import { supabase } from "../supabase";
import { saveIdentity } from "../lib/identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// FUNNEL DE ONBOARDING + LEAD CAPTURE
// Pasos: landing → contacto (lead!) → escuela → grupo → conversión.
// Validación zod por step, lead se persiste en cada paso.

const contactoSchema = z.object({
  email: z.string().min(1, "Email requerido").email("Email inválido"),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
});

const apellidoSchema = z.object({
  apellido: z.string().min(1, "Apellido requerido"),
});

const escuelaLibreSchema = z.object({
  escuela_libre: z.string().min(2, "Tipeá el nombre de tu escuela"),
  grado_libre: z.string().optional(),
  anio_egreso: z.coerce.number().int().min(2024).max(2050).optional(),
});

export default function OnboardingFunnel({ onReady }) {
  const [bootLoading, setBootLoading] = useState(true);
  const [legacyMode, setLegacyMode] = useState(false);
  const [escuelas, setEscuelas] = useState([]);

  const [step, setStep] = useState(0);
  const [contacto, setContacto] = useState({ email: "", apellido: "", telefono: "" });
  const [leadId, setLeadId] = useState(null);

  const [escuela, setEscuela] = useState(null);
  const [escuelaSearch, setEscuelaSearch] = useState("");

  const [grupos, setGrupos] = useState([]);
  const [grupo, setGrupo] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [legacyNombre, setLegacyNombre] = useState("");
  const [coldDone, setColdDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) { active && setLegacyMode(true); active && setBootLoading(false); return; }
      const { data, error } = await supabase
        .from("escuelas").select("id, nombre, localidad").order("nombre");
      if (!active) return;
      if (error || !data) setLegacyMode(true);
      else setEscuelas(data);
      setBootLoading(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!escuela || !supabase) return;
    let active = true;
    supabase.from("grupos").select("id, anio_egreso, grado, estado")
      .eq("escuela_id", escuela.id).eq("estado", "activo")
      .order("anio_egreso", { ascending: false })
      .then(({ data }) => { if (active) setGrupos(data || []); });
    return () => { active = false; };
  }, [escuela]);

  const escuelasFiltradas = useMemo(() => {
    const q = escuelaSearch.trim().toLowerCase();
    if (!q) return escuelas;
    return escuelas.filter((e) =>
      e.nombre.toLowerCase().includes(q) ||
      (e.localidad || "").toLowerCase().includes(q)
    );
  }, [escuelas, escuelaSearch]);

  const upsertLead = async (extra = {}) => {
    if (!supabase) return null;
    const params = {
      p_id: leadId,
      p_email: (extra.email ?? contacto.email)?.trim() || null,
      p_apellido: (extra.apellido ?? contacto.apellido)?.trim() || null,
      p_telefono: (extra.telefono ?? contacto.telefono)?.trim() || null,
      p_escuela_id: extra.escuela_id ?? null,
      p_escuela_libre: extra.escuela_libre ?? null,
      p_grado_buscado: extra.grado_buscado ?? null,
      p_anio_egreso: extra.anio_egreso ?? null,
      p_familia_id: extra.familia_id ?? null,
    };
    const { data, error } = await supabase.rpc("lead_upsert", params);
    if (error) { console.warn("lead_upsert:", error.message); return leadId; }
    if (!leadId && data) setLeadId(data);
    return data || leadId;
  };

  const onContacto = async (values) => {
    setContacto(values);
    setError(null);
    await upsertLead({ email: values.email, apellido: values.apellido, telefono: values.telefono });
    setStep(2);
  };

  const onPickEscuela = async (e) => {
    setEscuela(e);
    await upsertLead({ escuela_id: e.id, escuela_libre: null });
    setStep(3);
  };

  const onColdLead = async (values) => {
    setError(null);
    await upsertLead({
      escuela_libre: values.escuela_libre.trim(),
      grado_buscado: values.grado_libre?.trim() || null,
      anio_egreso: values.anio_egreso || null,
    });
    setColdDone(true);
  };

  const onFinish = async (values) => {
    if (!grupo) return;
    setSubmitting(true); setError(null);
    const apellido = values.apellido.trim();
    setContacto((c) => ({ ...c, apellido }));

    const { data: existing } = await supabase
      .from("familias")
      .select("id")
      .eq("grupo_id", grupo.id)
      .ilike("apellido", apellido)
      .limit(1);

    let familiaId = existing?.[0]?.id;
    if (!familiaId) {
      const { data, error } = await supabase
        .from("familias")
        .insert({
          grupo_id: grupo.id, apellido, email: contacto.email.trim() || null,
          telefono: contacto.telefono?.trim() || null,
        })
        .select("id").single();
      if (error) { setError(error.message); setSubmitting(false); return; }
      familiaId = data.id;
    }

    await upsertLead({
      escuela_id: escuela.id,
      grado_buscado: grupo.grado,
      anio_egreso: grupo.anio_egreso,
      familia_id: familiaId,
      apellido,
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { error: authErr } = await supabase.auth.signInAnonymously();
      if (authErr) { setError("Auth: " + authErr.message); setSubmitting(false); return; }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({
        user_id: user.id,
        rol: "familia",
        nombre: `Familia ${apellido}`,
        familia_id: familiaId,
      });
    }

    const nombre = `Familia ${apellido}`;
    saveIdentity({ nombre, familiaId, grupoId: grupo.id });
    setSubmitting(false);
    onReady({ nombre, familiaId, grupoId: grupo.id });
  };

  const submitLegacy = () => {
    const v = legacyNombre.trim();
    if (!v) return;
    saveIdentity({ nombre: v });
    onReady({ nombre: v, familiaId: null, grupoId: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-background to-accent/10">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-red-500 via-green-500 via-cyan-500 via-blue-500 to-fuchsia-500" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <Header />
        {bootLoading ? (
          <CardShell><p className="text-muted-foreground text-sm text-center">Cargando…</p></CardShell>
        ) : legacyMode ? (
          <LegacyForm value={legacyNombre} onChange={setLegacyNombre} onSubmit={submitLegacy} />
        ) : step === 0 ? (
          <Landing onStart={() => setStep(1)} />
        ) : coldDone ? (
          <ColdLeadDone email={contacto.email} />
        ) : (
          <CardShell>
            <Progress value={(step / 3) * 100} className="mb-6 h-1.5" />
            <Steps current={step} />
            {step === 1 && (
              <ContactoStep
                defaultValues={contacto}
                error={error}
                onSubmit={onContacto}
                onBack={() => setStep(0)}
              />
            )}
            {step === 2 && (
              <EscuelaStep
                escuelas={escuelasFiltradas}
                search={escuelaSearch} setSearch={setEscuelaSearch}
                onPick={onPickEscuela}
                onColdLead={onColdLead}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && escuela && (
              <GrupoStep
                escuela={escuela} grupos={grupos} grupo={grupo} setGrupo={setGrupo}
                defaultApellido={contacto.apellido}
                submitting={submitting} error={error}
                onFinish={onFinish}
                onBack={() => { setGrupo(null); setStep(2); }}
              />
            )}
          </CardShell>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Layout helpers
// ============================================================
function Header() {
  return (
    <div className="text-center mb-8 sm:mb-12">
      <Badge variant="outline" className="bg-card text-primary border-primary/30 uppercase tracking-[0.25em] mb-3">Comparativa 2026</Badge>
      <h1 className="font-sans italic text-3xl sm:text-5xl lg:text-6xl text-foreground tracking-tight leading-tight mb-3 sm:mb-4">
        Viajes de <em className="text-primary">egresados</em>
      </h1>
      <p className="text-muted-foreground max-w-2xl mx-auto text-[15px] sm:text-base leading-relaxed">
        Compará las propuestas de todas las empresas para tu viaje de fin de curso. Cuotas, fechas, actividades — todo en un solo lugar, sin presión comercial.
      </p>
    </div>
  );
}

function CardShell({ children }) {
  return (
    <Card className="max-w-md mx-auto shadow-lg">
      <CardContent className="p-6 sm:p-8">{children}</CardContent>
    </Card>
  );
}

function Steps({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
            n < current ? "bg-primary text-primary-foreground" :
            n === current ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2" :
            "bg-muted text-muted-foreground"
          }`}>
            {n < current ? <Check className="w-4 h-4" /> : n}
          </div>
          {n < 3 && <div className={`w-8 h-0.5 transition-all ${n < current ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center mb-5">
      <div className="w-14 h-14 rounded-full bg-secondary/30 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <CardTitle className="font-sans italic text-2xl text-foreground mb-1">{title}</CardTitle>
      <CardDescription>{subtitle}</CardDescription>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <Button variant="link" size="sm" onClick={onClick} className="mt-4 mx-auto block text-muted-foreground hover:text-foreground">
      <ArrowLeft className="w-3 h-3" /> volver
    </Button>
  );
}

// ============================================================
// Landing
// ============================================================
function Landing({ onStart }) {
  const features = [
    { icon: MapPin, title: "Todos los destinos", desc: "Bariloche, Carlos Paz, costa atlántica, termas — con precios actualizados." },
    { icon: Vote, title: "Votación grupal", desc: "Las familias del grado deciden juntas qué propuesta les conviene." },
    { icon: CalendarClock, title: "Reuniones coordinadas", desc: "Las empresas proponen fechas para presentar su propuesta al grupo." },
    { icon: MessageSquare, title: "Chat directo", desc: "Comunicación con cada empresa sin intermediarios." },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-sans italic text-xl sm:text-2xl text-foreground text-center mb-6">¿Cómo funciona?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="p-4 sm:p-5 flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-[15px] mb-0.5">{title}</h3>
                  <p className="text-muted-foreground text-[13.5px] leading-relaxed">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="shadow-lg">
        <CardContent className="p-6 sm:p-8 text-center">
          <CardTitle className="font-sans italic text-xl sm:text-2xl mb-2">Empezá registrándote</CardTitle>
          <CardDescription className="mb-5 max-w-md mx-auto">
            Te pedimos tu mail y elegís tu escuela. Si todavía no la cargamos, te avisamos cuando esté lista.
          </CardDescription>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5 flex-wrap">
            <StepPreview n={1} label="Tu mail" />
            <ArrowRight className="w-3 h-3 opacity-50" />
            <StepPreview n={2} label="Tu escuela" />
            <ArrowRight className="w-3 h-3 opacity-50" />
            <StepPreview n={3} label="Tu grado" />
          </div>
          <Button size="lg" onClick={onStart} className="font-bold">
            Empezar <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StepPreview({ n, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full bg-secondary/40 text-primary font-bold text-[10px] flex items-center justify-center">{n}</span>
      {label}
    </span>
  );
}

// ============================================================
// Step 1: Contacto (email + apellido + tel)
// ============================================================
function ContactoStep({ defaultValues, error, onSubmit, onBack }) {
  const form = useForm({
    resolver: zodResolver(contactoSchema),
    defaultValues,
  });

  return (
    <>
      <StepHeader icon={Mail} title="Tu contacto" subtitle="Para avisarte de novedades sobre los viajes." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control} name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="email" placeholder="Email" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control} name="apellido"
            render={({ field }) => (
              <FormItem>
                <FormControl><Input placeholder="Apellido (opcional)" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control} name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormControl><Input type="tel" placeholder="Teléfono (opcional)" {...field} /></FormControl>
              </FormItem>
            )}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full font-bold" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando…" : <>Continuar <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>
      </Form>
      <BackBtn onClick={onBack} />
    </>
  );
}

// ============================================================
// Step 2: Escuela
// ============================================================
function EscuelaStep({ escuelas, search, setSearch, onPick, onColdLead, onBack }) {
  const [mode, setMode] = useState("buscar");
  const form = useForm({
    resolver: zodResolver(escuelaLibreSchema),
    defaultValues: { escuela_libre: "", grado_libre: "", anio_egreso: new Date().getFullYear() + 1 },
  });

  return (
    <>
      <StepHeader icon={GraduationCap} title="Tu escuela" subtitle="Elegí tu colegio o avisanos si no está en la lista." />
      {mode === "buscar" ? (
        <>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o localidad…"
              className="pl-9"
            />
          </div>
          {escuelas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin resultados. Probá <Button variant="link" className="px-1 h-auto" onClick={() => setMode("libre")}>tipear tu escuela</Button>.
            </p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto">
              {escuelas.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => onPick(e)}
                    className="w-full text-left bg-muted hover:bg-secondary/30 border rounded-xl px-4 py-3 transition-colors"
                  >
                    <p className="font-semibold text-foreground">{e.nombre}</p>
                    {e.localidad && <p className="text-xs text-muted-foreground">{e.localidad}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="link" size="sm" onClick={() => setMode("libre")} className="mt-4 mx-auto block text-muted-foreground hover:text-foreground">
            ¿No está tu escuela?
          </Button>
        </>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onColdLead)} className="space-y-3">
            <p className="text-[13px] text-foreground bg-accent/15 border border-accent/40 rounded-lg px-3 py-2">
              Si tu escuela todavía no está en la plataforma, dejános los datos y te avisamos por mail cuando la sumemos.
            </p>
            <FormField
              control={form.control} name="escuela_libre"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Nombre de la escuela" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control} name="grado_libre"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Grado (Ej: 6to A)" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="anio_egreso"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input type="number" placeholder="Año egreso" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full font-bold" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando…" : "Avisame cuando esté"}
            </Button>
            <Button variant="link" size="sm" type="button" onClick={() => setMode("buscar")} className="mx-auto block text-muted-foreground hover:text-foreground">
              ← volver a buscar
            </Button>
          </form>
        </Form>
      )}
      <BackBtn onClick={onBack} />
    </>
  );
}

// ============================================================
// Step 3: Grupo + apellido
// ============================================================
function GrupoStep({ escuela, grupos, grupo, setGrupo, defaultApellido, submitting, error, onFinish, onBack }) {
  const form = useForm({
    resolver: zodResolver(apellidoSchema),
    defaultValues: { apellido: defaultApellido || "" },
  });

  if (!grupo) {
    return (
      <>
        <StepHeader icon={Users} title="¿Qué grado?" subtitle={escuela.nombre} />
        {grupos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Esta escuela todavía no tiene grupos cargados. Estamos sumando — te avisamos por mail apenas esté tu grado.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-auto">
            {grupos.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => setGrupo(g)}
                  className="w-full text-left bg-muted hover:bg-secondary/30 border rounded-xl px-4 py-3 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-foreground">{g.grado || "—"}</span>
                  <span className="text-xs text-muted-foreground">Egreso {g.anio_egreso}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <BackBtn onClick={onBack} />
      </>
    );
  }

  return (
    <>
      <StepHeader icon={Users} title="Confirmá tu apellido" subtitle={`${escuela.nombre} · ${grupo.grado || ""} (egreso ${grupo.anio_egreso})`} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFinish)} className="space-y-3">
          <FormField
            control={form.control} name="apellido"
            render={({ field }) => (
              <FormItem>
                <FormControl><Input placeholder="Apellido" autoFocus {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full font-bold" disabled={submitting}>
            {submitting ? "Guardando…" : <>Empezar a comparar <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>
      </Form>
      <BackBtn onClick={() => setGrupo(null)} />
    </>
  );
}

// ============================================================
// Cold lead done
// ============================================================
function ColdLeadDone({ email }) {
  return (
    <CardShell>
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-primary-foreground" />
        </div>
        <CardTitle className="font-sans italic text-2xl mb-2">¡Listo!</CardTitle>
        <CardDescription className="mb-1">Anotamos tu interés.</CardDescription>
        <p className="text-muted-foreground text-xs mb-5">
          Apenas tengamos tu escuela cargada te escribimos a <strong>{email}</strong>.
        </p>
        <p className="text-muted-foreground/70 text-[11px]">
          Mientras tanto podés seguir navegando como invitado para mirar las propuestas existentes.
        </p>
      </div>
    </CardShell>
  );
}

// ============================================================
// Legacy (sin DB)
// ============================================================
function LegacyForm({ value, onChange, onSubmit }) {
  return (
    <CardShell>
      <StepHeader icon={Users} title="¡Hola!" subtitle="¿De qué familia o alumno/a estamos viendo viajes?" />
      <div className="space-y-3">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Ej: Familia García"
          autoFocus
        />
        <Button onClick={onSubmit} disabled={!value.trim()} className="w-full font-bold">
          Empezar a comparar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </CardShell>
  );
}
