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

        // Eğer küre kullanıcı tarafından pause edilmişse, etkileşim dönüşü durdurmaz
        if (state.globePaused) {
            return;
        }

        if (state.autoRotate && state.globe) {
            state.globe.controls().autoRotate = false;
            setState('autoRotate', false);
            console.log('Otomatik dönüş durduruldu - kullanıcı kontrolü aktif');

            // 5-6 saniye sonra otomatik dönüşü tekrar aktif et
            resumeAutoRotate(6000); // 6 saniye
        }
    };

    // Fare tıklaması (sadece globe kontrolü için)
    container.addEventListener('mousedown', stopAutoRotate, true);

    // Dokunmatik ekran
    container.addEventListener('touchstart', stopAutoRotate, true);

    // Fare tekerleği (zoom)
    container.addEventListener('wheel', stopAutoRotate, true);

    // Globe pause butonu
    setupGlobePauseButton();
}

/**
 * Globe pause butonunu kurar
 */
function setupGlobePauseButton() {
    const pauseBtn = document.getElementById('globe-pause-btn');
    if (!pauseBtn) return;

    pauseBtn.addEventListener('click', () => {
        const pauseIcon = pauseBtn.querySelector('.pause-icon');
        const playIcon = pauseBtn.querySelector('.play-icon');

        if (state.globePaused) {
            // Resume
            setState('globePaused', false);
            pauseBtn.classList.remove('active');
            pauseIcon.style.display = 'inline';
            playIcon.style.display = 'none';

            if (state.globe) {
                state.globe.controls().autoRotate = true;
                setState('autoRotate', true);
            }
            console.log('Küre dönüşü devam ediyor');
        } else {
            // Pause
            setState('globePaused', true);
            pauseBtn.classList.add('active');
            pauseIcon.style.display = 'none';
            playIcon.style.display = 'inline';

            if (state.globe) {
                state.globe.controls().autoRotate = false;
                setState('autoRotate', false);
            }
            console.log('Küre durduruldu');
        }
    });
}

/**
 * Otomatik dönüşü tekrar aktif eder
 */
export function resumeAutoRotate(delay = 0) {
    setTimeout(() => {
        // Eğer küre pause edilmişse, otomatik dönüşü aktif etme
        if (state.globePaused) {
            return;
        }

        if (!state.autoRotate && state.globe) {
            state.globe.controls().autoRotate = true;
            setState('autoRotate', true);
            console.log('Otomatik dönüş yeniden aktif edildi');
        }
    }, delay);
}

