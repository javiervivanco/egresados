import React from "react";
import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";

export const CiudadesList = () => {
  const { tableProps } = useTable({
    resource: "ciudades",
    sorters: { initial: [{ field: "provincia", order: "asc" }, { field: "nombre", order: "asc" }] },
  });

  return (
    <List headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="nombre" title="Ciudad" />
        <Table.Column dataIndex="provincia" title="Provincia" />
        <Table.Column dataIndex="slug" title="Slug" render={(v) => <Tag>{v}</Tag>} />
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
