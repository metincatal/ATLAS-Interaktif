/**
 * Kullanıcı Etkileşimleri - ATLAS İnteraktif
 * Globe etkileşim yönetimi
 */

import { state, setState } from './state.js';

/**
 * Kullanıcı etkileşim dinleyicilerini ayarlar
 */
export function setupInteractionListeners() {
    const container = document.getElementById('globe-container');
    const blurOverlay = document.getElementById('blur-overlay');
    
    // Fare veya dokunmatik etkileşim başladığında (sadece manual kontrol)
    const stopAutoRotate = (e) => {
        // Eğer blur overlay aktifse (panel/chat açık), etkileşimi engelle
        if (blurOverlay.classList.contains('active')) {
            e.stopPropagation();
            return;
        }
        
        if (state.autoRotate && state.globe) {
            state.globe.controls().autoRotate = false;
            setState('autoRotate', false);
            console.log('Otomatik dönüş durduruldu - kullanıcı kontrolü aktif');
        }
    };
    
    // Fare tıklaması (sadece globe kontrolü için)
    container.addEventListener('mousedown', stopAutoRotate, true);
    
    // Dokunmatik ekran
    container.addEventListener('touchstart', stopAutoRotate, true);
    
    // Fare tekerleği (zoom)
    container.addEventListener('wheel', stopAutoRotate, true);
}

/**
 * Otomatik dönüşü tekrar aktif eder
 */
export function resumeAutoRotate(delay = 0) {
    setTimeout(() => {
        if (!state.autoRotate && state.globe) {
            state.globe.controls().autoRotate = true;
            setState('autoRotate', true);
            console.log('Otomatik dönüş yeniden aktif edildi');
        }
    }, delay);
}

