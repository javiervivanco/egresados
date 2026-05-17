import React from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Tag } from "antd";
import { fmtARS } from "../../utils/formatters";

export const VotosPlanList = () => {
  const { tableProps } = useTable({
    resource: "votos_plan",
    meta: { select: "*, familias(apellido, grupos(grado, escuelas(nombre))), planes_viaje(plan_pago, total_final, destinos(nombre, empresas(nombre)))" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="prioridad"
          title="Prioridad"
          align="center"
          render={(v) => <Tag color={v === 1 ? "green" : v === 2 ? "blue" : "default"}>{v}°</Tag>}
        />
        <Table.Column
          title="Familia"
          render={(_, r) => `${r.familias?.apellido || "—"} (${r.familias?.grupos?.escuelas?.nombre || "—"} · ${r.familias?.grupos?.grado || "—"})`}
        />
        <Table.Column
          title="Empresa / Destino"
          render={(_, r) => `${r.planes_viaje?.destinos?.empresas?.nombre || "—"} · ${r.planes_viaje?.destinos?.nombre || "—"}`}
        />
        <Table.Column title="Plan" render={(_, r) => r.planes_viaje?.plan_pago || "—"} />
        <Table.Column title="Total" align="right" render={(_, r) => fmtARS(r.planes_viaje?.total_final)} />
      </Table>
    </List>
  );
};
