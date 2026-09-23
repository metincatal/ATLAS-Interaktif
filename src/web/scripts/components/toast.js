/**
 * Kısa bildirimler (alert() yerine)
 */

import { icon } from '../core/icons.js';
import { esc } from '../core/dom.js';

let host = null;

export function toast(message, { type = 'info', timeout = 4200 } = {}) {
    if (!host) {
        host = document.createElement('div');
        host.className = 'toasts';
        host.setAttribute('role', 'status');
        host.setAttribute('aria-live', 'polite');
        document.body.append(host);
    }
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.innerHTML = `${icon(type === 'error' ? 'warning' : 'info')}<span>${esc(message)}</span>`;
    host.append(item);
    setTimeout(() => {
        item.style.transition = 'opacity 240ms ease';
        item.style.opacity = '0';
        setTimeout(() => item.remove(), 260);
    }, timeout);
}
