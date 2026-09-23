/**
 * Panoya kopyalama (paylaşım metinleri ve bağlantılar için)
 */

import { toast } from './toast.js';

export async function copyText(text, message = 'Panoya kopyalandı.') {
    try {
        await navigator.clipboard.writeText(text);
        toast(message);
        return true;
    } catch {
        // Güvenli olmayan bağlamlarda (ör. http) eski yöntem
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch {
            ok = false;
        }
        area.remove();
        toast(ok ? message : 'Kopyalanamadı; metni elle seçip kopyalayın.', { type: ok ? 'info' : 'error' });
        return ok;
    }
}

/** Uygulamanın bu adresteki kökü (yerelde /src/web/, yayında site kökü) */
export function appURL(hash) {
    return `${location.origin}${location.pathname}${hash}`;
}
