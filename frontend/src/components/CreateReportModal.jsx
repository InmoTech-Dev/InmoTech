export default function CreateReportModal({ isOpen, onClose, onSubmit, onDelete, submitLabel = 'Crear Reporte' }) {
    const [formData, setFormData] = useState({
        tipoReporte: '',
        descripcion: '',
        estado: 'Pendiente',
        id_inmueble: null,
        seguimientoGeneral: '',
    })

    const handleSubmit = (e) => {
        e.preventDefault()

        const reportData = {
          id_inmueble: Number(formData?.id_inmueble),
          tipoReporte: formData?.tipoReporte?.trim(),
          estado: formData?.estado || 'Pendiente',
          descripcion: formData?.descripcion || '',
          seguimientoGeneral: formData?.seguimientoGeneral || '',
          rubros,
          imagenes,
          archivos,
          seguimientosTemporales
        }

        if (!reportData.id_inmueble || !reportData.tipoReporte) {
          alert('Selecciona un inmueble y un tipo de reporte antes de continuar.')
          return
        }

        onSubmit(reportData)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Reporte">
            <form onSubmit={handleSubmit}>
                {/* otros campos */}
                {/* Descripción del Reporte a ancho completo */}
                <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Descripción del Reporte
                    </label>
                    <Textarea
                        placeholder="Descripción detallada del reporte..."
                        className="mt-1 w-full"
                        rows={6}
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    />
                </div>
                <label>
                    ID Inmueble
                    <input
                        type="number"
                        value={formData.id_inmueble ?? ''}
                        onChange={(e) => setFormData({ ...formData, id_inmueble: e.target.value ? Number(e.target.value) : null })}
                        required
                    />
                </label>
                <button type="submit">{submitLabel}</button>
            </form>
        </Modal>
    )
}