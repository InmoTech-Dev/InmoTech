/*
  Script para habilitar el flujo de invitaciones con código 6D.
  - Crea tabla Invitaciones
  - Agrega flag password_change_required a Acceso
*/

-- Tabla Invitaciones
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Invitaciones' AND xtype='U')
BEGIN
  CREATE TABLE Invitaciones (
    id_invitacion INT IDENTITY(1,1) PRIMARY KEY,
    id_persona INT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'admin_invite',
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    codigo_6d CHAR(6) NOT NULL,
    expira_en DATETIME NOT NULL,
    usado_en DATETIME NULL,
    intentos INT NOT NULL DEFAULT 0,
    reenvios INT NOT NULL DEFAULT 0,
    creado_en DATETIME NOT NULL DEFAULT GETDATE(),
    creado_por INT NULL,
    ip_uso VARCHAR(64) NULL,
    ua_uso VARCHAR(255) NULL
  );

  CREATE INDEX IX_Invitaciones_Persona ON Invitaciones (id_persona);
  CREATE INDEX IX_Invitaciones_Expira ON Invitaciones (expira_en);

  ALTER TABLE Invitaciones
    ADD CONSTRAINT FK_Invitaciones_Persona
    FOREIGN KEY (id_persona) REFERENCES Personas(id_persona);
END
GO

-- Campos adicionales para el flujo de invitaciones/verificación
IF COL_LENGTH('Invitaciones', 'tipo') IS NULL
BEGIN
  ALTER TABLE Invitaciones
    ADD tipo VARCHAR(20) NOT NULL CONSTRAINT DF_Invitaciones_tipo DEFAULT 'admin_invite';
END
GO

IF COL_LENGTH('Invitaciones', 'reenvios') IS NULL
BEGIN
  ALTER TABLE Invitaciones
    ADD reenvios INT NOT NULL CONSTRAINT DF_Invitaciones_reenvios DEFAULT 0;
END
GO

-- Flag para correo verificado en Personas
IF COL_LENGTH('Personas', 'correo_verificado') IS NULL
BEGIN
  ALTER TABLE Personas
    ADD correo_verificado BIT NOT NULL CONSTRAINT DF_Personas_correo_verificado DEFAULT 0;
END
GO

-- Flag en Acceso para forzar cambio de password
IF COL_LENGTH('Acceso', 'password_change_required') IS NULL
BEGIN
  ALTER TABLE Acceso
    ADD password_change_required BIT NOT NULL CONSTRAINT DF_Acceso_password_change_required DEFAULT 0;
END
GO
