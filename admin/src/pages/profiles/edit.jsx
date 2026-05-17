import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { useSelect } from "@refinedev/core";
import { Form, Input, Select } from "antd";

export const ProfilesEdit = () => {
  const { formProps, saveButtonProps, formLoading } = useForm({
    resource: "profiles",
    meta: { idColumnName: "user_id" },
  });
  const { options: empresas } = useSelect({
    resource: "empresas",
    optionLabel: "nombre",
    optionValue: "id",
  });

  const rolValue = Form.useWatch("rol", formProps.form);

  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={formLoading}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Nombre" name="nombre">
          <Input />
        </Form.Item>
        <Form.Item label="Rol" name="rol" rules={[{ required: true }]}>
          <Select options={[
            { value: "super_admin", label: "Super admin" },
            { value: "empresa_admin", label: "Empresa admin" },
            { value: "familia", label: "Familia" },
          ]} />
        </Form.Item>
        <Form.Item
          label="Empresa"
          name="empresa_id"
          help={rolValue === "empresa_admin" ? "Obligatorio para rol empresa_admin." : "Solo aplica para empresa_admin."}
        >
          <Select
            options={empresas}
            allowClear
            disabled={rolValue !== "empresa_admin"}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
