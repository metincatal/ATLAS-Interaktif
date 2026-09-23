/**
 * Hash tabanlı yönlendirici (GitHub Pages ile uyumlu).
 * Sayfa modülleri: export async function mount(root, params) -> { unmount(), update?(params) }
 */

import { emit, setContext } from './store.js';
import { icon } from './icons.js';

const ROUTES = {
    '/': { load: () => import('../pages/home.js'), title: null, nav: 'home' },
    '/kuram': { load: () => import('../pages/theory.js'), title: 'Kuram', nav: 'kuram' },
    '/atlas': { load: () => import('../pages/atlas.js'), title: 'Atlas', nav: 'atlas' },
    '/koridor': { load: () => import('../pages/corridor.js'), title: 'Dar Koridor Gözlemevi', nav: 'koridor' },
    '/oyun': { load: () => import('../pages/game/setup.js'), title: 'Özgürlük Dengesi', nav: 'oyun' },
    '/oyun/oyna': { load: () => import('../pages/game/play.js'), title: 'Özgürlük Dengesi', nav: 'oyun' },
};

let root = null;
let current = null; // { path, instance }
let mountingPath = null; // sayfa açılırken de adres güncellenebilsin
let token = 0;

export function parseHash(hash = location.hash) {
    const raw = hash.replace(/^#/, '') || '/';
    const [pathPart, query = ''] = raw.split('?');
    const path = pathPart.replace(/\/+$/, '') || '/';
    return { path, params: Object.fromEntries(new URLSearchParams(query)) };
}

export function buildHash(path, params = {}) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== null && v !== undefined && v !== '') q.set(k, v);
    }
    const qs = q.toString();
    return `#${path}${qs ? '?' + qs : ''}`;
}

export function navigate(path, params = {}) {
    const next = buildHash(path, params);
    if (location.hash === next) handle();
    else location.hash = next;
}

/** Sayfayı yeniden yüklemeden adres çubuğundaki parametreleri günceller */
export function replaceParams(params) {
    const path = current?.path ?? mountingPath;
    if (!path) return;
    history.replaceState(history.state, '', buildHash(path, params));
    setContext({ params });
}

export function href(path, params = {}) {
    return buildHash(path, params);
}

async function handle() {
    const { path, params } = parseHash();
    const route = ROUTES[path];
    if (!route) {
        navigate('/');
        return;
    }

    // Aynı sayfada yalnızca parametre değiştiyse sayfanın kendisi güncellesin
    if (current && current.path === path && typeof current.instance?.update === 'function') {
        current.instance.update(params);
        setContext({ route: path, params });
        return;
    }

    const my = ++token;
    if (current?.instance?.unmount) {
        try {
            current.instance.unmount();
        } catch (error) {
            console.error('Sayfa kapatılırken hata:', error);
        }
    }
    current = null;
    mountingPath = path;
    root.innerHTML = `<div class="loading-block" role="status"><div class="spinner"></div>Yükleniyor…</div>`;
    document.title = route.title ? `${route.title} · ATLAS İnteraktif` : 'ATLAS İnteraktif — Dar Koridor Atlası';
    highlightNav(route.nav);
    window.scrollTo(0, 0);
    setContext({ route: path, params, country: null, year: null, note: '' });
    emit('route', { path, params });

    try {
        const mod = await route.load();
        if (my !== token) return;
        root.innerHTML = '';
        const view = document.createElement('div');
        view.className = 'page';
        root.append(view);
        const instance = await mod.mount(view, params);
        if (my !== token) {
            instance?.unmount?.();
            return;
        }
        current = { path, instance };
        mountingPath = null;
        root.focus({ preventScroll: true });
    } catch (error) {
        console.error(error);
        if (my !== token) return;
        root.innerHTML = `
            <div class="container" style="padding-top: 80px; max-width: 640px;">
                <div class="card card-pad stack" role="alert">
                    <div class="row">${icon('warning')}<strong>Bu sayfa yüklenemedi</strong></div>
                    <p class="muted small">${String(error.message || error)}</p>
                    <p class="muted small">Sayfayı bir yerel sunucu üzerinden açtığınızdan emin olun (ör. <code>npm start</code>). Doğrudan dosya olarak açıldığında tarayıcılar veri dosyalarını engeller.</p>
                    <div><button class="btn btn-secondary btn-sm" type="button" data-retry>${icon('rotate')}Yeniden dene</button></div>
                </div>
            </div>`;
        root.querySelector('[data-retry]')?.addEventListener('click', () => handle());
    }
}

function highlightNav(key) {
    document.querySelectorAll('[data-nav]').forEach((a) => {
        if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
    });
}

export function startRouter(el) {
    root = el;
    window.addEventListener('hashchange', handle);
    handle();
}

export function currentPath() {
    return current?.path ?? parseHash().path;
}
