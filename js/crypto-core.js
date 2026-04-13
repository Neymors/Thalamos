/**
 * Genera una contraseña segura utilizando la Web Crypto API.
 * @param {number} length - Longitud de la contraseña.
 * @param {object} options - Opciones (uppercase, numbers, symbols).
 */

export function generatePassword(length, options) {
    const charset = {
        lower: "abcdefghijklmnopqrstuvwxyz",
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        numbers: "0123456789",
        symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-="
    };

    let characters = charset.lower;
    if (options.uppercase) characters += charset.upper;
    if (options.numbers) characters += charset.numbers;
    if (options.symbols) characters += charset.symbols;

    let password = "";

    // Creamos un array de 32 bit para almaenar los valores alegartorios
    const typedArray = new Uint32Array(length);

    //La Web API llena el array con entropia real del sistema
    window.crypto.getRandomValues(typedArray);

    for (let i = 0; i < length; i++) {
        //El operador residuo para elegir un caracter del charset
        password += characters [typedArray[i] % characters.length];
    }
    return password;
}