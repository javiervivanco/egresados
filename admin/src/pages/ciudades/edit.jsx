import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const CiudadesEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "ciudades" });
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Provincia" name="provincia">
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Form>
    </Edit>
  );
};
