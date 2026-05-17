import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Switch } from "antd";

export const EmpresasCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "empresas" });
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" initialValues={{ activo: true, comision_pct_default: 8 }}>
        <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Slug (identificador único)" name="slug" rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: "Solo minúsculas, números y guiones." }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Email de contacto" name="contacto_email">
          <Input type="email" />
        </Form.Item>
        <Form.Item label="Teléfono" name="contacto_tel">
          <Input />
        </Form.Item>
        <Form.Item label="Comisión por defecto (%)" name="comision_pct_default">
          <InputNumber min={0} max={100} step={0.5} />
        </Form.Item>
        <Form.Item label="Activa" name="activo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
};
