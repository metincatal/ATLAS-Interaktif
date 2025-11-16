/**
 * Sayfa Navigasyonu - ATLAS İnteraktif
 * Teori ve Ana sayfa arasında geçiş
 */

import { state, setState } from './state.js';
import { initializeGlobe, loadCountriesData } from './globe.js';
import { GEOJSON_URL } from '../config/constants.js';
import { setupGlobeEventHandlers } from './globe-handlers.js';

/**
 * Sayfa navigasyon sistemini kurar
 */
export function setupNavigation() {
    const theoryPage = document.getElementById('theory-page');
    const mainPage = document.getElementById('main-page');
    const goToMainButton = document.getElementById('go-to-main');
    const theoryButton = document.getElementById('theory-button');
    
    // Elementlerin varlığını kontrol et
    if (!theoryPage || !mainPage || !goToMainButton || !theoryButton) {
        console.error('❌ Navigasyon elementleri bulunamadı:', {
            theoryPage: !!theoryPage,
            mainPage: !!mainPage,
            goToMainButton: !!goToMainButton,
            theoryButton: !!theoryButton
        });
        return;
    }
    
    // Ana sayfaya geç butonu
    goToMainButton.addEventListener('click', async () => {
        // Teori sayfasını gizle
        theoryPage.classList.remove('active');
        
        // Ana sayfayı göster
        mainPage.classList.add('active');
        
        // Globe henüz başlatılmamışsa başlat
        if (!state.globeInitialized) {
            setTimeout(async () => {
                initializeGlobe();
                const countriesData = await loadCountriesData(GEOJSON_URL);
                setupGlobeEventHandlers();
                setState('globeInitialized', true);
            }, 300);
        }
        
        console.log('Ana sayfaya geçildi');
    });
    
    // Teoriler butonuna dön
    theoryButton.addEventListener('click', () => {
        // Ana sayfayı gizle
        mainPage.classList.remove('active');
        
        // Teori sayfasını göster
        theoryPage.classList.add('active');
        
        console.log('Teori sayfasına geçildi');
    });
    
    console.log('✓ Sayfa navigasyonu hazır');
}

