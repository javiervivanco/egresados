import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { useSelect } from "@refinedev/core";
import { Form, Input, InputNumber, Select } from "antd";

export const GruposCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "grupos" });
  const { options: escuelas } = useSelect({
    resource: "escuelas",
    optionLabel: "nombre",
    optionValue: "id",
  });
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" initialValues={{ estado: "activo", anio_egreso: new Date().getFullYear() + 1 }}>
        <Form.Item label="Escuela" name="escuela_id" rules={[{ required: true }]}>
          <Select options={escuelas} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label="Grado" name="grado" rules={[{ required: true }]}>
          <Input placeholder="Ej: 6to A" />
        </Form.Item>
        <Form.Item label="Año egreso" name="anio_egreso" rules={[{ required: true }]}>
          <InputNumber min={2024} max={2050} />
        </Form.Item>
        <Form.Item label="Estado" name="estado">
          <Select options={[{ value: "activo" }, { value: "cerrado" }]} />
        </Form.Item>
      </Form>
    </Create>
  );
};
