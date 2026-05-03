// database/backup-manager.js - Export/Import cifrado con AES-GCM
import { dbManager } from "./db-manager.js";
import { securityUtils } from "../crypto/security-utils.js";

export const backupManager = {
  /**
   * Exporta la bóveda completa a un archivo JSON cifrado
   * @param {string} masterPassword - Contraseña maestra para cifrar el archivo
   */
  async exportVault(masterPassword) {
    const currentUser = sessionStorage.getItem("current_user");
    if (!currentUser) throw new Error("No hay usuario autenticado");

    // Obtener metadata del usuario (necesaria para restaurar en otro dispositivo)
    const user = await dbManager.getUser(currentUser);
    if (!user) throw new Error("Usuario no encontrado");

    // Obtener credenciales (dbManager las devuelve ya desencriptadas)
    const vaultItems = await dbManager.getAll(currentUser);

    const payload = {
      users: [{
        username: user.username,
        salt: user.salt,
        iterations: user.iterations,
        createdAt: user.createdAt
      }],
      vault: vaultItems
    };

    // Derivar clave específica para el backup
    const salt = securityUtils.base64ToArrayBuffer(user.salt);
    const backupKey = await securityUtils.deriveEncryptionKey(masterPassword, salt);

    // Encriptar payload completo
    const encrypted = await securityUtils.encryptData(payload, backupKey);

    const backupFile = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      app: "Thalamos",
      userContext: {
        username: user.username,
        salt: user.salt,
        iterations: user.iterations
      },
      backupData: encrypted
    };

    // Disparar descarga
    const blob = new Blob([JSON.stringify(backupFile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thalamos-backup-${currentUser}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return { success: true };
  },

  /**
   * Importa y restaura un backup cifrado
   * @param {File} file - Archivo .json seleccionado
   * @param {string} masterPassword - Contraseña para desencriptar
   */
  async importVault(file, masterPassword) {
    const text = await file.text();
    const backup = JSON.parse(text);

    // Validaciones de estructura
    if (!backup.version || !backup.userContext || !backup.backupData) {
      throw new Error("Formato de backup inválido");
    }
    if (backup.app !== "Thalamos") {
      throw new Error("Este archivo no es un backup de Thalamos");
    }

    // Derivar clave con el salt embebido en el backup
    const salt = securityUtils.base64ToArrayBuffer(backup.userContext.salt);
    const backupKey = await securityUtils.deriveEncryptionKey(masterPassword, salt);

    // Desencriptar
    const decrypted = await securityUtils.decryptData(
      backup.backupData.iv,
      backup.backupData.ciphertext,
      backupKey
    );

    if (!decrypted.users || !decrypted.vault) {
      throw new Error("Datos del backup corruptos");
    }

    // Restaurar usuario (crea si no existe)
    const targetUser = decrypted.users[0];
    const existingUser = await dbManager.getUser(targetUser.username);
    if (!existingUser) {
      await dbManager.saveUser(targetUser);
    }

    // Restaurar credenciales (merge seguro)
    const currentSessionUser = sessionStorage.getItem("current_user");
    const activeUser = currentSessionUser || targetUser.username;

    for (const item of decrypted.vault) {
      item.userId = activeUser; // Asegurar归属
      await dbManager.saveCredential(item); // put() actualiza o inserta
    }

    return { success: true, user: activeUser };
  }
};