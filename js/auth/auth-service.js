// auth-service.js - Versión segura con hashing PBKDF2
import { dbManager } from "../database/db-manager.js";
import { securityUtils } from "../crypto/security-utils.js";

export const authService = {

  async login(username, password) {
    try {
      const user = await dbManager.getUser(username);
      
      if (!user) {
        return false;
      }

      // Verificar contraseña hasheada
      const salt = securityUtils.base64ToArrayBuffer(user.salt);
      const hash = await securityUtils.hashPassword(password, salt, user.iterations);
      const hashBase64 = securityUtils.arrayBufferToBase64(hash);

      if (hashBase64 === user.passwordHash) {
        sessionStorage.setItem("is_auth", "true");
        sessionStorage.setItem("current_user", username);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error en login:", error);
      return false;
    }
  },

  async register(username, password) {
    try {
      const existingUser = await dbManager.getUser(username);
      if (existingUser) {
        return { success: false, message: "El usuario ya existe" };
      }

      // Generar salt y hashear contraseña
      const salt = securityUtils.generateSalt();
      const iterations = 100000;
      const hash = await securityUtils.hashPassword(password, salt, iterations);
      
      const user = {
        username,
        passwordHash: securityUtils.arrayBufferToBase64(hash),
        salt: securityUtils.arrayBufferToBase64(salt),
        iterations,
        createdAt: new Date().toISOString()
      };

      await dbManager.saveUser(user);
      return { success: true };
    } catch (error) {
      console.error("Error en registro:", error);
      return { success: false, message: "Error al registrar usuario" };
    }
  },

  logout() {
    sessionStorage.clear();
    window.location.reload();
  }
};