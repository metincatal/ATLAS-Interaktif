/**
 * Küçük DOM yardımcıları
 */

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Metni HTML içine güvenle yerleştirmek için kaçışlar */
export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/**
 * Element oluşturur.
 * h('button', { class: 'btn', onClick: fn, 'aria-label': 'Kapat' }, 'Metin', childEl)
 */
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
        if (value === null || value === undefined || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
        else if (key === 'html') el.innerHTML = value;
        else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (value === true) el.setAttribute(key, '');
        else el.setAttribute(key, value);
    }
    for (const child of children.flat()) {
        if (child === null || child === undefined || child === false) continue;
        el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
}

/** HTML dizgesinden tek bir element üretir */
export function fromHTML(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstElementChild;
}

/** Bir işlevin çağrılarını geciktirir */
export function debounce(fn, wait = 150) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

/** requestAnimationFrame ile kısıtlanmış çağrı */
export function rafThrottle(fn) {
    let queued = false;
    let lastArgs = null;
    return (...args) => {
        lastArgs = args;
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            fn(...lastArgs);
        });
    };
}

export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const isMobile = () => window.matchMedia?.('(max-width: 760px)').matches;

/** Bir kök elemana bağlı tüm dinleyicileri tek seferde kaldırmak için */
export class Disposer {
    constructor() {
        this.fns = [];
    }
    add(fn) {
        this.fns.push(fn);
        return fn;
    }
    on(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this.fns.push(() => target.removeEventListener(type, handler, options));
    }
    dispose() {
        while (this.fns.length) {
            try {
                this.fns.pop()();
            } catch (error) {
                console.warn('Temizlik hatası:', error);
            }
        }
    }
}
