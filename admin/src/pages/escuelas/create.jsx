import React, { useMemo } from "react";
import { Create, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Input, Select } from "antd";

export const EscuelasCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "escuelas" });
  const { data: ciudadesData } = useList({
    resource: "ciudades",
    pagination: { mode: "off" },
    sorters: [{ field: "provincia", order: "asc" }, { field: "nombre", order: "asc" }],
  });

  const options = useMemo(
    () => (ciudadesData?.data || []).map((c) => ({
      label: `${c.nombre}${c.provincia ? ` · ${c.provincia}` : ""}`,
      value: c.id,
    })),
    [ciudadesData]
  );

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Ciudad" name="ciudad_id" rules={[{ required: true, message: "Elegí la ciudad" }]}
                   tooltip="Filtra qué empresas se le ofrecen a las familias de esta escuela.">
          <Select showSearch optionFilterProp="label" options={options} placeholder="Buscar ciudad…" />
        </Form.Item>
        <Form.Item label="Localidad (texto libre, display)" name="localidad">
          <Input />
        </Form.Item>
        <Form.Item label="Provincia (texto libre, display)" name="provincia">
          <Input />
        </Form.Item>
      </Form>
    </Create>
  );
};
