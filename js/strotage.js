const DB_KEY = 'crypto_vault';

export const storage = {
    save(entry) {
        const vault = this.get();
        vault.push(entry);
        localStorage.setItem(DB_KEY, JSON.stringify(vault));
    },
    get() {
        return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    },
    delete(id) {
        const vault = this.get().filter(item => item.id !== id);
        localStorage.setItem(DB_KEY, JSON.stringify(vault));
    },
    clear() {
        localStorage.removeItem(DB_KEY);
    },
    export() {
        const data = localStorage.getItem(DB_KEY);
        if (!data || data === '[]') return;

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boveda_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};