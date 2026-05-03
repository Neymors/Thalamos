// security-utils.js - Utilidades de seguridad con Web Crypto API

export const securityUtils = {

  // ==================== HASH DE CONTRASEÑAS (PBKDF2) ====================
  
  /**
   * Genera un salt aleatorio
   */
  generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
  },

  /**
   * Hashea una contraseña usando PBKDF2 con SHA-256
   * @param {string} password - Contraseña a hashear
   * @param {Uint8Array} salt - Salt aleatorio
   * @param {number} iterations - Número de iteraciones (por defecto 100000)
   * @returns {Promise<Uint8Array>} Hash resultante
   */
  async hashPassword(password, salt, iterations = 100000) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return new Uint8Array(hash);
  },

  /**
   * Convierte ArrayBuffer/Uint8Array a Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  /**
   * Convierte Base64 a Uint8Array
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  // ==================== ENCRIPTACIÓN DE LA BÓVEDA (AES-GCM) ====================

  /**
   * Deriva una clave de encriptación desde la contraseña maestra
   * @param {string} password - Contraseña maestra del usuario
   * @param {Uint8Array} salt - Salt para derivación
   * @returns {Promise<CryptoKey>} Clave para encriptar/desencriptar
   */
  async deriveEncryptionKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encripta un objeto JSON
   * @param {Object} data - Datos a encriptar
   * @param {CryptoKey} key - Clave de encriptación
   * @returns {Promise<{iv: string, ciphertext: string}>} Datos encriptados
   */
  async encryptData(data, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits para AES-GCM
    const encoded = encoder.encode(JSON.stringify(data));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoded
    );

    return {
      iv: this.arrayBufferToBase64(iv),
      ciphertext: this.arrayBufferToBase64(ciphertext)
    };
  },

  /**
   * Desencripta datos
   * @param {string} iv - Vector de inicialización (Base64)
   * @param {string} ciphertext - Texto cifrado (Base64)
   * @param {CryptoKey} key - Clave de desencriptación
   * @returns {Promise<Object>} Datos originales
   */
  async decryptData(iv, ciphertext, key) {
    const decoder = new TextDecoder();
    const ivBuffer = this.base64ToArrayBuffer(iv);
    const ciphertextBuffer = this.base64ToArrayBuffer(ciphertext);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      ciphertextBuffer
    );

    return JSON.parse(decoder.decode(decrypted));
  }
};