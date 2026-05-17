import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { useSelect } from "@refinedev/core";
import { Form, Select } from "antd";
import { PlanFormFields } from "./create";

export const PlanesEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "planes_viaje" });
  const { options: destinos } = useSelect({ resource: "destinos", optionLabel: "nombre", optionValue: "id" });
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Destino" name="destino_id" rules={[{ required: true }]}>
          <Select options={destinos} showSearch optionFilterProp="label" />
        </Form.Item>
        <PlanFormFields />
      </Form>
    </Edit>
  );
};
