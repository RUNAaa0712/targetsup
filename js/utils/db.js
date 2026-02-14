export const DB_NAME = "ChuniDB";
export const DB_VERSION = 2;

export function initDB() {
    return new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("songs")) db.createObjectStore("songs", { keyPath: "id" });
            if (!db.objectStoreNames.contains("achievements")) db.createObjectStore("achievements", { keyPath: "id" });
            if (!db.objectStoreNames.contains("master_songs")) db.createObjectStore("master_songs", { keyPath: "id" });
        };
        req.onsuccess = (e) => {
            resolve(e.target.result);
        };
        req.onerror = () => {
            console.error("Database failed to open");
            resolve(null);
        };
    });
}
