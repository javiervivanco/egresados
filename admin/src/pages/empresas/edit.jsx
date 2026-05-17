import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Switch } from "antd";

export const EmpresasEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "empresas" });
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
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
    </Edit>
  );
};
