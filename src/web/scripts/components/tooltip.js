/**
 * Tek, paylaşılan yüzen ipucu
 */

let el = null;
let visible = false;

function ensure() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'tip';
    el.setAttribute('role', 'tooltip');
    document.body.append(el);
    return el;
}

export function showTip(html, x, y) {
    const tip = ensure();
    tip.innerHTML = html;
    visible = true;
    tip.classList.add('show');
    moveTip(x, y);
}

export function moveTip(x, y) {
    if (!el || !visible) return;
    const pad = 12;
    const rect = el.getBoundingClientRect();
    let left = x + 14;
    let top = y + 14;
    if (left + rect.width + pad > window.innerWidth) left = x - rect.width - 14;
    if (top + rect.height + pad > window.innerHeight) top = y - rect.height - 14;
    el.style.left = `${Math.max(pad, left)}px`;
    el.style.top = `${Math.max(pad, top)}px`;
}

export function hideTip() {
    if (!el) return;
    visible = false;
    el.classList.remove('show');
}
