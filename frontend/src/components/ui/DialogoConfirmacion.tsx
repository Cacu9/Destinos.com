import { Boton } from './Boton'
import { Modal } from './Modal'

interface PropsDialogoConfirmacion {
  abierto: boolean
  titulo: string
  descripcion: string
  textoConfirmar: string
  cargando?: boolean
  alConfirmar: () => void
  alCancelar: () => void
}

export function DialogoConfirmacion({
  abierto,
  titulo,
  descripcion,
  textoConfirmar,
  cargando,
  alConfirmar,
  alCancelar,
}: PropsDialogoConfirmacion) {
  return (
    <Modal abierto={abierto} titulo={titulo} descripcion={descripcion} alCerrar={alCancelar}>
      <div className="flex justify-end gap-3">
        <Boton variante="secondary" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton variante="danger" cargando={cargando} onClick={alConfirmar}>
          {textoConfirmar}
        </Boton>
      </div>
    </Modal>
  )
}
