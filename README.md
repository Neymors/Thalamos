🔐 CryptoGen Vault
Tu Bóveda de Seguridad Local Definitiva
CryptoGen Vault es una aplicación web de ciberseguridad diseñada para generar contraseñas criptográficamente fuertes y almacenarlas de forma segura, todo bajo un modelo Zero-Knowledge. Esto significa que tus datos nunca viajan por internet: se quedan en tu dispositivo, bajo tu control.

✨ Características Principales
Generador Criptográfico: Utiliza la Web Crypto API para garantizar una entropía real, superando a los generadores aleatorios convencionales.

Almacenamiento Local Robusto: Implementación de IndexedDB para gestionar bases de datos en el navegador, permitiendo múltiples usuarios y persistencia de datos.

Análisis de Seguridad: Integración con la librería zxcvbn para evaluar la fortaleza de las claves en tiempo real.

Diseño Moderno: Interfaz Glassmorphism optimizada para una experiencia de usuario fluida y estética.

Mobile Ready: Soporte completo para dispositivos móviles con sistema de copiado inteligente (fallback para Android).

🛠️ Stack Tecnológico
Lenguajes: HTML5, CSS3 (Variables modernas & Flexbox/Grid), JavaScript (ES6+ Modules).

Seguridad: Web Crypto API.

Base de Datos: IndexedDB (vía db-manager.js).

Análisis de Fuerza: zxcvbn.

🚀 Cómo Empezar
No necesitas instalar nada ni configurar servidores complejos. Al ser una herramienta puramente Client-Side:

Clona el repositorio:

Bash
git clone https://github.com/Neymors/CryptoGen.git
Abre el archivo index.html en tu navegador preferido.

¡Listo! Crea tu cuenta maestra local y empieza a generar claves.

📂 Estructura del Proyecto
Plaintext
├── css/
│   └── style.css          # Estilos Glassmorphism y layouts
├── js/
│   ├── main.js            # Lógica principal y control de la UI
│   ├── crypto-core.js     # Motor de generación y entropía
│   ├── auth-service.js    # Manejo de sesiones y registro
│   └── db-manager.js      # Orquestador de IndexedDB
└── index.html             # Estructura SPA (Single Page Application)
🔒 Privacidad y Seguridad
[!IMPORTANT]
CryptoGen Vault no utiliza servidores externos.

No hay API de terceros.

No hay envío de telemetría.

Tus contraseñas mueren con tu caché. > Se recomienda realizar exportaciones periódicas de tus credenciales si planeas limpiar los datos de tu navegador.

🤝 Contribuciones
¿Tienes una idea para mejorar la seguridad o el diseño? ¡Las sugerencias son bienvenidas!

Haz un Fork del proyecto.

Crea una rama para tu mejora (git checkout -b feature/mejora).

Envía un Pull Request.

Desarrollado con ❤️ para la comunidad de Ciberseguridad.

🚀 Próxima Actualización (v2.1) — Coming Soon 🏗️
Estamos trabajando en mejorar la portabilidad de tus datos. Muy pronto podrás:

Gestión Manual de Credenciales: Añade tus contraseñas antiguas directamente a la bóveda de forma manual.

Backup en JSON: Exporta toda tu base de datos local en un archivo .json cifrado.

Importación Inteligente: ¿Cambiaste de navegador o dispositivo? Importa tu archivo JSON y recupera todas tus credenciales al instante.

Esta función permitirá que, aunque limpies la caché de tu navegador, siempre tengas un respaldo físico de tu seguridad.
