/**
 * ATLAS İnteraktif — giriş noktası
 */

import { startRouter, navigate, parseHash } from './core/router.js';
import { icon, logoMark } from './core/icons.js';
import { loadCore } from './core/data.js';
import { openSearch, getSearchHandler } from './components/search.js';
import { initAssistant } from './components/assistant.js';
import { toast } from './components/toast.js';

const NAV = [
    { key: 'kuram', label: 'Kuram', icon: 'book', path: '/kuram' },
    { key: 'atlas', label: 'Atlas', icon: 'globe', path: '/atlas' },
    { key: 'koridor', label: 'Koridor', icon: 'corridor', path: '/koridor' },
    { key: 'oyun', label: 'Oyun', icon: 'scale', path: '/oyun' },
];

function renderShell() {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    document.querySelector('.topnav').innerHTML = `
        <a class="brand" href="#/" aria-label="ATLAS İnteraktif ana sayfa">${logoMark(28)}<span class="brand-word">ATLAS</span><span class="brand-sub">İnteraktif</span></a>
        <nav class="mainnav" aria-label="Ana gezinme">
            ${NAV.map((n) => `<a href="#${n.path}" data-nav="${n.key}">${icon(n.icon)}${n.label}</a>`).join('')}
        </nav>
        <div class="nav-actions">
            <button type="button" class="search-trigger" data-search-trigger aria-label="Ülke ara">${icon('search', 'icon-sm')}<span class="label-text">Ülke ara</span><kbd>${isMac ? '⌘' : 'Ctrl'} K</kbd></button>
            <button type="button" class="icon-btn" data-assistant-trigger aria-label="Asistanı aç" aria-expanded="false">${icon('chat')}</button>
        </div>`;
    document.querySelector('.tabbar').innerHTML = [{ key: 'home', label: 'Giriş', icon: 'home', path: '/' }, ...NAV]
        .map((n) => `<a href="#${n.path}" data-nav="${n.key}">${icon(n.icon)}<span>${n.label}</span></a>`)
        .join('');
}

function runSearch() {
    openSearch({
        onPick: (id) => {
            const handler = getSearchHandler();
            if (handler) handler(id);
            else {
                const { params } = parseHash();
                navigate('/atlas', { c: id, y: params.y, l: params.l });
            }
        },
    });
}

function bindShortcuts() {
    document.querySelector('[data-search-trigger]').addEventListener('click', runSearch);
    document.addEventListener('keydown', (e) => {
        const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            runSearch();
        } else if (e.key === '/' && !typing) {
            e.preventDefault();
            runSearch();
        }
    });
}

function boot() {
    renderShell();
    bindShortcuts();
    initAssistant(document.querySelector('[data-assistant-trigger]'));

    if (!window.d3) {
        toast('Grafik kütüphanesi (D3) yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.', { type: 'error', timeout: 10000 });
    }
    loadCore().catch((error) => {
        console.error(error);
        toast(`Veriler yüklenemedi: ${error.message}`, { type: 'error', timeout: 10000 });
    });
    startRouter(document.getElementById('app'));
}

boot();
