const bcrypt = require('bcryptjs');
const logger = require('./logger');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

class BcryptUtils {
  /**
   * Hashea una contraseña
   * @param {string} password - Contraseña en texto plano
   * @returns {Promise<string>} Hash de la contraseña
   */
  async hashPassword(password) {
    try {
      if (!password) {
        throw new Error('La contraseña es requerida');
      }

      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hash = await bcrypt.hash(password, salt);

      logger.info('Contraseña hasheada exitosamente');
      return hash;
    } catch (error) {
      logger.error('Error hasheando contraseña:', error);
      throw new Error('Error al hashear la contraseña');
    }
  }

  /**
   * Verifica una contraseña contra su hash
   * @param {string} password - Contraseña en texto plano
   * @param {string} hash - Hash de la contraseña
   * @returns {Promise<boolean>} True si coincide, false si no
   */
  async verifyPassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }

      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      logger.error('Error verificando contraseña:', error);
      return false;
    }
  }
}

module.exports = new BcryptUtils();
