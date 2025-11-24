/**
 * Sayfa Navigasyonu - ATLAS İnteraktif
 * Teori ve Ana sayfa arasında geçiş
 */

import { state, setState } from './state.js';
import { initializeGlobe, loadCountriesData } from './globe.js';
import { GEOJSON_URL } from '../config/constants.js';
import { setupGlobeEventHandlers } from './globe-handlers.js';
import {
    loadHistoricalMapsData,
    preloadAllHistoricalMaps,
    renderTimelineMilestones,
    setupHistoricalEventListeners,
    getMilestoneForYear,
    loadHistoricalMap,
    loadCapitalPointsToGlobe
} from '../modules/historical/historical-maps.js';

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
                // Globe'u başlat ve güncel haritayı yükle
                initializeGlobe();
                const countriesData = await loadCountriesData(GEOJSON_URL);
                setupGlobeEventHandlers();
                setState('globeInitialized', true);

                // Historical Maps index'i yükle (arka planda)
                console.log('🗺️ Historical Maps index yükleniyor...');
                await loadHistoricalMapsData();

                // Preload başlat (arka planda, progress bar ile)
                console.log('🚀 Historical Maps preload başlatılıyor...');
                startHistoricalMapsPreload();
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

/**
 * Historical Maps preload işlemini başlatır ve progress bar'ı yönetir
 */
function startHistoricalMapsPreload() {
    const progressContainer = document.getElementById('historical-preload-progress');
    const progressBar = document.getElementById('preload-bar');
    const progressStatus = document.getElementById('preload-status');
    const sliderContainer = document.getElementById('historical-year-slider-container');

    if (!progressContainer || !progressBar || !progressStatus) {
        console.error('❌ Progress bar elementleri bulunamadı');
        return;
    }

    // Progress bar'ı göster
    progressContainer.style.display = 'block';

    // Progress callback
    const updateProgress = (loaded, total) => {
        const percentage = (loaded / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressStatus.textContent = `${loaded} / ${total} harita yüklendi`;
    };

    // Preload başlat
    preloadAllHistoricalMaps(updateProgress)
        .then((success) => {
            console.log('✅ Historical Maps preload tamamlandı:', success);

            // Progress bar'ı gizle
            setTimeout(() => {
                progressContainer.style.transition = 'opacity 0.5s ease';
                progressContainer.style.opacity = '0';

                setTimeout(() => {
                    progressContainer.style.display = 'none';

                    // Slider'ı göster ve aktif et
                    if (sliderContainer) {
                        sliderContainer.style.display = 'flex';
                        renderTimelineMilestones();
                        setupHistoricalEventListeners();

                        // İlk haritayı yükle (2023 - en güncel yıl)
                        const initialYear = 2023;
                        const milestone = getMilestoneForYear(initialYear);
                        if (milestone) {
                            loadHistoricalMap(milestone, initialYear);
                        }

                        console.log('✓ Historical slider aktif - 2023 yılı yüklendi');
                    }
                }, 500);
            }, 1000); // 1 saniye bekle

        })
        .catch((error) => {
            console.error('❌ Preload hatası:', error);
            progressStatus.textContent = 'Yükleme hatası oluştu';
        });
}

