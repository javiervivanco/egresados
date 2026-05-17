import React from "react";
import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";
import { fmtARS } from "../../utils/formatters";

export const PlanesList = () => {
  const { tableProps } = useTable({
    resource: "planes_viaje",
    meta: { select: "*, destinos(nombre, empresas(nombre))" },
    sorters: { initial: [{ field: "plan_pago", order: "asc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Empresa" render={(_, r) => r.destinos?.empresas?.nombre || "—"} />
        <Table.Column title="Destino" render={(_, r) => r.destinos?.nombre || "—"} />
        <Table.Column dataIndex="plan_pago" title="Plan" />
        <Table.Column dataIndex="transporte" title="Transp." render={(v) => v && <Tag>{v}</Tag>} />
        <Table.Column title="Duración" render={(_, p) => `${p.dias || "—"}d/${p.noches || "—"}n`} />
        <Table.Column dataIndex="cuota_mensual" title="Cuota mensual" align="right" render={fmtARS} />
        <Table.Column dataIndex="total_final" title="Total" align="right" render={fmtARS} />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space>
              <EditButton hideText size="small" recordItemId={r.id} />
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
