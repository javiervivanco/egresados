import React from "react";
import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { useUpdate } from "@refinedev/core";
import { Table, Space, Button, Tag } from "antd";
import { fmtFechaHora } from "../../utils/formatters";
import { FECHA_REUNION_COLOR } from "../../utils/estados";
import { EstadoTag } from "../../components/EstadoTag";

export const FechasReunionList = () => {
  const { tableProps, tableQuery } = useTable({
    resource: "fechas_reunion",
    meta: { select: "*, grupos(grado, anio_egreso, escuelas(nombre)), empresas(nombre)" },
    sorters: { initial: [{ field: "fecha", order: "asc" }] },
  });

  const { mutate: updateFecha } = useUpdate();
  const transition = (id, estado) =>
    updateFecha(
      { resource: "fechas_reunion", id, values: { estado }, successNotification: { message: `Reunión ${estado}`, type: "success" } },
      { onSuccess: () => tableQuery.refetch() },
    );

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="fecha" title="Fecha" render={fmtFechaHora} />
        <Table.Column title="Empresa" render={(_, r) => r.empresas?.nombre || "—"} />
        <Table.Column
          title="Grupo"
          render={(_, r) => `${r.grupos?.escuelas?.nombre || "—"} · ${r.grupos?.grado || "—"}`}
        />
        <Table.Column dataIndex="ubicacion" title="Ubicación / Link" />
        <Table.Column
          dataIndex="estado"
          title="Estado"
          render={(v) => <EstadoTag estado={v} colorMap={FECHA_REUNION_COLOR} />}
        />
        <Table.Column
          title="Acciones"
          render={(_, r) => (
            <Space wrap>
              {r.estado === "propuesta" && (
                <>
                  <Button size="small" type="primary" onClick={() => transition(r.id, "confirmada")}>Confirmar</Button>
                  <Button size="small" onClick={() => transition(r.id, "cancelada")}>Cancelar</Button>
                </>
              )}
              {r.estado === "confirmada" && (
                <Button size="small" onClick={() => transition(r.id, "realizada")}>Marcar realizada</Button>
              )}
              <EditButton hideText size="small" recordItemId={r.id} />
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
