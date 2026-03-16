require('dotenv').config();
const { sequelize } = require('../config/database');

async function syncSchema() {
    try {
        console.log('Starting database schema synchronization...');
        await sequelize.authenticate();
        console.log('Connected to the database.');

        const [dbInfo] = await sequelize.query("SELECT DB_NAME() as db, @@SERVERNAME as server");
        console.log(`Working on Database: ${dbInfo[0].db} at ${dbInfo[0].server}`);

        // 1. Check and add columns to Personas table
        const tablePersonas = 'Personas';
        const columnsPersonas = [
            { name: 'actividad_economica', type: 'VARCHAR(20) NULL' },
            { name: 'id_codeudor', type: 'INT NULL' },
            { name: 'correo_verificado', type: 'BIT NOT NULL DEFAULT 0' }
        ];

        console.log(`Checking table: ${tablePersonas}`);
        for (const col of columnsPersonas) {
            const [results] = await sequelize.query(`
        IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('dbo.${tablePersonas}') 
          AND name = '${col.name}'
        )
        BEGIN
          ALTER TABLE dbo.${tablePersonas} ADD ${col.name} ${col.type};
          SELECT 'ADDED' as status;
        END
        ELSE
        BEGIN
          SELECT 'EXISTS' as status;
        END
      `);

            if (results[0].status === 'ADDED') {
                console.log(`Column '${col.name}' added to table '${tablePersonas}'.`);
            } else {
                console.log(`Column '${col.name}' already exists in table '${tablePersonas}'.`);
            }
        }

        // 2. Check and add columns to Acceso table
        const tableAcceso = 'Acceso';
        const columnsAcceso = [
            { name: 'password_change_required', type: 'BIT NOT NULL DEFAULT 0' },
            { name: 'ultimo_cambio_password', type: 'DATETIME NULL DEFAULT GETDATE()' }
        ];

        console.log(`Checking table: ${tableAcceso}`);
        for (const col of columnsAcceso) {
            const [results] = await sequelize.query(`
        IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('dbo.${tableAcceso}') 
          AND name = '${col.name}'
        )
        BEGIN
          ALTER TABLE dbo.${tableAcceso} ADD ${col.name} ${col.type};
          SELECT 'ADDED' as status;
        END
        ELSE
        BEGIN
          SELECT 'EXISTS' as status;
        END
      `);

            if (results[0].status === 'ADDED') {
                console.log(`Column '${col.name}' added to table '${tableAcceso}'.`);
            } else {
                console.log(`Column '${col.name}' already exists in table '${tableAcceso}'.`);
            }
        }

        // 3. Check and add columns to Ventas table
        const tableVentas = 'Ventas';
        const columnsVentas = [
            { name: 'medio_pago_descripcion', type: 'VARCHAR(500) NULL' }
        ];

        console.log(`Checking table: ${tableVentas}`);
        for (const col of columnsVentas) {
            const [results] = await sequelize.query(`
        IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID('dbo.${tableVentas}') 
          AND name = '${col.name}'
        )
        BEGIN
          ALTER TABLE dbo.${tableVentas} ADD ${col.name} ${col.type};
          SELECT 'ADDED' as status;
        END
        ELSE
        BEGIN
          SELECT 'EXISTS' as status;
        END
      `);

            if (results[0].status === 'ADDED') {
                console.log(`Column '${col.name}' added to table '${tableVentas}'.`);
            } else {
                console.log(`Column '${col.name}' already exists in table '${tableVentas}'.`);
            }
        }

        console.log('Database schema synchronization completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error during database schema synchronization:', error);
        process.exit(1);
    }
}

syncSchema();
