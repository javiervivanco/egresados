import React from "react";
import { List, useTable, ShowButton, DeleteButton } from "@refinedev/antd";
import { useDelete } from "@refinedev/core";
import { Table, Space, Tag, Popconfirm, Button } from "antd";
import { DeleteOutlined, FileTextOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../lib/supabaseClient";
import { DOC_PROCESADO_COLOR } from "../../utils/estados";
import { fmtFechaCorta } from "../../utils/formatters";

export const DocumentosList = () => {
  const { tableProps, tableQuery } = useTable({
    resource: "documentos",
    meta: { select: "*, destinos(nombre, empresas(nombre))" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });
  const { mutate: deleteDoc } = useDelete();

  const remove = async (d) => {
    await supabaseClient.storage.from("documentos").remove([d.storage_path]);
    deleteDoc({ resource: "documentos", id: d.id }, { onSuccess: () => tableQuery.refetch() });
  };

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="nombre"
          title="Archivo"
          render={(v) => <Space><FileTextOutlined /> {v}</Space>}
        />
        <Table.Column title="Empresa / Destino" render={(_, r) => `${r.destinos?.empresas?.nombre || "—"} · ${r.destinos?.nombre || "—"}`} />
        <Table.Column
          dataIndex="procesado_estado"
          title="Procesado IA"
          render={(v) => <Tag color={DOC_PROCESADO_COLOR[v] || "default"}>{v}</Tag>}
        />
        <Table.Column dataIndex="created_at" title="Subido" render={fmtFechaCorta} />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={r.id} />
              <Popconfirm title="¿Eliminar documento?" onConfirm={() => remove(r)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
