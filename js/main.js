// main.js - Versión segura con Toasts, cifrado integrado + Seguridad mejorada
import { generatePassword, checkStrength } from "./crypto/crypto-core.js";
import { authService } from "./auth/auth-service.js";
import { dbManager } from "./database/db-manager.js";

// ==================== ELEMENTOS DOM ====================
const authScreen = document.getElementById('auth-screen');
const mainAppContent = document.getElementById('main-app-content');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const currentUserDisplay = document.getElementById('current-user-display');

const lengthSlider = document.getElementById('length-slider');
const lengthVal = document.getElementById('length-val');
const passwordOutput = document.getElementById('password-output');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');

const saveLocalBtn = document.getElementById('save-local');
const addManualBtn = document.getElementById('add-manual-btn');
const saveModal = document.getElementById('save-modal');
const confirmSaveBtn = document.getElementById('confirm-save');
const cancelSaveBtn = document.getElementById('cancel-save');
const saveService = document.getElementById('save-service');
const saveUser = document.getElementById('save-user');
const savePass = document.getElementById('save-pass');
const vaultItems = document.getElementById('vault-items');

// ==================== SEGURIDAD: CONTROL DE INACTIVIDAD ====================
let inactivityTimeout;
const INACTIVITY_TIME = 10 * 60 * 1000; // 10 minutos

function resetInactivityTimer() {
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(() => {
    if (sessionStorage.getItem("is_auth") === "true") {
      showToast("Sesión cerrada por inactividad.", 'warning');
      dbManager.clearEncryptionKey();
      authService.logout();
    }
  }, INACTIVITY_TIME);
}

// Detectar actividad: click, tecla, scroll
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keydown', resetInactivityTimer);
document.addEventListener('scroll', resetInactivityTimer);
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('touchstart', resetInactivityTimer);

// ==================== SEGURIDAD: LÍMITE DE INTENTOS DE LOGIN ====================
const LOGIN_ATTEMPT_KEY = 'login_attempts';
const LOGIN_LOCKOUT_DURATION = 60 * 1000; // 1 minuto
const MAX_LOGIN_ATTEMPTS = 3;

function getLoginAttempts() {
  const stored = localStorage.getItem(LOGIN_ATTEMPT_KEY);
  if (!stored) return { count: 0, timestamp: null, locked: false };
  
  const { count, timestamp } = JSON.parse(stored);
  const now = Date.now();
  
  // Si pasó el tiempo de bloqueo, reiniciar
  if (now - timestamp > LOGIN_LOCKOUT_DURATION) {
    return { count: 0, timestamp: null, locked: false };
  }
  
  return { 
    count, 
    timestamp, 
    locked: count >= MAX_LOGIN_ATTEMPTS,
    remainingTime: Math.ceil((LOGIN_LOCKOUT_DURATION - (now - timestamp)) / 1000)
  };
}

function recordLoginAttempt() {
  const attempts = getLoginAttempts();
  const newCount = attempts.count + 1;
  localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify({
    count: newCount,
    timestamp: Date.now()
  }));
}

function clearLoginAttempts() {
  localStorage.removeItem(LOGIN_ATTEMPT_KEY);
}

// ==================== SISTEMA DE NOTIFICACIONES (TOASTS) ====================
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-content">${message}</span>
    <button class="toast-close" aria-label="Cerrar">×</button>
  `;

  container.appendChild(toast);

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  });

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// ==================== UTILIDADES ====================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));
}

// Estado de carga para botones
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = '⏳ Procesando...';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

async function copyToClipboard(text, buttonElement, successMessage = "✅ Copiado") {
  if (!text) return false;
  const originalText = buttonElement.textContent;

  try {
    await navigator.clipboard.writeText(text);
    buttonElement.textContent = successMessage;
    setTimeout(() => buttonElement.textContent = originalText, 1500);
    return true;
  } catch (err) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        buttonElement.textContent = successMessage;
        setTimeout(() => buttonElement.textContent = originalText, 1500);
        return true;
      } else {
        showToast("No se pudo copiar. Copiá manualmente.", 'error');
        return false;
      }
    } catch (e) {
      showToast("Error al copiar. Copiá manualmente.", 'error');
      return false;
    }
  }
}

function updateStrengthMeter(password) {
  if (!password) {
    strengthBar.style.width = '0%';
    strengthBar.className = 'bar';
    strengthText.textContent = '⚡ Fuerza: ---';
    return;
  }
  const result = checkStrength(password);
  const score = result.score;
  let width = (score + 1) * 20;
  let color = '', label = '';
  switch (score) {
    case 0: color = '#ef4444'; label = 'Muy débil'; break;
    case 1: color = '#f97316'; label = 'Débil'; break;
    case 2: color = '#f59e0b'; label = 'Moderada'; break;
    case 3: color = '#10b981'; label = 'Fuerte'; break;
    case 4: color = '#06b6d4'; label = 'Excelente'; break;
    default: color = '#94a3b8'; label = 'Desconocida';
  }
  strengthBar.style.width = `${width}%`;
  strengthBar.style.backgroundColor = color;
  strengthBar.className = 'bar';
  strengthText.textContent = ` Fuerza: ${label} (${result.isStrong ? '✅ segura' : '⚠️ mejorable'})`;
}

// ==================== MODAL DE CONFIRMACIÓN (para borrar) ====================
function askConfirmation(title, message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal-card" role="dialog">
        <h3 style="font-size:14px; font-family:var(--font-mono); font-weight:600; margin-bottom:1rem; text-align:center; color:var(--text);">${title}</h3>
        <p style="font-size:12px; color:var(--text2); font-family:var(--font-mono); margin-bottom:1.5rem; text-align:center;">${message}</p>
        <div class="modal-actions">
          <button class="secondary-btn" id="confirm-no">Cancelar</button>
          <button class="primary-btn" id="confirm-yes" style="background:var(--error); color:white; border-color:var(--error);">Eliminar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const yesBtn = modal.querySelector('#confirm-yes');
    const noBtn = modal.querySelector('#confirm-no');
    
    const cleanup = (result) => {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
      resolve(result);
    };
    
    yesBtn.addEventListener('click', () => cleanup(true));
    noBtn.addEventListener('click', () => cleanup(false));
    
    // Escape cancela
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', keyHandler);
        cleanup(false);
      }
    };
    document.addEventListener('keydown', keyHandler);
  });
}

// ==================== MODAL DE CONTRASEÑA PARA BACKUP ====================
// Reemplaza prompt() que está bloqueado en producción (iframes, headers CSP, etc.)
function askBackupPassword(description) {
  return new Promise((resolve) => {
    const modal = document.getElementById('backup-modal');
    const input = document.getElementById('backup-pass-input');
    const desc = document.getElementById('backup-modal-desc');

    desc.textContent = description;
    input.value = '';
    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);

    // Clonar botones para eliminar listeners anteriores (evita acumulación)
    const oldConfirm = document.getElementById('backup-confirm-btn');
    const oldCancel = document.getElementById('backup-cancel-btn');
    const confirmBtn = oldConfirm.cloneNode(true);
    const cancelBtn = oldCancel.cloneNode(true);
    oldConfirm.replaceWith(confirmBtn);
    oldCancel.replaceWith(cancelBtn);

    const cleanup = (value) => {
      modal.classList.remove('active');
      input.removeEventListener('keydown', keyHandler);
      resolve(value);
    };

    confirmBtn.addEventListener('click', () => cleanup(input.value || null));
    cancelBtn.addEventListener('click', () => cleanup(null));

    const keyHandler = (e) => {
      if (e.key === 'Enter') cleanup(input.value || null);
      if (e.key === 'Escape') cleanup(null);
    };
    input.addEventListener('keydown', keyHandler);

    // Click fuera del modal también cancela
    modal.addEventListener('click', function outsideClick(e) {
      if (e.target === modal) {
        modal.removeEventListener('click', outsideClick);
        cleanup(null);
      }
    });
  });
}

// ==================== NAVEGACIÓN AUTH ====================
goToRegister.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
});

goToLogin.addEventListener('click', () => {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  document.getElementById('reg-user').value = '';
  document.getElementById('reg-pass').value = '';
  document.getElementById('reg-pass-confirm').value = '';
});

// ==================== AUTENTICACIÓN (CON CIFRADO + LÍMITE DE INTENTOS) ====================
loginBtn.addEventListener('click', async () => {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  
  if (!user || !pass) return showToast("Completá ambos campos.", 'warning');

  // Verificar límite de intentos
  const loginAttempts = getLoginAttempts();
  if (loginAttempts.locked) {
    showToast(`Demasiados intentos. Intenta en ${loginAttempts.remainingTime}s.`, 'error');
    return;
  }

  setButtonLoading(loginBtn, true);
  
  try {
    const success = await authService.login(user, pass);
    
    if (success) {
      clearLoginAttempts();
      // 🔐 Inicializar clave de cifrado en memoria
      await dbManager.setEncryptionKey(pass);
      
      authScreen.classList.add('hidden');
      mainAppContent.classList.remove('hidden');
      if (currentUserDisplay) currentUserDisplay.textContent = user;
      
      // Iniciar timer de inactividad
      resetInactivityTimer();
      
      renderVault();
      generateNewPassword();
      showToast("¡Sesión iniciada!", 'success');
    } else {
      recordLoginAttempt();
      const newAttempts = getLoginAttempts();
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempts.count;
      
      if (attemptsLeft > 0) {
        showToast(`Usuario o contraseña incorrectos. (${attemptsLeft} intento${attemptsLeft > 1 ? 's' : ''} restante${attemptsLeft > 1 ? 's' : ''})`, 'error');
      } else {
        showToast(`Cuenta bloqueada por seguridad. Intenta nuevamente en 1 minuto.`, 'error');
      }
    }
  } catch (error) {
    showToast("Error al inicializar la bóveda segura.", 'error');
    console.error(error);
  } finally {
    setButtonLoading(loginBtn, false);
  }
});

registerBtn.addEventListener('click', async () => {
  const user = document.getElementById('reg-user').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const confirm = document.getElementById('reg-pass-confirm').value;
  
  if (!user || !pass || !confirm) return showToast("Completá todos los campos.", 'warning');
  if (user.length < 3) return showToast("El usuario debe tener al menos 3 caracteres.", 'warning');
  if (pass.length < 6) return showToast("La contraseña debe tener al menos 6 caracteres.", 'warning');
  if (pass !== confirm) return showToast("Las contraseñas no coinciden.", 'error');

  setButtonLoading(registerBtn, true);
  
  try {
    const result = await authService.register(user, pass);
    if (result.success) {
      showToast("¡Cuenta creada con éxito! Ahora iniciá sesión.", 'success');
      registerForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      document.getElementById('login-user').value = user;
      document.getElementById('login-pass').value = '';
    } else {
      showToast(result.message || "Error al crear la cuenta.", 'error');
    }
  } finally {
    setButtonLoading(registerBtn, false);
  }
});

logoutBtn.addEventListener('click', () => {
  // 🔐 Limpiar clave de memoria antes de cerrar sesión
  clearTimeout(inactivityTimeout);
  dbManager.clearEncryptionKey();
  authService.logout();
});

// ==================== GENERADOR ====================
function generateNewPassword() {
  const length = parseInt(lengthSlider.value);
  const newPass = generatePassword(length, {
    uppercase: true, numbers: true, symbols: true,
    excludeAmbiguous: false, minNumbers: 1, minSymbols: 1
  });
  passwordOutput.value = newPass;
  updateStrengthMeter(newPass);
  if (savePass) savePass.value = newPass;
}

lengthSlider.addEventListener('input', (e) => {
  lengthVal.textContent = e.target.value;
  generateNewPassword();
});

generateBtn.addEventListener('click', generateNewPassword);

copyBtn.addEventListener('click', () => {
  const password = passwordOutput.value;
  if (!password) return showToast("No hay contraseña generada.", 'warning');
  copyToClipboard(password, copyBtn, "✅ Copiado");
});

// ==================== BÓVEDA (DESENCRIPTACIÓN AUTOMÁTICA) ====================
async function renderVault() {
  const currentUser = sessionStorage.getItem("current_user");
  if (!currentUser) return;

  try {
    const items = await dbManager.getAll(currentUser);
    vaultItems.innerHTML = '';

    if (items.length === 0) {
      vaultItems.innerHTML = '<p class="empty-msg"> No hay credenciales guardadas aún.</p>';
      return;
    }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'vault-item';
      div.innerHTML = `
        <div class="vault-info">
          <strong>${escapeHtml(item.service)}</strong>
          <span class="vault-user">${escapeHtml(item.user)}</span>
        </div>
        <div class="vault-actions-buttons">
          <button class="copy-pass-btn" data-pass="${escapeHtml(item.pass)}">📋 Copiar</button>
          <button class="delete-vault-btn" data-id="${item.id}">🗑️</button>
        </div>`;
      vaultItems.appendChild(div);
    });

    document.querySelectorAll('.copy-pass-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pass = btn.getAttribute('data-pass');
        if (pass) await copyToClipboard(pass, btn, "✅ Copiado");
      });
    });

    document.querySelectorAll('.delete-vault-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'));
        
        // Pedir confirmación antes de borrar
        const confirmed = await askConfirmation(
          '⚠️ Confirmar eliminación',
          '¿Estás seguro de que querés borrar esta credencial? Esta acción no se puede deshacer.'
        );
        
        if (confirmed) {
          await dbManager.deleteCredential(id);
          renderVault();
          showToast("Credencial eliminada.", 'success');
        }
      });
    });
  } catch (error) {
    showToast("Error al cargar la bóveda.", 'error');
    console.error(error);
  }
}

// ==================== MODAL GUARDAR (ENCRIPTACIÓN AUTOMÁTICA) ====================
addManualBtn.addEventListener('click', () => {
  saveService.value = '';
  saveUser.value = '';
  savePass.value = '';
  savePass.readOnly = false;
  document.getElementById('modal-title').textContent = '📝 Añadir Manual';
  saveModal.classList.add('active');
});

saveLocalBtn.addEventListener('click', () => {
  const currentPass = passwordOutput.value;
  if (!currentPass) return showToast("Primero generá una contraseña.", 'warning');
  
  savePass.value = currentPass;
  savePass.readOnly = true;
  saveService.value = '';
  saveUser.value = '';
  document.getElementById('modal-title').textContent = ' Nueva Credencial';
  saveModal.classList.add('active');
});

confirmSaveBtn.addEventListener('click', async () => {
  const service = saveService.value.trim();
  const user = saveUser.value.trim();
  const pass = savePass.value.trim();
  const currentUser = sessionStorage.getItem("current_user");
  
  if (!service || !user) return showToast("Completá el servicio y el usuario.", 'warning');
  if (!pass) return showToast("No hay contraseña para guardar.", 'warning');

  try {
    const entry = {
      id: Date.now(),
      userId: currentUser,
      service, user, pass
    };
    await dbManager.saveCredential(entry);
    saveModal.classList.remove('active');
    renderVault();
    showToast("Credencial guardada correctamente.", 'success');
  } catch (error) {
    showToast("Error al guardar la credencial.", 'error');
    console.error(error);
  }
});

saveModal.addEventListener('click', (e) => {
  if (e.target === saveModal) saveModal.classList.remove('active');
});

cancelSaveBtn.addEventListener('click', () => saveModal.classList.remove('active'));

import { backupManager } from "./database/backup-manager.js";

// ==================== BACKUP MULTI-DISPOSITIVO ====================
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');

exportBtn?.addEventListener('click', async () => {
  // Usamos modal propio en lugar de prompt() (bloqueado en producción)
  const pass = await askBackupPassword("Ingresá tu contraseña maestra para cifrar el backup.");
  if (!pass) return;
  
  setButtonLoading(exportBtn, true);
  try {
    await backupManager.exportVault(pass);
    showToast("Backup exportado correctamente. Guardalo en un lugar seguro.", 'success');
  } catch (err) {
    showToast("Error al exportar: " + err.message, 'error');
  } finally {
    setButtonLoading(exportBtn, false);
  }
});

importBtn?.addEventListener('click', () => importFileInput?.click());

importFileInput?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Usamos modal propio en lugar de prompt() (bloqueado en producción)
  const pass = await askBackupPassword("Ingresá tu contraseña maestra para desencriptar el backup.");
  if (!pass) { e.target.value = ''; return; }

  try {
    const result = await backupManager.importVault(file, pass);
    showToast("Backup restaurado correctamente.", 'success');
    
    // Si el usuario del backup es distinto al de la sesión actual, recargamos para inicializar la clave correcta
    if (result.user !== sessionStorage.getItem("current_user")) {
      sessionStorage.setItem("current_user", result.user);
      window.location.reload();
    } else {
      renderVault();
    }
  } catch (err) {
    showToast("Error al importar: " + err.message, 'error');
  } finally {
    e.target.value = ''; // Resetear input para permitir reimportar el mismo archivo
  }
});

// ==================== INIT ====================
if (sessionStorage.getItem("is_auth") === "true") {
  sessionStorage.clear();
}
authScreen.classList.remove('hidden');
mainAppContent.classList.add('hidden');
generateNewPassword();