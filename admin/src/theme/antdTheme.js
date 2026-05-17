// Tokens de AntD v6 mapeados a la paleta forestal del proyecto.
// Doc: https://ant.design/docs/react/customize-theme
import { theme as antdInternal } from "antd";

export const antdTheme = {
  algorithm: antdInternal.defaultAlgorithm,
  token: {
    colorPrimary: "#2D5A27",       // pino
    colorInfo: "#264653",          // noche
    colorSuccess: "#2D5A27",
    colorWarning: "#F4A261",       // fogata
    colorError: "#E76F51",         // tierra
    colorTextBase: "#264653",      // noche
    fontFamily: "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    colorBgLayout: "#FAFAF9",
  },
  components: {
    Layout: {
      headerBg: "#FFFFFF",
      siderBg: "#FFFFFF",
      bodyBg: "#FAFAF9",
    },
    Menu: {
      itemSelectedBg: "#E5EFE3",   // pino-light
      itemSelectedColor: "#2D5A27",
    },
  },
};
