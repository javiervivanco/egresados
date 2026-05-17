import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { useSelect } from "@refinedev/core";
import { Form, Input, Select } from "antd";

export const FamiliasEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "familias" });
  const { options: grupos } = useSelect({
    resource: "grupos",
    optionLabel: (g) => `${g.escuelas?.nombre || ""} · ${g.grado} (${g.anio_egreso})`,
    optionValue: "id",
    meta: { select: "id, grado, anio_egreso, escuelas(nombre)" },
  });
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Grupo" name="grupo_id" rules={[{ required: true }]}>
          <Select options={grupos} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label="Apellido" name="apellido" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email">
          <Input type="email" />
        </Form.Item>
        <Form.Item label="Teléfono" name="telefono">
          <Input />
        </Form.Item>
      </Form>
    </Edit>
  );
};
