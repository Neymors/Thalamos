export function getStrength(password) {
    if (!password) return { width: "0%", color: "transparent", text: "---" };

    const result = zxcvbn(password);
    const score = result.score; 

    const levels = [
        { width: "20%", color: "var(--weak)", text: "Muy Débil" },
        { width: "40%", color: "var(--weak)", text: "Débil" },
        { width: "60%", color: "var(--medium)", text: "Media" },
        { width: "80%", color: "var(--strong)", text: "Fuerte" },
        { width: "100%", color: "var(--strong)", text: "Muy Fuerte" }
    ];

    return levels[score];
}