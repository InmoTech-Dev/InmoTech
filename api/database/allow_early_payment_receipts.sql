/*
  Permite registrar pagos anticipados en cobros de arriendo.
  Antes: fecha_pago >= fecha_cobro
  Ahora: fecha_pago solo debe ser nula o no futura.
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

ALTER TABLE dbo.Cobros
ADD CONSTRAINT CHK_Cobros_FechaPago
CHECK (
  fecha_pago IS NULL
  OR fecha_pago <= CAST(GETDATE() AS DATE)
);
