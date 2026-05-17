import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send, Building2 } from "lucide-react";
import { supabase } from "../supabase";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp } from "lucide-react";

// Mensajería empresa ↔ grupo. Lista hilos colapsable; cada hilo abre un
// Sheet (drawer) con la conversación completa — funciona bien en mobile
// (slide derecha) y desktop (modal lateral).
export default function Messaging({ familiaId, grupoId, familiaNombre }) {
  const [empresas, setEmpresas] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(true);

  const loadHilos = useCallback(async () => {
    if (!supabase || !grupoId) { setLoading(false); return; }
    setLoading(true);

    const [{ data: dFechas }, { data: dMensajes }] = await Promise.all([
      supabase.from("fechas_reunion").select("empresa_id, empresas(nombre)").eq("grupo_id", grupoId),
      supabase.from("mensajes").select("empresa_id, empresas:empresa_id(nombre), leido_grupo").eq("grupo_id", grupoId),
    ]);

    const byId = new Map();
    for (const r of (dFechas || [])) {
      if (!byId.has(r.empresa_id)) byId.set(r.empresa_id, { empresa_id: r.empresa_id, nombre: r.empresas?.nombre || "Empresa", sin_leer: 0 });
    }
    for (const r of (dMensajes || [])) {
      const e = byId.get(r.empresa_id) || { empresa_id: r.empresa_id, nombre: r.empresas?.nombre || "Empresa", sin_leer: 0 };
      if (r.leido_grupo === false) e.sin_leer++;
      byId.set(r.empresa_id, e);
    }
    setEmpresas([...byId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setLoading(false);
  }, [grupoId]);

  useEffect(() => { loadHilos(); }, [loadHilos]);

  if (loading || empresas.length === 0) return null;

  const totalSinLeer = empresas.reduce((s, e) => s + (e.sin_leer || 0), 0);

  return (
    <Collapsible open={!collapsed} onOpenChange={(v) => setCollapsed(!v)} className="rounded-2xl border border-foreground/20 bg-muted mb-6 overflow-hidden">
      <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-foreground/5 transition-colors text-left">
        <MessageSquare className="w-5 h-5 text-foreground" />
        <div className="flex-1">
          <h3 className="font-sans italic text-lg text-foreground">Mensajes con empresas</h3>
          <p className="text-xs text-muted-foreground">
            {empresas.length} {empresas.length === 1 ? "empresa en contacto" : "empresas en contacto"}
            {totalSinLeer > 0 && <> · <strong className="text-destructive">{totalSinLeer} sin leer</strong></>}
          </p>
        </div>
        {collapsed ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="border-t border-foreground/15 divide-y divide-foreground/10">
          {empresas.map((e) => (
            <li key={e.empresa_id}>
              <Sheet open={openId === e.empresa_id} onOpenChange={(o) => setOpenId(o ? e.empresa_id : null)}>
                <SheetTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-4 sm:px-5 py-3 hover:bg-background/50 text-left">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground text-sm flex-1">{e.nombre}</span>
                    {e.sin_leer > 0 && <Badge variant="destructive">{e.sin_leer}</Badge>}
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="flex flex-col w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> {e.nombre}
                    </SheetTitle>
                  </SheetHeader>
                  <Thread
                    empresaId={e.empresa_id}
                    empresaNombre={e.nombre}
                    grupoId={grupoId}
                    familiaId={familiaId}
                    familiaNombre={familiaNombre}
                    onChange={loadHilos}
                  />
                </SheetContent>
              </Sheet>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Thread({ empresaId, empresaNombre, grupoId, familiaId, familiaNombre, onChange }) {
  const [mensajes, setMensajes] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("mensajes")
      .select("id, autor_rol, autor_nombre, contenido, created_at, leido_grupo")
      .eq("grupo_id", grupoId).eq("empresa_id", empresaId)
      .order("created_at");
    setMensajes(data || []);

    const noLeidos = (data || []).filter((m) => m.autor_rol === "empresa" && !m.leido_grupo);
    if (noLeidos.length > 0) {
      await supabase.from("mensajes")
        .update({ leido_grupo: true })
        .in("id", noLeidos.map((m) => m.id));
      onChange?.();
    }
  }, [empresaId, grupoId, onChange]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !familiaId) return;
    setSending(true);
    const { error } = await supabase.from("mensajes").insert({
      grupo_id: grupoId,
      empresa_id: empresaId,
      autor_rol: "familia",
      autor_nombre: familiaNombre || "Familia",
      contenido: text,
    });
    setSending(false);
    if (error) { alert(error.message); return; }
    setDraft("");
    load();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <ScrollArea className="flex-1 pr-2">
        <ul className="space-y-2">
          {mensajes.map((m) => (
            <li key={m.id} className={`flex ${m.autor_rol === "familia" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.autor_rol === "familia"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm border"
              }`}>
                <p className="text-[10.5px] opacity-70 mb-0.5">
                  {m.autor_rol === "empresa" ? empresaNombre : m.autor_nombre}
                  {" · "}
                  {new Date(m.created_at).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="whitespace-pre-wrap">{m.contenido}</p>
              </div>
            </li>
          ))}
          {mensajes.length === 0 && <li className="text-xs text-muted-foreground text-center py-6">No hay mensajes todavía.</li>}
        </ul>
      </ScrollArea>
      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escribí un mensaje…"
          rows={2}
          className="resize-none"
        />
        <Button onClick={send} disabled={!draft.trim() || sending} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
