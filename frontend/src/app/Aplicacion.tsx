import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'

import { EstructuraPublica } from '@/components/estructura/EstructuraPublica'
import { PaginaRegistro } from '@/features/registro/PaginaRegistro'
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
      <BrowserRouter>
        <Routes>
          <Route element={<EstructuraPublica />}>
            <Route index element={<PaginaInicio />} />
            <Route path="*" element={<PaginaNoEncontrada />} />
          </Route>
          <Route path="registro" element={<PaginaRegistro />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" toastOptions={{ className: 'font-sans' }} style={temaAvisos} />
    </QueryClientProvider>
  )
}
