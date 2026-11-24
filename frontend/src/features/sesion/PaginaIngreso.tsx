import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/Campo'
import { EstructuraAcceso } from '@/features/registro/EstructuraAcceso'
import { leerFormulario } from '@/lib/formularios'

import { useAutenticacion } from './useAutenticacion'

interface EstadoNavegacionIngreso {
  desde?: string
  email?: string
}

export function PaginaIngreso() {
  const { ingresar } = useAutenticacion()
  const navegar = useNavigate()
  const estado = (useLocation().state ?? {}) as EstadoNavegacionIngreso

  const mutacion = useMutation({
    mutationFn: ({ email, password }: Record<'email' | 'password', string>) => ingresar(email, password),
    onSuccess: (usuario) => {
      toast.success(`¡Hola, ${usuario.first_name}!`)
      navegar(usuario.role === 'admin' ? '/admin' : (estado.desde ?? '/'), { replace: true })
    },
  })
  const pasajero = mutacion.data ? `${mutacion.data.first_name} ${mutacion.data.last_name}` : ''

  return (
    <EstructuraAcceso
      titulo="Ingresá a tu cuenta"
      pasajero={pasajero}
      subtitulo={
        <>
          ¿Todavía no tenés cuenta?{' '}
          <Link to="/registro" className="font-semibold text-route-600 hover:underline">
            Registrate
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(evento) => {
          evento.preventDefault()
          mutacion.mutate(leerFormulario<'email' | 'password'>(evento.currentTarget))
        }}
      >
        <AlertaFormulario mensaje={mutacion.error?.message} />
        <CampoTexto
          etiqueta="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={estado.email}
          placeholder="nombre@correo.com"
        />
        <CampoTexto etiqueta="Contraseña" name="password" type="password" autoComplete="current-password" />
        <Boton type="submit" tamano="lg" cargando={mutacion.isPending} className="mt-2">
          Ingresar
        </Boton>
      </form>
    </EstructuraAcceso>
  )
}
