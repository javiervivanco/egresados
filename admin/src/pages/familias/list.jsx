import React from "react";
import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table, Space } from "antd";

export const FamiliasList = () => {
  const { tableProps } = useTable({
    resource: "familias",
    meta: { select: "*, grupos(grado, anio_egreso, escuelas(nombre))" },
    sorters: { initial: [{ field: "apellido", order: "asc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="apellido" title="Apellido" />
        <Table.Column
          title="Grupo"
          render={(_, r) => `${r.grupos?.escuelas?.nombre || "—"} · ${r.grupos?.grado || "—"} (${r.grupos?.anio_egreso || "—"})`}
        />
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column dataIndex="telefono" title="Teléfono" />
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
