import React, { useEffect, useMemo, useState } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Switch, Select, Alert, Divider, Tag, Space, Button, message } from "antd";
import { useList, useParsed } from "@refinedev/core";
import { supabaseClient as supabase } from "../../lib/supabaseClient";

export const EmpresasEdit = () => {
  const { formProps, saveButtonProps, queryResult } = useForm({ resource: "empresas" });
  const { id: empresaId } = useParsed();

  // Catálogo de ciudades.
  const { data: ciudadesData } = useList({
    resource: "ciudades",
    pagination: { mode: "off" },
    sorters: [{ field: "provincia", order: "asc" }, { field: "nombre", order: "asc" }],
  });
  const ciudades = ciudadesData?.data || [];

  // Orígenes actuales de esta empresa.
  const [origenes, setOrigenes] = useState([]); // array de ciudad_id
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from("empresas_origenes")
      .select("ciudad_id")
      .eq("empresa_id", empresaId)
      .then(({ data }) => {
        if (cancelled) return;
        setOrigenes((data || []).map((r) => r.ciudad_id));
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  const ciudadOptions = useMemo(
    () => ciudades.map((c) => ({
      label: `${c.nombre}${c.provincia ? ` · ${c.provincia}` : ""}`,
      value: c.id,
    })),
    [ciudades]
  );

  const onChange = (next) => {
    setOrigenes(next);
    setDirty(true);
  };

  const saveOrigenes = async () => {
    if (!empresaId) return;
    setSaving(true);
    // Diff: traer estado actual, calcular adds/removes y ejecutar.
    const { data: cur } = await supabase
      .from("empresas_origenes")
      .select("ciudad_id")
      .eq("empresa_id", empresaId);
    const currentIds = new Set((cur || []).map((r) => r.ciudad_id));
    const nextIds = new Set(origenes);
    const toAdd = [...nextIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

    if (toAdd.length > 0) {
      const rows = toAdd.map((ciudad_id) => ({ empresa_id: Number(empresaId), ciudad_id }));
      const { error } = await supabase.from("empresas_origenes").insert(rows);
      if (error) { message.error("Add: " + error.message); setSaving(false); return; }
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("empresas_origenes").delete()
        .eq("empresa_id", empresaId).in("ciudad_id", toRemove);
      if (error) { message.error("Remove: " + error.message); setSaving(false); return; }
    }
    setSaving(false);
    setDirty(false);
    message.success("Orígenes actualizados");
  };

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

      <Divider orientation="left">Ciudades desde las que opera</Divider>
      {origenes.length === 0 && (
        <Alert
          type="warning"
          showIcon
          message="Esta empresa no tiene ciudades de operación cargadas."
          description="Mientras esté vacío, las familias NO la ven en la comparativa (el catálogo se filtra por ciudad de la escuela)."
          style={{ marginBottom: 12 }}
        />
      )}
      <Space direction="vertical" style={{ width: "100%" }}>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          placeholder="Agregar ciudad…"
          value={origenes}
          onChange={onChange}
          options={ciudadOptions}
          style={{ width: "100%" }}
        />
        <Space>
          <Button type="primary" onClick={saveOrigenes} loading={saving} disabled={!dirty}>
            Guardar orígenes
          </Button>
          {dirty && <Tag color="orange">cambios sin guardar</Tag>}
        </Space>
      </Space>
    </Edit>
  );
};
