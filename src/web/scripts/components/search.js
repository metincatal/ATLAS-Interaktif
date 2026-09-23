/**
 * Ülke arama paleti (⌘K / Ctrl+K)
 */

import { icon } from '../core/icons.js';
import { esc } from '../core/dom.js';
import { db, loadCore, searchCountries, countryName, corridorAt, flagHTML, corridorRange } from '../core/data.js';
import { typeChip } from '../core/theory.js';

let open = null;
let pageHandler = null;

/** Sayfalar genel arama sonucunu kendileri işlemek isterse bu kancayı kullanır */
export function setSearchHandler(fn) {
    pageHandler = fn;
}

export function getSearchHandler() {
    return pageHandler;
}

export async function openSearch({ onPick, placeholder = 'Ülke ya da tarihî ad ara…', filter = null, title = 'Ülke ara' } = {}) {
    if (open) return;
    await loadCore();
    const returnFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <div class="palette" role="dialog" aria-modal="true" aria-label="${esc(title)}">
            <div class="palette-input">${icon('search')}
                <input type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">
                <kbd>Esc</kbd>
            </div>
            <ul class="palette-list" id="palette-list" role="listbox"></ul>
            <div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> gezin</span><span><kbd>↵</kbd> seç</span><span class="grow"></span><span>${Object.values(db.countries).filter((c) => c.corridor).length} ülke</span></div>
        </div>`;
    document.body.append(overlay);
    const input = overlay.querySelector('input');
    const list = overlay.querySelector('.palette-list');
    let items = [];
    let active = 0;

    const render = () => {
        items = searchCountries(input.value, { limit: 40, filter });
        active = Math.min(active, Math.max(0, items.length - 1));
        if (!items.length) {
            list.innerHTML = `<li class="palette-empty">“${esc(input.value)}” için sonuç yok. Türkçe ya da İngilizce ad deneyin.</li>`;
            input.removeAttribute('aria-activedescendant');
            return;
        }
        list.innerHTML = items
            .map((id, i) => {
                const c = db.countries[id];
                const range = corridorRange(id);
                const last = range ? corridorAt(id, range[1]) : null;
                const sub = [c.en !== c.tr ? c.en : null, range ? `${range[0]}–${range[1]}` : 'koridor verisi yok'].filter(Boolean).join(' · ');
                return `<li class="palette-item" role="option" id="opt-${id}" data-id="${id}" aria-selected="${i === active}">
                    ${flagHTML(id)}
                    <span class="grow"><span>${esc(countryName(id))}</span><br><span class="sub">${esc(sub)}</span></span>
                    ${last ? typeChip(last.type, { small: true, label: `${last.year}` }) : ''}
                </li>`;
            })
            .join('');
        input.setAttribute('aria-activedescendant', `opt-${items[active]}`);
    };

    const setActive = (i) => {
        active = (i + items.length) % items.length;
        list.querySelectorAll('.palette-item').forEach((el, j) => el.setAttribute('aria-selected', String(j === active)));
        const el = list.children[active];
        el?.scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', `opt-${items[active]}`);
    };

    const close = () => {
        overlay.remove();
        document.removeEventListener('keydown', onKey, true);
        open = null;
        returnFocus?.focus?.();
    };

    const pick = (id) => {
        close();
        onPick?.(id);
    };

    const onKey = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(active + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(active - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (items[active]) pick(items[active]);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            input.focus();
        }
    };

    input.addEventListener('input', () => {
        active = 0;
        render();
    });
    list.addEventListener('click', (e) => {
        const li = e.target.closest('.palette-item');
        if (li) pick(li.dataset.id);
    });
    list.addEventListener('mousemove', (e) => {
        const li = e.target.closest('.palette-item');
        if (!li) return;
        const i = items.indexOf(li.dataset.id);
        if (i !== -1 && i !== active) setActive(i);
    });
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close();
    });
    document.addEventListener('keydown', onKey, true);
    open = { close };
    render();
    input.focus();
}

export function closeSearch() {
    open?.close();
}
