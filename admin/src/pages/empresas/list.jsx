import React from "react";
import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";

export const EmpresasList = () => {
  const { tableProps } = useTable({
    resource: "empresas",
    sorters: { initial: [{ field: "nombre", order: "asc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="nombre" title="Nombre" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column dataIndex="contacto_email" title="Email" />
        <Table.Column dataIndex="contacto_tel" title="Teléfono" />
        <Table.Column
          dataIndex="comision_pct_default"
          title="Comisión %"
          align="right"
          render={(v) => `${v ?? "—"}%`}
        />
        <Table.Column
          dataIndex="activo"
          title="Estado"
          render={(v) => <Tag color={v ? "green" : "default"}>{v ? "activa" : "inactiva"}</Tag>}
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
