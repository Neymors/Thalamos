// main.js - Versión definitiva con copiado universal y sin errores

import { generatePassword, checkStrength } from "./crypto/crypto-core.js";
import { authService } from "./auth/auth-service.js";
import { dbManager } from "./database/db-manager.js";

// Elementos DOM
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

// Generador
const lengthSlider = document.getElementById('length-slider');
const lengthVal = document.getElementById('length-val');
const passwordOutput = document.getElementById('password-output');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');

// Bóveda y modal
const saveLocalBtn = document.getElementById('save-local');
const saveModal = document.getElementById('save-modal');
const confirmSaveBtn = document.getElementById('confirm-save');
const cancelSaveBtn = document.getElementById('cancel-save');
const saveService = document.getElementById('save-service');
const saveUser = document.getElementById('save-user');
const savePass = document.getElementById('save-pass');
const vaultItems = document.getElementById('vault-items');

// Utilidades
function showAlert(msg, isError = true) {
    alert(msg);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== FUNCIÓN UNIVERSAL DE COPIADO (CON FALLBACK) ====================
async function copyToClipboard(text, buttonElement, successMessage = "✅ Copiado") {
    if (!text) return false;
    
    // Guardar texto original del botón
    const originalText = buttonElement.textContent;
    
    // Intentar método moderno
    try {
        await navigator.clipboard.writeText(text);
        buttonElement.textContent = successMessage;
        setTimeout(() => buttonElement.textContent = originalText, 1500);
        return true;
    } catch (err) {
        // Fallback para Android/HTTP (usando textarea y execCommand)
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                buttonElement.textContent = successMessage;
                setTimeout(() => buttonElement.textContent = originalText, 1500);
                return true;
            } else {
                showAlert("No se pudo copiar. Copiá manualmente.");
                return false;
            }
        } catch (e) {
            showAlert("Error al copiar. Copiá manualmente.");
            return false;
        }
    }
}

// Actualizar medidor de fortaleza
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
    let color = '';
    let label = '';
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
    strengthText.textContent = `🔒 Fuerza: ${label} (${result.isStrong ? '✅ segura' : '⚠️ mejorable'})`;
}

// ==================== NAVEGACIÓN ENTRE FORMULARIOS ====================
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

// ==================== AUTENTICACIÓN ====================
loginBtn.addEventListener('click', async () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    if (!user || !pass) {
        return showAlert("Completá ambos campos.");
    }
    const success = await authService.login(user, pass);
    if (success) {
        authScreen.classList.add('hidden');
        mainAppContent.classList.remove('hidden');
        if (currentUserDisplay) currentUserDisplay.textContent = user;
        renderVault();
        generateNewPassword();
    } else {
        showAlert("Usuario o contraseña incorrectos.");
    }
});

registerBtn.addEventListener('click', async () => {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const confirm = document.getElementById('reg-pass-confirm').value;
    if (!user || !pass || !confirm) {
        return showAlert("Completá todos los campos.");
    }
    if (user.length < 3) return showAlert("El usuario debe tener al menos 3 caracteres.");
    if (pass.length < 6) return showAlert("La contraseña debe tener al menos 6 caracteres.");
    if (pass !== confirm) return showAlert("Las contraseñas no coinciden.");
    const result = await authService.register(user, pass);
    if (result.success) {
        showAlert("✅ ¡Cuenta creada con éxito! Ahora iniciá sesión.", false);
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        document.getElementById('login-user').value = user;
        document.getElementById('login-pass').value = '';
    } else {
        showAlert(result.message || "Error al crear la cuenta.");
    }
});

logoutBtn.addEventListener('click', () => {
    authService.logout();
});

// ==================== GENERADOR DE CONTRASEÑAS ====================
function generateNewPassword() {
    const length = parseInt(lengthSlider.value);
    const newPass = generatePassword(length, {
        uppercase: true,
        numbers: true,
        symbols: true,
        excludeAmbiguous: false,
        minNumbers: 1,
        minSymbols: 1
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

// Botón copiar principal - usa la función universal
copyBtn.addEventListener('click', () => {
    const password = passwordOutput.value;
    if (!password) {
        showAlert("No hay contraseña generada.");
        return;
    }
    copyToClipboard(password, copyBtn, "✅ Copiado");
});

// ==================== BÓVEDA (IndexedDB) ====================
async function renderVault() {
    const currentUser = sessionStorage.getItem("current_user");
    if (!currentUser) return;
    const items = await dbManager.getAll(currentUser);
    vaultItems.innerHTML = '';
    if (items.length === 0) {
        vaultItems.innerHTML = '<p class="empty-msg">📭 No hay credenciales guardadas aún.</p>';
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
            </div>
        `;
        vaultItems.appendChild(div);
    });

    // Asignar eventos a los botones de copiar de cada credencial
    document.querySelectorAll('.copy-pass-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const pass = btn.getAttribute('data-pass');
            if (pass) {
                await copyToClipboard(pass, btn, "✅ Copiado");
            }
        });
    });

    // Eventos para eliminar credencial
    // Eventos para eliminar credencial
    document.querySelectorAll('.delete-vault-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            
            // Se elimina directamente sin preguntar
            await dbManager.deleteCredential(id);
            renderVault();
        });
    });
}
// Modal Guardar 
// Botón para añadir contraseña antigua (Manual)
const addManualBtn = document.getElementById('add-manual-btn'); // Asegurate de capturarlo arriba

addManualBtn.addEventListener('click', () => {
    saveService.value = '';
    saveUser.value = '';
    savePass.value = '';
    savePass.readOnly = false; // Habilitamos la escritura manual
    document.getElementById('modal-title').textContent = '📝 Añadir Manual';
    saveModal.classList.add('active');
});

// Botón para guardar la que acabamos de generar (Automático)
saveLocalBtn.addEventListener('click', () => {
    const currentPass = passwordOutput.value;
    if (!currentPass) {
        return showAlert("Primero generá una contraseña.");
    }
    savePass.value = currentPass;
    savePass.readOnly = true; // Bloqueamos para que no se modifique por error
    saveService.value = '';
    saveUser.value = '';
    document.getElementById('modal-title').textContent = '📝 Nueva Credencial';
    saveModal.classList.add('active');
});

confirmSaveBtn.addEventListener('click', async () => {
    const service = saveService.value.trim();
    const user = saveUser.value.trim();
    const pass = savePass.value.trim();
    const currentUser = sessionStorage.getItem("current_user");

    if (!service || !user) {
        return showAlert("Completá el servicio y el usuario.");
    }
    if (!pass) return showAlert("No hay contraseña para guardar.");

    const entry = {
        id: Date.now(),
        userId: currentUser,
        service: service,
        user: user,
        pass: pass
    };
    await dbManager.saveCredential(entry);
    saveModal.classList.remove('active');
    renderVault();
    //showAlert("✅ Credencial guardada correctamente.", false);
});

// Cerrar modal haciendo clic fuera
saveModal.addEventListener('click', (e) => {
    if (e.target === saveModal) saveModal.classList.remove('active');
});



// Inicialización
if (sessionStorage.getItem("is_auth") === "true") {
    sessionStorage.clear();
}
authScreen.classList.remove('hidden');
mainAppContent.classList.add('hidden');
generateNewPassword();
