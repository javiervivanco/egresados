import React from "react";
import { Refine, Authenticated } from "@refinedev/core";
import { ThemedLayout, ErrorComponent, AuthPage, useNotificationProvider } from "@refinedev/antd";
import routerProvider, { NavigateToResource, CatchAllNavigate } from "@refinedev/react-router";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { ConfigProvider, App as AntdApp } from "antd";
import esES from "antd/locale/es_ES";
import { Routes, Route, Outlet } from "react-router";

import { supabaseClient } from "./lib/supabaseClient";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { antdTheme } from "./theme/antdTheme";
import { resources } from "./resources";
import { Header } from "./components/Header";
import { Title } from "./components/Title";
import { EmpresaContextProvider } from "./contexts/EmpresaContext";
import { NavigateByRole } from "./components/NavigateByRole";

// Páginas
import { EmpresasList } from "./pages/empresas/list";
import { EmpresasCreate } from "./pages/empresas/create";
import { EmpresasEdit } from "./pages/empresas/edit";
import { EscuelasList } from "./pages/escuelas/list";
import { EscuelasCreate } from "./pages/escuelas/create";
import { EscuelasEdit } from "./pages/escuelas/edit";
import { GruposList } from "./pages/grupos/list";
import { GruposCreate } from "./pages/grupos/create";
import { GruposEdit } from "./pages/grupos/edit";
import { FamiliasList } from "./pages/familias/list";
import { FamiliasEdit } from "./pages/familias/edit";
import { AlumnosList } from "./pages/alumnos/list";
import { ProfilesList } from "./pages/profiles/list";
import { ProfilesEdit } from "./pages/profiles/edit";
import { CiudadesList } from "./pages/ciudades/list";
import { CiudadesCreate } from "./pages/ciudades/create";
import { CiudadesEdit } from "./pages/ciudades/edit";
import { DestinosList } from "./pages/destinos/list";
import { DestinosCreate } from "./pages/destinos/create";
import { DestinosEdit } from "./pages/destinos/edit";
import { PlanesList } from "./pages/planes/list";
import { PlanesCreate } from "./pages/planes/create";
import { PlanesEdit } from "./pages/planes/edit";
import { DocumentosList } from "./pages/documentos/list";
import { DocumentosCreate } from "./pages/documentos/create";
import { DocumentosShow } from "./pages/documentos/show";
import { FechasReunionList } from "./pages/fechas-reunion/list";
import { FechasReunionCreate } from "./pages/fechas-reunion/create";
import { FechasReunionEdit } from "./pages/fechas-reunion/edit";
import { VotosFechaList } from "./pages/votos-fecha/list";
import { VotosPlanList } from "./pages/votos-plan/list";
import { MensajesPage } from "./pages/mensajes";
import { VentasList } from "./pages/ventas/list";
import { VentasCreate } from "./pages/ventas/create";
import { VentasEdit } from "./pages/ventas/edit";
import { VentasDashboard } from "./pages/ventas/dashboard";
import { CorreccionesList } from "./pages/correcciones/list";
import { LeadsList } from "./pages/leads/list";
import { LeadsShow } from "./pages/leads/show";
import { LeadsEdit } from "./pages/leads/edit";

export default function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={esES}>
      <AntdApp>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider(supabaseClient)}
          liveProvider={liveProvider(supabaseClient)}
          authProvider={authProvider}
          accessControlProvider={accessControlProvider}
          resources={resources}
          notificationProvider={useNotificationProvider}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            useNewQueryKeys: true,
          }}
        >
          <Routes>
            <Route
              element={
                <Authenticated key="protected" fallback={<CatchAllNavigate to="/login" />}>
                  <EmpresaContextProvider>
                    <ThemedLayout Header={Header} Title={Title}>
                      <Outlet />
                    </ThemedLayout>
                  </EmpresaContextProvider>
                </Authenticated>
              }
            >
              <Route index element={<NavigateByRole />} />

              <Route path="/empresas">
                <Route index element={<EmpresasList />} />
                <Route path="create" element={<EmpresasCreate />} />
                <Route path="edit/:id" element={<EmpresasEdit />} />
              </Route>
              <Route path="/escuelas">
                <Route index element={<EscuelasList />} />
                <Route path="create" element={<EscuelasCreate />} />
                <Route path="edit/:id" element={<EscuelasEdit />} />
              </Route>
              <Route path="/grupos">
                <Route index element={<GruposList />} />
                <Route path="create" element={<GruposCreate />} />
                <Route path="edit/:id" element={<GruposEdit />} />
              </Route>
              <Route path="/familias">
                <Route index element={<FamiliasList />} />
                <Route path="edit/:id" element={<FamiliasEdit />} />
              </Route>
              <Route path="/alumnos" element={<AlumnosList />} />
              <Route path="/profiles">
                <Route index element={<ProfilesList />} />
                <Route path="edit/:id" element={<ProfilesEdit />} />
              </Route>

              <Route path="/ciudades">
                <Route index element={<CiudadesList />} />
                <Route path="create" element={<CiudadesCreate />} />
                <Route path="edit/:id" element={<CiudadesEdit />} />
              </Route>
              <Route path="/destinos">
                <Route index element={<DestinosList />} />
                <Route path="create" element={<DestinosCreate />} />
                <Route path="edit/:id" element={<DestinosEdit />} />
              </Route>
              <Route path="/planes">
                <Route index element={<PlanesList />} />
                <Route path="create" element={<PlanesCreate />} />
                <Route path="edit/:id" element={<PlanesEdit />} />
              </Route>
              <Route path="/documentos">
                <Route index element={<DocumentosList />} />
                <Route path="create" element={<DocumentosCreate />} />
                <Route path="show/:id" element={<DocumentosShow />} />
              </Route>

              <Route path="/fechas-reunion">
                <Route index element={<FechasReunionList />} />
                <Route path="create" element={<FechasReunionCreate />} />
                <Route path="edit/:id" element={<FechasReunionEdit />} />
              </Route>
              <Route path="/votos-fecha" element={<VotosFechaList />} />
              <Route path="/votos-plan" element={<VotosPlanList />} />
              <Route path="/mensajes" element={<MensajesPage />} />

              <Route path="/ventas">
                <Route index element={<VentasList />} />
                <Route path="create" element={<VentasCreate />} />
                <Route path="edit/:id" element={<VentasEdit />} />
              </Route>
              <Route path="/ventas-dashboard" element={<VentasDashboard />} />
              <Route path="/correcciones" element={<CorreccionesList />} />
              <Route path="/leads">
                <Route index element={<LeadsList />} />
                <Route path="show/:id" element={<LeadsShow />} />
                <Route path="edit/:id" element={<LeadsEdit />} />
              </Route>

              <Route path="*" element={<ErrorComponent />} />
            </Route>

            <Route
              element={
                <Authenticated key="auth" fallback={<Outlet />}>
                  <NavigateToResource />
                </Authenticated>
              }
            >
              <Route
                path="/login"
                element={
                  <AuthPage
                    type="login"
                    title="Egresados · Admin"
                    forgotPasswordLink={false}
                    registerLink={false}
                    rememberMe={false}
                    formProps={{ initialValues: {} }}
                  />
                }
              />
            </Route>
          </Routes>
        </Refine>
      </AntdApp>
    </ConfigProvider>
  );
}
