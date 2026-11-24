import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Boton } from '@/components/ui/Boton'
import { CampoTexto } from '@/components/ui/Campo'
import { AlertaFormulario } from '@/components/ui/AlertaFormulario'
import { api, erroresDeCampos, errorDeFormulario } from '@/lib/api'
import { leerFormulario } from '@/lib/formularios'

import { EstructuraAcceso } from './EstructuraAcceso'

interface DatosRegistro {
  first_name: string
  last_name: string
  email: string
  password: string
}

export function PaginaRegistro() {
  const navegar = useNavigate()
  const [pasajero, setPasajero] = useState({ nombre: '', apellido: '' })

  const mutacion = useMutation({
    mutationFn: (datos: DatosRegistro) => api('/auth/register/', { metodo: 'POST', cuerpo: datos }),
    onSuccess: () => {
      toast.success('Usuario registrado con éxito')
      navegar('/', { replace: true })
    },
  })
  const errores = erroresDeCampos(mutacion.error)

  return (
    <EstructuraAcceso
      titulo="Creá tu cuenta"
      pasajero={`${pasajero.nombre} ${pasajero.apellido}`.trim()}
      subtitulo="Con tu cuenta podés reservar, pagar y publicar reseñas."
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(evento) => {
          evento.preventDefault()
          mutacion.mutate(leerFormulario<keyof DatosRegistro>(evento.currentTarget))
        }}
      >
        <AlertaFormulario mensaje={errorDeFormulario(mutacion.error)} />
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Nombre"
            name="first_name"
            autoComplete="given-name"
            error={errores.first_name}
            onChange={(evento) => setPasajero((actual) => ({ ...actual, nombre: evento.target.value }))}
          />
          <CampoTexto
            etiqueta="Apellido"
            name="last_name"
            autoComplete="family-name"
            error={errores.last_name}
            onChange={(evento) => setPasajero((actual) => ({ ...actual, apellido: evento.target.value }))}
          />
        </div>
        <CampoTexto
          etiqueta="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@correo.com"
          error={errores.email}
        />
        <CampoTexto
          etiqueta="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          ayuda="Mínimo 8 caracteres, que no sean solo números."
          error={errores.password}
        />
        <Boton type="submit" tamano="lg" cargando={mutacion.isPending} className="mt-2">
          Crear cuenta
        </Boton>
      </form>
    </EstructuraAcceso>
  )
}
