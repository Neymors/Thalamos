import { generatePassword } from "./crypto-core.js";

// --- ELEMENTOS DEL DOM ---
const slider = document.getElementById("length-slider");
const lengthVal = document.getElementById("length-val");
const passwordOutput = document.getElementById('password-output');
const copyBtn = document.getElementById('copy-btn');
const generateBtn = document.getElementById('generate-btn');

// Elementos de Fuerza
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');

// Elementos de la Bóveda y Modal
const saveBtn = document.getElementById('save-local');
const exportBtn = document.getElementById('export-encrypted');
const vaultItems = document.getElementById('vault-items');
const clearVaultBtn = document.getElementById('clear-vault');

const saveModal = document.getElementById('save-modal');
const saveInput = document.getElementById('save-name-input');
const confirmSaveBtn = document.getElementById('confirm-save');
const cancelSaveBtn = document.getElementById('cancel-save');

// Checks
const uppercaseCheck = document.getElementById('uppercase');
const symbolsCheck = document.getElementById('symbols');

// --- 1. LÓGICA DE INTERFAZ Y FUERZA ---

slider.addEventListener('input', () => {
    lengthVal.textContent = slider.value;
});

function updateStrength(password) {
    if (!password) {
        strengthBar.style.width = "0%";
        strengthText.textContent = "Fuerza: ---";
        return;
    }

    const result = zxcvbn(password);
    const score = result.score; 

    const levels = [
        { width: "20%", color: "var(--weak)", text: "Muy Débil" },
        { width: "40%", color: "var(--weak)", text: "Débil" },
        { width: "60%", color: "var(--medium)", text: "Media" },
        { width: "80%", color: "var(--strong)", text: "Fuerte" },
        { width: "100%", color: "var(--strong)", text: "Muy Fuerte" }
    ];

    const level = levels[score];
    strengthBar.style.width = level.width;
    strengthBar.style.backgroundColor = level.color;
    strengthText.textContent = `Fuerza: ${level.text}`;
}

// --- 2. GENERACIÓN Y COPIADO (MEJORADO PARA MÓVILES) ---

const handleGenerate = () => {
    const length = parseInt(slider.value);
    const options = {
        uppercase: uppercaseCheck.checked,
        symbols: symbolsCheck.checked,
        numbers: true 
    };

    const newPassword = generatePassword(length, options);
    passwordOutput.value = newPassword;
    updateStrength(newPassword);
};

// Función auxiliar para notificaciones tipo toast
function showToast(message, isError = false) {
    let toast = document.querySelector('.custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0,0,0,0.85)';
        toast.style.color = 'white';
        toast.style.padding = '8px 16px';
        toast.style.borderRadius = '40px';
        toast.style.fontSize = '0.85rem';
        toast.style.zIndex = '2000';
        toast.style.backdropFilter = 'blur(8px)';
        toast.style.pointerEvents = 'none';
        toast.style.transition = 'opacity 0.2s ease';
        toast.style.opacity = '0';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    if (isError) toast.style.backgroundColor = 'rgba(239,68,68,0.9)';
    else toast.style.backgroundColor = 'rgba(0,0,0,0.85)';
    
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 1800);
}

copyBtn.addEventListener('click', async () => {
    const password = passwordOutput.value;
    if (!password) return;

    // Intento con la API moderna (recomendada en HTTPS/contexto seguro)
    const copyModern = async () => {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(password);
                return true;
            } catch (err) {
                console.warn('Clipboard API falló:', err);
                return false;
            }
        }
        return false;
    };

    // Fallback clásico (funciona en móviles y navegadores sin permisos)
    const copyFallback = () => {
        const textarea = document.createElement('textarea');
        textarea.value = password;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, password.length);
        let success = false;
        try {
            success = document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy falló:', err);
        }
        document.body.removeChild(textarea);
        return success;
    };

    // Ejecutar copiado
    let copied = await copyModern();
    if (!copied) copied = copyFallback();

    // Feedback visual
    const originalIcon = copyBtn.innerHTML;
    if (copied) {
        copyBtn.innerHTML = '<span>✅</span>';
        showToast('¡Contraseña copiada!');
    } else {
        copyBtn.innerHTML = '<span>❌</span>';
        showToast('No se pudo copiar', true);
    }
    setTimeout(() => {
        copyBtn.innerHTML = originalIcon;
    }, 1500);
});

// --- 3. GESTIÓN DE LA BÓVEDA (MODAL) ---

function renderVault() {
    const vault = JSON.parse(localStorage.getItem('crypto_vault')) || [];
    vaultItems.innerHTML = '';

    vault.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'vault-item';
        div.innerHTML = `
            <div class="vault-info">
                <b>${escapeHtml(entry.name)}</b>
                <span>${entry.date}</span>
            </div>
            <div class="vault-actions-inline">
                <code>${entry.password.substring(0, 8)}...</code>
                <button class="delete-btn" data-id="${entry.id}">✕</button>
            </div>
        `;
        vaultItems.appendChild(div);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            deleteItem(id);
        };
    });
}

// Pequeña función para evitar XSS en nombres
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function deleteItem(id) {
    let vault = JSON.parse(localStorage.getItem('crypto_vault')) || [];
    vault = vault.filter(item => item.id !== id);
    localStorage.setItem('crypto_vault', JSON.stringify(vault));
    renderVault();
}

// Abrir Modal
saveBtn.addEventListener('click', () => {
    if (!passwordOutput.value) {
        showToast('Primero genera una contraseña', true);
        return;
    }
    saveModal.classList.add('active');
    saveInput.value = '';
    saveInput.focus();
});

// Cerrar Modal
cancelSaveBtn.addEventListener('click', () => {
    saveModal.classList.remove('active');
    saveInput.value = '';
});

// Confirmar Guardado
confirmSaveBtn.addEventListener('click', () => {
    const name = saveInput.value.trim();
    if (!name) {
        showToast('Escribe un nombre para guardar', true);
        return;
    }

    const newEntry = {
        id: Date.now(),
        name: name,
        password: passwordOutput.value,
        date: new Date().toLocaleDateString()
    };

    const vault = JSON.parse(localStorage.getItem('crypto_vault')) || [];
    vault.push(newEntry);
    localStorage.setItem('crypto_vault', JSON.stringify(vault));
    
    saveInput.value = '';
    saveModal.classList.remove('active');
    renderVault();
    showToast('Guardado en la bóveda');
});

// Limpiar toda la bóveda
clearVaultBtn.addEventListener('click', () => {
    if (confirm('¿Eliminar todas las contraseñas guardadas?')) {
        localStorage.removeItem('crypto_vault');
        renderVault();
        showToast('Bóveda vaciada');
    }
});

// --- 4. EXPORTAR A JSON ---
exportBtn.addEventListener('click', () => {
    const vault = localStorage.getItem('crypto_vault');
    if (!vault || vault === '[]') {
        showToast('No hay contraseñas para exportar', true);
        return;
    }

    const blob = new Blob([vault], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boveda_cryptogen_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exportado correctamente');
});

// --- INICIALIZACIÓN ---
generateBtn.addEventListener('click', handleGenerate);
document.addEventListener('DOMContentLoaded', () => {
    renderVault();
    // Generar una contraseña por defecto al cargar
    handleGenerate();
});