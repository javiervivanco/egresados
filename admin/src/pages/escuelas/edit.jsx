import React, { useMemo } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Input, Select, Tag, Alert } from "antd";

export const EscuelasEdit = () => {
  const { formProps, saveButtonProps, queryResult } = useForm({ resource: "escuelas" });
  const record = queryResult?.data?.data;

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

  const estadoTag = record?.estado === "pendiente"
    ? <Tag color="orange">pendiente</Tag>
    : record?.estado === "archivada"
    ? <Tag>archivada</Tag>
    : <Tag color="green">activa</Tag>;

  return (
    <Edit saveButtonProps={saveButtonProps} title={<>Editar escuela {estadoTag}</>}>
      {!record?.ciudad_id && (
        <Alert
          type="warning" showIcon style={{ marginBottom: 12 }}
          message="Sin ciudad asignada"
          description="Las familias de esta escuela no ven catálogo filtrado por su ciudad. Asignala para que el matching geográfico funcione."
        />
      )}
      <Form {...formProps} layout="vertical">
        <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Ciudad" name="ciudad_id"
                   tooltip="Ciudad real donde está la escuela. Filtra qué empresas le ofrecemos a sus familias."
                   rules={[{ required: true, message: "Elegí la ciudad" }]}>
          <Select showSearch optionFilterProp="label" options={options} placeholder="Buscar ciudad…" />
        </Form.Item>
        <Form.Item label="Localidad (texto libre, display)" name="localidad">
          <Input />
        </Form.Item>
        <Form.Item label="Provincia (texto libre, display)" name="provincia">
          <Input />
        </Form.Item>
        <Form.Item label="Estado" name="estado">
          <Select options={[
            { label: "Activa", value: "activa" },
            { label: "Pendiente", value: "pendiente" },
            { label: "Archivada", value: "archivada" },
          ]} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
