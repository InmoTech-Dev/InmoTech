require('dotenv').config();
const { sequelize } = require('../config/database');

async function checkColumns() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Personas'
    `);
        console.log('Columns in Personas:');
        console.table(cols);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkColumns();
