/**
 * Olay veriyolu ve tarayıcıda saklanan küçük tercihler
 */

const listeners = new Map();

export function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
}

export function emit(event, detail) {
    listeners.get(event)?.forEach((handler) => {
        try {
            handler(detail);
        } catch (error) {
            console.error(`"${event}" dinleyicisinde hata:`, error);
        }
    });
}

const PREFIX = 'atlas.';

/** localStorage erişimi gizli pencerede ya da engellendiğinde hata verebilir */
export function load(key, fallback = null) {
    try {
        const raw = window.localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function save(key, value) {
    try {
        if (value === null || value === undefined) window.localStorage.removeItem(PREFIX + key);
        else window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

/** Uygulama genelinde paylaşılan bağlam (asistanın "şu an ne görüyorum" bilgisi) */
export const context = {
    route: '/',
    country: null,
    year: null,
    note: '',
};

export function setContext(patch) {
    Object.assign(context, patch);
    emit('context', context);
}
