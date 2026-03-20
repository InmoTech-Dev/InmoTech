// ... existing code ...
import { useContext } from 'react';
import AppointmentContext from 'src/shared/contexts/AppointmentContext';

const estadosDisponibles = [
  { id_estado_cita: 1, nombre_estado: 'Solicitada' },
  { id_estado_cita: 2, nombre_estado: 'Confirmada' },
  { id_estado_cita: 3, nombre_estado: 'Programada' },
  { id_estado_cita: 4, nombre_estado: 'Re Agendada' },
  { id_estado_cita: 5, nombre_estado: 'Completada' },
  { id_estado_cita: 6, nombre_estado: 'Cancelada' },
];

// ... existing code ...
const { updateAppointmentStatus } = useContext(AppointmentContext);

const handleEstadoChange = async (e) => {
  const nuevoEstadoId = e.target.value;
  await updateAppointmentStatus(cita.id, nuevoEstadoId);
};

// ... existing code ...
<select value={cita.id_estado_cita} onChange={handleEstadoChange}>
  {estadosDisponibles.map((estado) => (
    <option key={estado.id_estado_cita} value={estado.id_estado_cita}>
      {estado.nombre_estado}
    </option>
  ))}
</select>
// ... existing code ...
