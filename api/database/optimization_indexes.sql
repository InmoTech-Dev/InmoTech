-- =====================================================================================================================
-- OPTIMIZACIÓN DE ÍNDICES PARA ENDPOINTS LENTOS
-- =====================================================================================================================
-- Este script agrega índices faltantes en columnas FK para mejorar rendimiento de JOINs
-- Especialmente optimizado para /api/v1/citas, /api/v1/personas, /api/v1/administrativos
-- =====================================================================================================================

USE InmobiliariaDB;
GO

PRINT '🔧 AGREGANDO ÍNDICES DE OPTIMIZACIÓN PARA FK FRECUENTES';
PRINT '';

-- Índices para tabla Citas (FKs más consultadas)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Citas') AND name = 'IX_Citas_Inmueble')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Citas_Inmueble ON Citas(id_inmueble);
    PRINT '✅ Índice agregado: IX_Citas_Inmueble';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Citas') AND name = 'IX_Citas_Servicio')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Citas_Servicio ON Citas(id_servicio);
    PRINT '✅ Índice agregado: IX_Citas_Servicio';
END

-- Índices para tabla Administrativos
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Administrativos') AND name = 'IX_Administrativos_Persona')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Administrativos_Persona ON Administrativos(id_persona);
    PRINT '✅ Índice agregado: IX_Administrativos_Persona';
END

-- Índices para tabla Personas_rol (optimización de filtros por roles)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Personas_rol') AND name = 'IX_PersonasRol_Estado')
BEGIN
    CREATE NONCLUSTERED INDEX IX_PersonasRol_Estado ON Personas_rol(id_persona, estado) WHERE estado = 1;
    PRINT '✅ Índice agregado: IX_PersonasRol_Estado';
END

-- Índices para optimización de consultas con joins complejos
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Personas_rol') AND name = 'IX_PersonasRol_RolEstado')
BEGIN
    CREATE NONCLUSTERED INDEX IX_PersonasRol_RolEstado ON Personas_rol(id_rol, estado) INCLUDE (id_persona) WHERE estado = 1;
    PRINT '✅ Índice agregado: IX_PersonasRol_RolEstado';
END

-- Índice compuesto para consultas de administrativos con persona
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Personas') AND name = 'IX_Personas_EstadoCuenta')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Personas_EstadoCuenta ON Personas(estado, tiene_cuenta) WHERE estado = 1;
    PRINT '✅ Índice agregado: IX_Personas_EstadoCuenta';
END

PRINT '';
PRINT '🎯 OPTIMIZACIÓN COMPLETADA';
PRINT '';
PRINT 'Estos índices mejorarán significativamente el rendimiento de:';
PRINT '   - GET /api/v1/citas (joins con persona, inmueble, servicio)';
PRINT '   - GET /api/v1/personas (filtrado por rol Usuario)';
PRINT '   - GET /api/v1/administrativos (joins con persona y roles)';
PRINT '';
PRINT '📊 Verificar rendimiento después de aplicar índices';
PRINT '   - Monitorear tiempo de respuesta de los endpoints';
PRINT '   - Usar EXPLAIN PLAN si es necesario para fine-tuning';
GO
