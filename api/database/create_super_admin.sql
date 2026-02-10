-- =====================================================================================================================
-- SCRIPT PARA CREAR SUPER ADMINISTRADOR EN INMOTECH
-- =====================================================================================================================
-- Este script crea un usuario Super Administrador con todos los permisos del sistema
-- Ejecutar en SQL Server Management Studio o similar
-- =====================================================================================================================

-- PASO 1: CREAR LOS ROLES DEL SISTEMA (si no existen)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Super Administrador')
BEGIN
    INSERT INTO Roles (nombre_rol, descripcion, es_rol_administrativo) VALUES
    -- Roles administrativos (personal interno)
    ('Super Administrador', 'Acceso total al sistema con todos los permisos', 1),
    ('Administrador', 'Gestión administrativa y configuración del sistema', 1),
    ('Empleado', 'Agentes inmobiliarios y empleados de la empresa', 1),
    -- Roles de clientes
    ('Usuario', 'Rol por defecto al registrarse en el sistema', 0),
    ('Propietario', 'Usuarios que tienen inmuebles registrados a su nombre', 0);

    PRINT '✅ Roles insertados:';
    PRINT '   - Super Administrador (Administrativo)';
    PRINT '   - Administrador (Administrativo)';
    PRINT '   - Empleado (Administrativo)';
    PRINT '   - Usuario (Cliente)';
    PRINT '   - Propietario (Cliente)';
END
ELSE
BEGIN
    PRINT '⚠️  Roles ya existen en la base de datos';
END
GO

-- PASO 2: CREAR SUPER ADMINISTRADOR
IF NOT EXISTS (SELECT 1 FROM Personas WHERE numero_documento = '999999999')
BEGIN
    -- Insertar Persona
    INSERT INTO Personas (tipo_documento, numero_documento, nombre_completo, apellido_completo, correo, telefono, tiene_cuenta, estado)
    VALUES ('CC', '999999999', 'Super', 'Admin', 'admin@inmotech.com', '+57 300 000 0000', 1, 1);

    DECLARE @id_super_admin INT = SCOPE_IDENTITY();

    -- Insertar Acceso (contraseña hasheada con bcrypt: "Admin123!")
    -- ⚠️ IMPORTANTE: En producción, cambiar esta contraseña inmediatamente después del primer login
    INSERT INTO Acceso (id_persona, contrasena)
    VALUES (@id_super_admin, '$2a$10$s5B2QSkyB61NeA6VfBnR6uK5g2IZe6CoKlR4GcQzvgmwmwzzu99nm');

    -- Insertar en tabla Administrativos (personal interno)
    INSERT INTO Administrativos (id_persona, codigo_empleado, fecha_ingreso, cargo, departamento, estado_laboral)
    VALUES (@id_super_admin, 'ADMIN-001', GETDATE(), 'Super Administrador', 'Tecnología', 'Activo');

    -- Asignar rol Super Administrador
    DECLARE @id_rol_super INT = (SELECT id_rol FROM Roles WHERE nombre_rol = 'Super Administrador');
    INSERT INTO Personas_rol (id_persona, id_rol)
    VALUES (@id_super_admin, @id_rol_super);

    PRINT '';
    PRINT '✅ Super Administrador creado exitosamente';
    PRINT '';
    PRINT '   ╔════════════════════════════════════════════════════╗';
    PRINT '   ║         CREDENCIALES DE SUPER ADMINISTRADOR        ║';
    PRINT '   ╠════════════════════════════════════════════════════╣';
    PRINT '   ║  Email:    admin@inmotech.com                      ║';
    PRINT '   ║  Password: Admin123!                               ║';
    PRINT '   ║  Código:   ADMIN-001                               ║';
    PRINT '   ╚════════════════════════════════════════════════════╝';
    PRINT '';
    PRINT '   ⚠️  IMPORTANTE: Cambiar esta contraseña en producción';
    PRINT '';
END
ELSE
BEGIN
    PRINT '⚠️  Super Administrador ya existe en la base de datos';
END
GO

-- =====================================================================================================================
-- VERIFICACIÓN: Consultar el usuario creado
-- =====================================================================================================================
SELECT
    p.id_persona,
    p.nombre_completo,
    p.apellido_completo,
    p.correo,
    p.telefono,
    r.nombre_rol,
    a.codigo_empleado,
    a.cargo,
    a.departamento,
    a.estado_laboral
FROM Personas p
LEFT JOIN Personas_rol pr ON p.id_persona = pr.id_persona
LEFT JOIN Roles r ON pr.id_rol = r.id_rol
LEFT JOIN Administrativos a ON p.id_persona = a.id_persona
WHERE p.correo = 'admin@inmotech.com';
GO
