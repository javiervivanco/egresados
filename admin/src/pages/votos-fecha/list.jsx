import React from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Tag } from "antd";
import { fmtFechaHora } from "../../utils/formatters";

export const VotosFechaList = () => {
  const { tableProps } = useTable({
    resource: "votos_fecha",
    meta: { select: "*, familias(apellido, grupos(grado, escuelas(nombre))), fechas_reunion(fecha, ubicacion, empresas(nombre))" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey={(r) => `${r.familia_id}-${r.fecha_id}`}>
        <Table.Column
          title="Reunión"
          render={(_, r) => `${r.fechas_reunion?.empresas?.nombre || "—"} · ${fmtFechaHora(r.fechas_reunion?.fecha)}`}
        />
        <Table.Column
          title="Familia"
          render={(_, r) => `${r.familias?.apellido || "—"} (${r.familias?.grupos?.escuelas?.nombre || "—"} · ${r.familias?.grupos?.grado || "—"})`}
        />
        <Table.Column
          dataIndex="voto"
          title="Voto"
          render={(v) => <Tag color={v ? "green" : "default"}>{v ? "Sí" : "No"}</Tag>}
        />
      </Table>
    </List>
  );
};
