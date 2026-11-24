import { Pencil, RotateCcw, UserPlus, UserX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Insignia, type TonoInsignia } from '@/components/ui/Insignia'
import { Boton } from '@/components/ui/Boton'
import { DialogoConfirmacion } from '@/components/ui/DialogoConfirmacion'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { BotonIcono, Tabla, Td, Th } from '@/components/ui/Tabla'
import { EncabezadoPaginaPanel } from '@/features/sesion/EncabezadoPaginaPanel'
import { useAutenticacion } from '@/features/sesion/useAutenticacion'
import { ETIQUETAS_AREA_ADMIN, type AreaAdmin } from '@/lib/cuentas'
import { cn } from '@/lib/cn'

import { ModalFormularioCuenta } from './ModalFormularioCuenta'
import { useCuentasAdmin, useDarDeBajaCuenta, useReactivarCuenta, type CuentaAdmin } from './consultas'

type EstadoFormulario = { abierto: false } | { abierto: true; cuenta: CuentaAdmin | null }

const TONOS_AREA: Record<AreaAdmin, TonoInsignia> = {
  general: 'info',
  catalog: 'positive',
  reservations: 'warning',
}

export function PaginaCuentas() {
  const { usuario } = useAutenticacion()
  const { data: cuentas = [], isPending } = useCuentasAdmin()
  const darDeBaja = useDarDeBajaCuenta()
  const reactivar = useReactivarCuenta()
  const [formulario, setFormulario] = useState<EstadoFormulario>({ abierto: false })
  const [cuentaADarDeBaja, setCuentaADarDeBaja] = useState<CuentaAdmin | null>(null)

  const confirmarBaja = () => {
    if (!cuentaADarDeBaja) return
    darDeBaja.mutate(cuentaADarDeBaja.id, {
      onSuccess: () => toast.success('Cuenta dada de baja con éxito'),
      onError: (error) => toast.error(error.message),
      onSettled: () => setCuentaADarDeBaja(null),
    })
  }

  return (
    <>
      <EncabezadoPaginaPanel
        titulo="Cuentas de administrador"
        descripcion="Dá de alta al personal y asigná a cada cuenta el área a la que puede acceder."
        accion={
          <Boton onClick={() => setFormulario({ abierto: true, cuenta: null })}>
            <UserPlus className="size-4" /> Nuevo administrador
          </Boton>
        }
      />

      {!isPending && cuentas.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay administradores" />
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Administrador</Th>
              <Th>Área</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((cuenta) => (
              <tr
                key={cuenta.id}
                className={cn('transition-colors hover:bg-paper', !cuenta.is_active && 'text-ink-500')}
              >
                <Td>
                  <p className={cn('font-semibold', cuenta.is_active && 'text-ink-900')}>
                    {cuenta.first_name} {cuenta.last_name}
                    {cuenta.id === usuario?.id && <span className="ml-2 text-xs font-medium text-ink-500">(vos)</span>}
                  </p>
                  <p className="text-ink-500">{cuenta.email}</p>
                </Td>
                <Td>
                  <Insignia tono={TONOS_AREA[cuenta.admin_area]}>{ETIQUETAS_AREA_ADMIN[cuenta.admin_area]}</Insignia>
                </Td>
                <Td>
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className={cn('size-2 rounded-full', cuenta.is_active ? 'bg-fare-flexible' : 'bg-ink-300')}
                    />
                    {cuenta.is_active ? 'Activa' : 'Dada de baja'}
                  </span>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <BotonIcono
                      aria-label="Editar"
                      title="Editar"
                      onClick={() => setFormulario({ abierto: true, cuenta })}
                    >
                      <Pencil className="size-4" />
                    </BotonIcono>
                    {cuenta.is_active ? (
                      cuenta.id !== usuario?.id && (
                        <BotonIcono
                          aria-label="Dar de baja"
                          title="Dar de baja"
                          className="hover:bg-route-50 hover:text-route-600"
                          onClick={() => setCuentaADarDeBaja(cuenta)}
                        >
                          <UserX className="size-4" />
                        </BotonIcono>
                      )
                    ) : (
                      <BotonIcono
                        aria-label="Reactivar"
                        title="Reactivar"
                        onClick={() =>
                          reactivar.mutate(cuenta.id, {
                            onSuccess: () => toast.success('Cuenta reactivada con éxito'),
                          })
                        }
                      >
                        <RotateCcw className="size-4" />
                      </BotonIcono>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      <ModalFormularioCuenta
        abierto={formulario.abierto}
        cuenta={formulario.abierto ? formulario.cuenta : null}
        alCerrar={() => setFormulario({ abierto: false })}
      />
      <DialogoConfirmacion
        abierto={cuentaADarDeBaja !== null}
        titulo="¿Dar de baja esta cuenta?"
        descripcion={`${cuentaADarDeBaja?.first_name} ${cuentaADarDeBaja?.last_name} no podrá volver a ingresar al panel. La cuenta no se elimina y podés reactivarla más adelante.`}
        textoConfirmar="Dar de baja"
        cargando={darDeBaja.isPending}
        alConfirmar={confirmarBaja}
        alCancelar={() => setCuentaADarDeBaja(null)}
      />
    </>
  )
}
