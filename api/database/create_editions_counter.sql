-- =====================================================
-- MIGRACIÓN: AGREGAR CONTADOR DE EDICIONES A TABLA CITAS
-- Fecha: Noviembre 2025
-- Descripción: Agrega campos para contar ediciones realizadas sobre cada cita
-- =====================================================

USE InmobiliariaDB;
GO

-- Agregar campos para contador de ediciones
ALTER TABLE Citas
ADD ediciones_realizadas INT NOT NULL DEFAULT 0;

ALTER TABLE Citas
ADD ediciones_maximas INT NOT NULL DEFAULT 2;
GO

-- ✅ Script de actualización completado
-- Los campos se agregarán con valores por defecto:
-- - ediciones_realizadas = 0 (ninguna edición realizada)
-- - ediciones_maximas = 2 (máximo 2 ediciones permitidas)
