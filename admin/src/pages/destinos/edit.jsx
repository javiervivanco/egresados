import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Switch } from "antd";

export const DestinosEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "destinos" });
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
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
    </Edit>
  );
};
