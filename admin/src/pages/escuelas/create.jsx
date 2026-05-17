import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const EscuelasCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "escuelas" });
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Localidad" name="localidad">
          <Input />
        </Form.Item>
        <Form.Item label="Provincia" name="provincia">
          <Input />
        </Form.Item>
      </Form>
    </Create>
  );
};
