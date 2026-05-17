import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const CiudadesCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "ciudades" });

  // Auto-generar slug a partir del nombre si el campo está vacío.
  const onNombreChange = (e) => {
    const nombre = e.target.value;
    const current = formProps.form?.getFieldValue("slug");
    if (!current) formProps.form?.setFieldValue("slug", slugify(nombre));
  };

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
          <Input onChange={onNombreChange} />
        </Form.Item>
        <Form.Item label="Provincia" name="provincia">
          <Input />
        </Form.Item>
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}
                   tooltip="Identificador URL-friendly. Se genera automáticamente del nombre.">
          <Input />
        </Form.Item>
      </Form>
    </Create>
  );
};
