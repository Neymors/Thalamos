// db-manager.js - Versión 3.0 con encriptación AES-GCM
import { securityUtils } from "../crypto/security-utils.js";

export const dbManager = {
  dbName: "CryptoGenDB",
  version: 3, // Incrementamos la versión
  
  // Cache de clave de encriptación (solo en memoria)
  _encryptionKey: null,

  /**
   * Inicializa la conexión con IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        if (!db.objectStoreNames.contains("vault")) {
          const vaultStore = db.createObjectStore("vault", { keyPath: "id" });
          vaultStore.createIndex("userId", "userId", { unique: false });
        }
        
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "username" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject("Error al abrir la base de datos");
    });
  },

  /**
   * Establece la clave de encriptación para el usuario actual
   * @param {string} password - Contraseña maestra del usuario
   */
  async setEncryptionKey(password) {
    const currentUser = sessionStorage.getItem("current_user");
    if (!currentUser) throw new Error("No hay usuario autenticado");

    const user = await this.getUser(currentUser);
    if (!user) throw new Error("Usuario no encontrado");

    const salt = securityUtils.base64ToArrayBuffer(user.salt);
    this._encryptionKey = await securityUtils.deriveEncryptionKey(password, salt);
  },

  /**
   * Limpia la clave de encriptación de la memoria
   */
  clearEncryptionKey() {
    this._encryptionKey = null;
  },

  // ==================== GESTIÓN DE CREDENCIALES ENCRIPTADAS ====================

  /**
   * Guarda una credencial encriptada
   */
  async saveCredential(entry) {
    if (!this._encryptionKey) {
      throw new Error("No hay clave de encriptación inicializada");
    }

    try {
      // Encriptar los datos sensibles
      const encrypted = await securityUtils.encryptData(
        { service: entry.service, user: entry.user, pass: entry.pass },
        this._encryptionKey
      );

      const encryptedEntry = {
        id: entry.id || Date.now(),
        userId: entry.userId,
        ...encrypted,
        updatedAt: new Date().toISOString()
      };

      const db = await this.init();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("vault", "readwrite");
        const store = tx.objectStore("vault");
        const request = store.put(encryptedEntry);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error al guardar credencial:", error);
      throw error;
    }
  },

  /**
   * Obtiene todas las credenciales desencriptadas
   */
  async getAll(currentUser = null) {
    if (!this._encryptionKey) {
      throw new Error("No hay clave de encriptación inicializada");
    }

    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("vault", "readonly");
      const store = tx.objectStore("vault");
      const request = store.getAll();

      request.onsuccess = async () => {
        try {
          const results = [];
          
          for (const item of request.result) {
            // Filtrar por usuario si se especifica
            if (currentUser && item.userId !== currentUser) continue;

            // Desencriptar cada credencial
            const decrypted = await securityUtils.decryptData(
              item.iv,
              item.ciphertext,
              this._encryptionKey
            );

            results.push({
              id: item.id,
              userId: item.userId,
              service: decrypted.service,
              user: decrypted.user,
              pass: decrypted.pass,
              updatedAt: item.updatedAt
            });
          }
          
          resolve(results);
        } catch (error) {
          reject(error);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Borra una credencial por su ID
   */
  async deleteCredential(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("vault", "readwrite");
      const store = tx.objectStore("vault");
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // ==================== GESTIÓN DE USUARIOS ====================

  /**
   * Busca un usuario por su nombre
   */
  async getUser(username) {
    const db = await this.init();
    return new Promise((resolve) => {
      const tx = db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      const request = store.get(username);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  },

  /**
   * Registra un nuevo usuario
   */
  async saveUser(user) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("users", "readwrite");
      const store = tx.objectStore("users");
      const request = store.add(user);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};