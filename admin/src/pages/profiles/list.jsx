import React from "react";
import { List, useTable, EditButton } from "@refinedev/antd";
import { Table, Tag, Alert, Space } from "antd";

const ROL_COLOR = {
  super_admin: "red",
  empresa_admin: "blue",
  familia: "default",
};

// profiles.PK = user_id (uuid), no id. El meta.idColumnName en el resource
// resuelve el delete/edit; al pasar `recordItemId` en EditButton hay que
// usar `user_id` también.
export const ProfilesList = () => {
  const { tableProps } = useTable({
    resource: "profiles",
    meta: { select: "user_id, rol, nombre, empresa_id, familia_id, empresas(nombre)", idColumnName: "user_id" },
    sorters: { initial: [{ field: "rol", order: "asc" }] },
  });

  return (
    <List>
      <Alert
        type="info"
        showIcon
        message="Para crear un nuevo admin usá la CLI"
        description={<code>make admin-create-user EMAIL=... ROL=super_admin|empresa_admin [EMPRESA_SLUG=...]</code>}
        style={{ marginBottom: 16 }}
      />
      <Table {...tableProps} rowKey="user_id">
        <Table.Column dataIndex="nombre" title="Nombre" />
        <Table.Column
          dataIndex="rol"
          title="Rol"
          render={(v) => <Tag color={ROL_COLOR[v]}>{v}</Tag>}
        />
        <Table.Column
          title="Empresa"
          render={(_, r) => r.empresas?.nombre || "—"}
        />
        <Table.Column
          dataIndex="user_id"
          title="User ID"
          render={(v) => <code style={{ fontSize: 11, color: "#999" }}>{v.slice(0, 8)}…</code>}
        />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space>
              <EditButton hideText size="small" recordItemId={r.user_id} meta={{ idColumnName: "user_id" }} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
