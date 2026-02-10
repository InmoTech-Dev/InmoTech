const { Persona, Arriendo, Inmueble } = require('../models');

const arrendatarioController = {
    
    // Obtener todos los arrendatarios
    async obtenerArrendatarios(req, res) {
        try {
            const arrendatariosIds = await getIdsArrendatarios();
            
            const arrendatarios = await Persona.findAll({
                include: [{
                    model: Arriendo,
                    as: 'arriendosComoArrendatario',
                    include: [{
                        model: Inmueble,
                        as: 'Inmueble'
                    }]
                }],
                where: {
                    id_persona: arrendatariosIds
                }
            });

            res.json({
                success: true,
                data: arrendatarios
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener arrendatarios',
                error: error.message
            });
        }
    },

    // Obtener arrendatarios activos
    async obtenerArrendatariosActivos(req, res) {
        try {
            const arrendatariosIds = await getIdsArrendatarios();
            
            const arrendatariosActivos = await Persona.findAll({
                include: [{
                    model: Arriendo,
                    as: 'arriendosComoArrendatario',
                    where: { estado: 'activo' },
                    include: [{
                        model: Inmueble,
                        as: 'Inmueble'
                    }]
                }],
                where: {
                    id_persona: arrendatariosIds
                }
            });

            res.json({
                success: true,
                data: arrendatariosActivos
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener arrendatarios activos',
                error: error.message
            });
        }
    },

    // Obtener arrendatario específico
    async obtenerArrendatarioPorId(req, res) {
        try {
            const { id } = req.params;
            
            const arrendatario = await Persona.findByPk(id, {
                include: [{
                    model: Arriendo,
                    as: 'arriendosComoArrendatario',
                    include: [{
                        model: Inmueble,
                        as: 'Inmueble'
                    }]
                }]
            });

            if (!arrendatario) {
                return res.status(404).json({
                    success: false,
                    message: 'Arrendatario no encontrado'
                });
            }

            res.json({
                success: true,
                data: arrendatario
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener arrendatario',
                error: error.message
            });
        }
    },

    // Obtener arriendos de un arrendatario
    async obtenerArriendosPorArrendatario(req, res) {
        try {
            const { id } = req.params;
            
            const arriendos = await Arriendo.findAll({
                where: { id_arrendatario: id },
                include: [{
                    model: Inmueble,
                    as: 'Inmueble'
                }],
                order: [['fecha_inicio', 'DESC']]
            });

            res.json({
                success: true,
                data: arriendos
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener arriendos del arrendatario',
                error: error.message
            });
        }
    },

    // Agregar historial de arrendatario
    async agregarHistorialArrendatario(req, res) {
        try {
            const { id } = req.params;
            const { tipo, descripcion } = req.body;

            // Por ahora solo registramos en logs
            console.log(`Historial agregado para arrendatario ${id}: ${tipo} - ${descripcion}`);

            res.json({
                success: true,
                message: 'Historial agregado correctamente',
                data: {
                    arrendatario_id: id,
                    tipo,
                    descripcion,
                    fecha: new Date()
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al agregar historial',
                error: error.message
            });
        }
    },

    // Obtener historial de arrendatario
    async obtenerHistorialArrendatario(req, res) {
        try {
            const { id } = req.params;
            
            // Por ahora retornamos un array vacío
            // Puedes implementar la lógica cuando tengas el modelo HistorialArrendatario
            res.json({
                success: true,
                data: []
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener historial',
                error: error.message
            });
        }
    }
};

// Función auxiliar para obtener IDs de arrendatarios
async function getIdsArrendatarios() {
    const arriendos = await Arriendo.findAll({
        attributes: ['id_arrendatario'],
        group: ['id_arrendatario']
    });
    return arriendos.map(a => a.id_arrendatario);
}

module.exports = arrendatarioController;