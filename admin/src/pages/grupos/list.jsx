import React from "react";
import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";

export const GruposList = () => {
  const { tableProps } = useTable({
    resource: "grupos",
    meta: { select: "*, escuelas(nombre)" },
    sorters: { initial: [{ field: "anio_egreso", order: "desc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Escuela"
          render={(_, r) => r.escuelas?.nombre || "—"}
        />
        <Table.Column dataIndex="grado" title="Grado" />
        <Table.Column dataIndex="anio_egreso" title="Año egreso" align="right" />
        <Table.Column
          dataIndex="estado"
          title="Estado"
          render={(v) => <Tag color={v === "activo" ? "green" : "default"}>{v}</Tag>}
        />
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
