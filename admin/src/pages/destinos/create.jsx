import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Switch } from "antd";
import { useEmpresaContext } from "../../contexts/EmpresaContext";

export const DestinosCreate = () => {
  const { empresaId } = useEmpresaContext();
  const { formProps, saveButtonProps } = useForm({ resource: "destinos" });
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" initialValues={{ activo: true, empresa_id: empresaId }}>
        <Form.Item name="empresa_id" hidden><Input /></Form.Item>
        <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Provincia" name="provincia">
          <Input />
        </Form.Item>
        <Form.Item label="Descripción" name="descripcion">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Activo" name="activo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
};
