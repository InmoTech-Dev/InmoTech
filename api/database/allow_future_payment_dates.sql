/*
  Permite registrar pagos con fechas futuras en cobros y comprobantes de arriendo.
*/

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'CHK_Cobros_FechaPago'
    AND parent_object_id = OBJECT_ID('dbo.Cobros')
)
BEGIN
  ALTER TABLE dbo.Cobros
  DROP CONSTRAINT CHK_Cobros_FechaPago;
END;
GO

ALTER TABLE dbo.Cobros
ADD CONSTRAINT CHK_Cobros_FechaPago
CHECK (
  fecha_pago IS NULL
  OR fecha_pago >= '1900-01-01'
);
GO

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'CHK_Comprobantes_Fecha'
    AND parent_object_id = OBJECT_ID('dbo.Comprobantes_pago')
)
BEGIN
  ALTER TABLE dbo.Comprobantes_pago
  DROP CONSTRAINT CHK_Comprobantes_Fecha;
END;
GO

ALTER TABLE dbo.Comprobantes_pago
ADD CONSTRAINT CHK_Comprobantes_Fecha
CHECK (
  fecha_pago >= '1900-01-01'
);
GO
