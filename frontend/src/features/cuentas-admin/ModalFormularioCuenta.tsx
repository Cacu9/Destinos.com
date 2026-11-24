import { toast } from 'sonner'

import { Boton } from '@/components/ui/Boton'
import { CampoTexto, CampoSeleccion } from '@/components/ui/Campo'
import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Modal } from '@/components/ui/Modal'
import { ETIQUETAS_AREA_ADMIN } from '@/lib/cuentas'
import { erroresDeCampos, errorDeFormulario } from '@/lib/api'
import { entradasDe } from '@/lib/entradas'
import { leerFormulario } from '@/lib/formularios'

import { useGuardarCuenta, type DatosCuenta, type CuentaAdmin } from './consultas'

interface PropsModalFormularioCuenta {
  abierto: boolean
  cuenta: CuentaAdmin | null
  alCerrar: () => void
}

export function ModalFormularioCuenta({ abierto, cuenta, alCerrar }: PropsModalFormularioCuenta) {
  const guardar = useGuardarCuenta()
  const errores = erroresDeCampos(guardar.error)
  const esEdicion = cuenta !== null

  const cerrar = () => {
    guardar.reset()
    alCerrar()
  }

  const enviar = (formulario: HTMLFormElement) => {
    const { password, ...valores } = leerFormulario<keyof DatosCuenta>(formulario)
    const datos = { ...valores, ...(password && { password }) } as DatosCuenta
    guardar.mutate(
      { ...datos, id: cuenta?.id },
      {
        onSuccess: () => {
          toast.success(esEdicion ? 'Cuenta actualizada con éxito' : 'Cuenta creada con éxito')
          cerrar()
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      titulo={esEdicion ? 'Editar administrador' : 'Nuevo administrador'}
      descripcion="Cada cuenta accede solo a las funciones de su área."
      alCerrar={cerrar}
    >
      <form
        key={cuenta?.id ?? 'new'}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          enviar(evento.currentTarget)
        }}
      >
        <AlertaFormulario mensaje={errorDeFormulario(guardar.error)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Nombre"
            name="first_name"
            defaultValue={cuenta?.first_name}
            error={errores.first_name}
          />
          <CampoTexto
            etiqueta="Apellido"
            name="last_name"
            defaultValue={cuenta?.last_name}
            error={errores.last_name}
          />
        </div>
        <CampoTexto
          etiqueta="Correo electrónico"
          name="email"
          type="email"
          defaultValue={cuenta?.email}
          error={errores.email}
        />
        <CampoSeleccion
          etiqueta="Área"
          name="admin_area"
          defaultValue={cuenta?.admin_area ?? ''}
          error={errores.admin_area}
        >
          <option value="" disabled>
            Seleccioná un área
          </option>
          {entradasDe(ETIQUETAS_AREA_ADMIN).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </CampoSeleccion>
        <CampoTexto
          etiqueta={esEdicion ? 'Nueva contraseña' : 'Contraseña inicial'}
          name="password"
          type="password"
          autoComplete="new-password"
          ayuda={esEdicion ? 'Dejala en blanco para mantener la actual.' : undefined}
          error={errores.password}
        />
        <div className="mt-2 flex justify-end gap-3">
          <Boton variante="secondary" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={guardar.isPending}>
            {esEdicion ? 'Guardar cambios' : 'Crear cuenta'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
