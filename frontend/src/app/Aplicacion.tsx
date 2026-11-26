import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'

import { EstructuraPublica } from '@/components/estructura/EstructuraPublica'
import { PaginaBusquedaVuelos } from '@/features/busqueda-vuelos/PaginaBusquedaVuelos'
import { PaginaCuentas } from '@/features/cuentas-admin/PaginaCuentas'
import { PaginaDestinosAdmin } from '@/features/destinos-admin/PaginaDestinosAdmin'
import { PaginaVuelosAdmin } from '@/features/vuelos-admin/PaginaVuelosAdmin'
import { PaginaRegistro } from '@/features/registro/PaginaRegistro'
import { EstructuraPanel } from '@/features/sesion/EstructuraPanel'
import { InicioPanel, RequiereAdmin, RequiereArea } from '@/features/sesion/guardas'
import { PaginaIngreso } from '@/features/sesion/PaginaIngreso'
import { ProveedorAutenticacion } from '@/features/sesion/ProveedorAutenticacion'
import { PaginaInicio } from '@/paginas/PaginaInicio'
import { PaginaNoEncontrada } from '@/paginas/PaginaNoEncontrada'

const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

const temaAvisos = {
  '--normal-bg': 'var(--color-sheet)',
  '--normal-border': 'var(--color-ink-900)',
  '--normal-text': 'var(--color-ink-900)',
  '--border-radius': '8px',
} as CSSProperties

export function Aplicacion() {
  return (
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorAutenticacion>
        <BrowserRouter>
          <Routes>
            <Route element={<EstructuraPublica />}>
              <Route index element={<PaginaInicio />} />
              <Route path="vuelos" element={<PaginaBusquedaVuelos />} />
              <Route path="*" element={<PaginaNoEncontrada />} />
            </Route>
            <Route path="registro" element={<PaginaRegistro />} />
            <Route path="ingresar" element={<PaginaIngreso />} />
            <Route
              path="admin"
              element={
                <RequiereAdmin>
                  <EstructuraPanel />
                </RequiereAdmin>
              }
            >
              <Route index element={<InicioPanel />} />
              <Route
                path="cuentas"
                element={
                  <RequiereArea area="general">
                    <PaginaCuentas />
                  </RequiereArea>
                }
              />
              <Route
                path="destinos"
                element={
                  <RequiereArea area="catalog">
                    <PaginaDestinosAdmin />
                  </RequiereArea>
                }
              />
              <Route
                path="vuelos"
                element={
                  <RequiereArea areas={['general', 'catalog']}>
                    <PaginaVuelosAdmin />
                  </RequiereArea>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" toastOptions={{ className: 'font-sans' }} style={temaAvisos} />
      </ProveedorAutenticacion>
    </QueryClientProvider>
  )
}
