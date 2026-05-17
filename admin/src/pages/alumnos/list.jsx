import React from "react";
import { List, useTable } from "@refinedev/antd";
import { Table } from "antd";

export const AlumnosList = () => {
  const { tableProps } = useTable({
    resource: "alumnos",
    meta: { select: "*, familias(apellido, grupos(grado, escuelas(nombre)))" },
    sorters: { initial: [{ field: "nombre", order: "asc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="nombre" title="Nombre" />
        <Table.Column
          title="Familia"
          render={(_, r) => r.familias?.apellido || "—"}
        />
        <Table.Column
          title="Escuela"
          render={(_, r) => r.familias?.grupos?.escuelas?.nombre || "—"}
        />
        <Table.Column
          title="Grado"
          render={(_, r) => r.familias?.grupos?.grado || "—"}
        />
      </Table>
    </List>
  );
};
