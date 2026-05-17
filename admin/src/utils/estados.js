// Tablas de color por estado de cada entidad. Mapea estado → color de AntD Tag.

export const VENTA_ESTADO_COLOR = {
  borrador:   "default",
  confirmada: "orange",
  pagada:     "blue",
  liquidada:  "green",
  cancelada:  "default",
};

export const FECHA_REUNION_COLOR = {
  propuesta:  "orange",
  confirmada: "green",
  realizada:  "blue",
  cancelada:  "default",
};

export const CORRECCION_COLOR = {
  pendiente:  "orange",
  resuelta:   "green",
  descartada: "default",
};

export const DOC_PROCESADO_COLOR = {
  pendiente:   "default",
  procesando:  "processing",
  procesado:   "success",
  error:       "error",
};
