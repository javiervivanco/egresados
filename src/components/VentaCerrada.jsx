import React, { useEffect, useState } from "react";
import { CheckCircle2, Building2, MapPin, Users } from "lucide-react";
import { supabase } from "../supabase";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Banner que aparece cuando el grupo tiene una venta confirmada/pagada/liquidada.
// Borradores no se muestran. El unique index garantiza a lo sumo una venta activa.
export default function VentaCerrada({ grupoId }) {
  const [venta, setVenta] = useState(null);

  useEffect(() => {
    if (!supabase || !grupoId) return;
    let active = true;
    supabase
      .from("ventas")
      .select("estado, cantidad_pasajeros, precio_unitario, monto_total, confirmada_at, empresas(nombre), destinos(nombre), planes_viaje(plan_pago)")
      .eq("grupo_id", grupoId)
      .in("estado", ["confirmada", "pagada", "liquidada"])
      .maybeSingle()
      .then(({ data }) => { if (active) setVenta(data); });
    return () => { active = false; };
  }, [grupoId]);

  if (!venta) return null;

  const fmt = (n) => "$ " + Number(n || 0).toLocaleString("es-AR");

  return (
    <Alert className="border-primary bg-primary/10 mb-6 flex flex-wrap items-center gap-4 [&>svg]:hidden">
      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-[10.5px] uppercase tracking-[0.2em] text-primary font-bold">Viaje confirmado</p>
        <AlertTitle className="font-sans italic text-xl text-foreground mt-0.5">
          Su grupo cerró con <em>{venta.empresas?.nombre}</em>
        </AlertTitle>
        <AlertDescription className="text-muted-foreground text-sm flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {venta.destinos?.nombre && (
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {venta.destinos.nombre}</span>
          )}
          {venta.planes_viaje?.plan_pago && (
            <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {venta.planes_viaje.plan_pago}</span>
          )}
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {venta.cantidad_pasajeros} pasajeros</span>
        </AlertDescription>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Total grupo</p>
        <p className="font-bold text-foreground text-lg">{fmt(venta.monto_total)}</p>
      </div>
    </Alert>
  );
}
