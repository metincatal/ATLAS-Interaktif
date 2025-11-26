/**
 * Panel Yöneticisi - ATLAS İnteraktif
 * Sağ panel açma/kapama ve yönetim
 */

import { state, setState } from '../../core/state.js';
import { getFlagUrl } from '../../config/api-config.js';
import { getCountryAnalysesText } from './country-analyses.js';
import { getAvailableYearsForCountry, getLatestYearForCountry } from '../../utils/data-helpers.js';
import { updateCountryCorridorPosition, setupCorridorYearSlider } from '../corridor/corridor-graph.js';
import { getCountryISOCode } from '../../utils/country-codes.js';
import { setupToggleInteractiveMap } from '../corridor/corridor-interactive.js';

/**
 * Panel ve Chat sistemini kurar
 */
export function setupPanelAndChat() {
    const panel = document.getElementById('country-panel');
    const closePanel = document.getElementById('close-panel');
    const blurOverlay = document.getElementById('blur-overlay');
    
    // Panel kapatma fonksiyonu
    const closePanelFunc = () => {
        panel.classList.remove('active');
        setState('currentCountryName', null);
        
        // Chat açık değilse blur'u kaldır
        const chatArea = document.getElementById('chat-area');
        if (!chatArea.classList.contains('active')) {
            blurOverlay.classList.remove('active');
        }
        
        // Ülke renklerini normal haline döndür
        if (state.globe && !state.wgiEnabled) {
            state.globe.polygonCapColor(() => state.currentCountryColor);
        }
    };
    
    // Panel kapatma butonu
    closePanel.addEventListener('click', closePanelFunc);
    
    // Blur overlay'e tıklandığında panel kapat
    blurOverlay.addEventListener('click', (e) => {
        if (panel.classList.contains('active')) {
            closePanelFunc();
        }
    });
    
    // Panel içine tıklandığında blur overlay'in click eventi tetiklenmemeli
    panel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Corridor mode butonları için event listener ekle
    setupCorridorModeButtons();

    console.log('✓ Panel yöneticisi hazır');
}

/**
 * Corridor mode butonlarını kurar (Modern vs Tam Tarih)
 */
function setupCorridorModeButtons() {
    const modernBtn = document.getElementById('corridor-mode-modern');
    const historicalBtn = document.getElementById('corridor-mode-historical');

    if (!modernBtn || !historicalBtn) {
        console.warn('⚠️ Corridor mode butonları bulunamadı');
        return;
    }

    modernBtn.addEventListener('click', () => switchCorridorMode('modern'));
    historicalBtn.addEventListener('click', () => switchCorridorMode('historical'));
}

/**
 * Corridor mode'u değiştirir
 */
function switchCorridorMode(mode) {
    const countryName = state.currentCountryName;
    if (!countryName) return;

    // Mode'u güncelle
    setState('corridorMode', mode);

    // Buton stillerini güncelle
    const modernBtn = document.getElementById('corridor-mode-modern');
    const historicalBtn = document.getElementById('corridor-mode-historical');

    if (mode === 'modern') {
        modernBtn.classList.add('active');
        historicalBtn.classList.remove('active');
    } else {
        modernBtn.classList.remove('active');
        historicalBtn.classList.add('active');
    }

    // Yıl aralığını güncelle
    let availableYears = getAvailableYearsForCountry(countryName, mode);

    if (availableYears.length === 0) {
        console.warn(`${countryName} için ${mode} modunda veri yok`);
        return;
    }

    // Historical mode için: Sadece 1995 ve öncesi yılları kullan
    if (mode === 'historical') {
        // 1995 ve öncesi yılları filtrele
        availableYears = availableYears.filter(year => year <= 1995);

        if (availableYears.length === 0) {
            console.warn(`${countryName} için 1995 ve öncesi veri yok`);
            return;
        }

        // Dinamik yıl aralığını güncelle
        const firstYear = availableYears[0];
        const lastYear = availableYears[availableYears.length - 1];
        const yearRangeSpan = document.getElementById('historical-year-range');
        if (yearRangeSpan) {
            yearRangeSpan.textContent = `(${firstYear}-${lastYear})`;
        }
    }

    // Hangi yılı göstereceğimizi belirle
    let targetYear;
    if (mode === 'historical') {
        // Tam Tarih modunda: 1995 yılından başla (eğer varsa)
        // availableYears zaten sıralı ve 1995 ve öncesi filtrelenmiş
        const year1995Index = availableYears.indexOf(1995);
        if (year1995Index !== -1) {
            targetYear = 1995;
        } else {
            // 1995 yoksa en son yıl
            targetYear = availableYears[availableYears.length - 1];
        }
    } else {
        // Modern modunda: En son yıl
        targetYear = availableYears[availableYears.length - 1];
    }

    // Slider ve grafik güncelle
    setupCorridorYearSlider(countryName, availableYears, targetYear);
    updateCountryCorridorPosition(countryName, targetYear);

    // Eğer interactive map aktifse, tüm ülkeleri de güncelle
    if (state.interactiveMapActive) {
        import('../corridor/corridor-data.js').then(({ updateDarKoridorDataForYear }) => {
            updateDarKoridorDataForYear(targetYear, mode);

            // Yeni verileri yükledikten sonra grafikteki tüm ülkeleri yeniden çiz
            setTimeout(() => {
                import('../corridor/corridor-interactive.js').then(({ refreshAllCountryDots }) => {
                    if (refreshAllCountryDots) {
                        refreshAllCountryDots();
                    }
                });
            }, 100);
        });
    }

    console.log(`✓ Corridor mode değiştirildi: ${mode}, hedef yıl: ${targetYear}, yıl aralığı: ${availableYears[0]}-${availableYears[availableYears.length-1]}`);
}

/**
 * Ülke panelini açar ve içeriği doldurur
 */
export function openCountryPanel(countryName, countryCodeFromGeoJSON) {
    const panel = document.getElementById('country-panel');
    const flagImg = document.getElementById('country-flag');
    const panelCountryName = document.getElementById('panel-country-name');
    const nationsFailText = document.getElementById('nations-fail-text');
    const corridorText = document.getElementById('corridor-text');
    
    // Mevcut ülkeyi kaydet
    setState('currentCountryName', countryName);

    // Mode'u modern olarak sıfırla
    setState('corridorMode', 'modern');
    const modernBtn = document.getElementById('corridor-mode-modern');
    const historicalBtn = document.getElementById('corridor-mode-historical');
    if (modernBtn && historicalBtn) {
        modernBtn.classList.add('active');
        historicalBtn.classList.remove('active');
    }

    // Historical mode için dinamik yıl aralığını ayarla
    let historicalYears = getAvailableYearsForCountry(countryName, 'historical');
    if (historicalYears.length > 0) {
        // Sadece 1995 ve öncesi yılları filtrele
        historicalYears = historicalYears.filter(year => year <= 1995);

        if (historicalYears.length > 0) {
            const firstYear = historicalYears[0];
            const lastYear = historicalYears[historicalYears.length - 1];
            const yearRangeSpan = document.getElementById('historical-year-range');
            if (yearRangeSpan) {
                yearRangeSpan.textContent = `(${firstYear}-${lastYear})`;
            }
        }
    }

    // Ülkenin mevcut yıllarını al (modern mode)
    const availableYears = getAvailableYearsForCountry(countryName);
    setState('currentCountryAvailableYears', availableYears);
    const hasCorridorData = availableYears.length > 0;
    toggleCorridorSection(hasCorridorData);
    
    // ISO kodunu düzgün al
    const countryCode = getCountryISOCode(countryName, countryCodeFromGeoJSON);
    
    // Bayrak URL'si
    if (countryCode) {
        flagImg.src = getFlagUrl(countryCode);
    } else {
        // Varsayılan bayrak
        flagImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="213"><rect width="320" height="213" fill="%23cccccc"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666666" font-size="20">?</text></svg>';
    }
    flagImg.onerror = () => {
        flagImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="213"><rect width="320" height="213" fill="%23cccccc"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666666" font-size="20">Bayrak Yok</text></svg>';
    };
    
    // Ülke adı (V-Dem modern adı)
    panelCountryName.textContent = countryName;

    // Alt başlık - tarihi ad ve başkent
    const panelCountrySubtitle = document.getElementById('panel-country-subtitle');
    const currentYear = state.currentHistoricalYear || state.selectedYear || 2023;

    // Historical maps aktifse tarihi bilgileri göster
    if (state.historicalMapsEnabled && state.historicalNamesMapping) {
        import('../historical/historical-maps.js').then(({ getHistoricalName, getCapitalForYear }) => {
            const historicalInfo = getHistoricalName(countryName, currentYear);
            const capitalInfo = getCapitalForYear(countryName, currentYear);

            let subtitle = '';
            if (historicalInfo) {
                subtitle += historicalInfo.display_name;
            }
            if (capitalInfo) {
                subtitle += subtitle ? ` • Başkent: ${capitalInfo.capital}` : `Başkent: ${capitalInfo.capital}`;
            }

            panelCountrySubtitle.textContent = subtitle;
            panelCountrySubtitle.style.display = subtitle ? 'block' : 'none';
        });
    } else {
        panelCountrySubtitle.textContent = '';
        panelCountrySubtitle.style.display = 'none';
    }

    // Sabit analiz metinlerini panel öğelerine yaz
    const analyses = getCountryAnalysesText(countryName);
    nationsFailText.textContent = analyses.nationsFail;
    corridorText.textContent = hasCorridorData
        ? analyses.corridor
        : `${countryName} için Dar Koridor verisi bulunamadı.`;
    
    // Interactive map'i kapat (panel her açıldığında varsayılan olarak kapalı)
    if (state.interactiveMapActive) {
        import('../corridor/corridor-interactive.js').then(({ closeInteractiveMap }) => {
            if (closeInteractiveMap) {
                closeInteractiveMap();
            }
        });
    }

    // Dar Koridor grafiğini güncelle
    if (hasCorridorData) {
        const latestYear = getLatestYearForCountry(countryName);

        // Hangi yılı göstereceğimizi belirle (ana sayfadaki aktif yıl)
        // Öncelik sırası: WGI > V-Dem > Ana sayfadaki yıl slider'ı (currentHistoricalYear) > selectedYear > en son yıl
        let targetYear;

        // Aktif veri setine göre yıl belirle
        if (state.wgiEnabled && state.currentYear) {
            targetYear = state.currentYear;
        } else if (state.vdemEnabled && state.currentVdemYear) {
            targetYear = state.currentVdemYear;
        } else if (state.currentHistoricalYear) {
            // Ana sayfadaki yıl slider'ının değerini kullan
            targetYear = state.currentHistoricalYear;
        } else if (state.selectedYear) {
            targetYear = state.selectedYear;
        } else {
            // Hiçbiri yoksa en son yılı kullan
            targetYear = latestYear;
        }

        // Önce mode'u belirle (hedef yıla göre)
        const modernBtn = document.getElementById('corridor-mode-modern');
        const historicalBtn = document.getElementById('corridor-mode-historical');

        let selectedMode;
        let finalAvailableYears;

        if (targetYear <= 1995) {
            selectedMode = 'historical';
            setState('corridorMode', 'historical');
            if (modernBtn && historicalBtn) {
                modernBtn.classList.remove('active');
                historicalBtn.classList.add('active');
            }
            // Historical mode için available years'ı hesapla
            finalAvailableYears = getAvailableYearsForCountry(countryName, 'historical');
        } else {
            selectedMode = 'modern';
            setState('corridorMode', 'modern');
            if (modernBtn && historicalBtn) {
                modernBtn.classList.add('active');
                historicalBtn.classList.remove('active');
            }
            // Modern mode için zaten availableYears hesaplanmıştı
            finalAvailableYears = availableYears;
        }

        // Şimdi seçilen mode'daki available years'a göre en yakın yılı bul
        if (finalAvailableYears.length === 0) {
            console.warn(`${countryName} için ${selectedMode} modunda veri yok`);
            return;
        }

        if (!finalAvailableYears.includes(targetYear)) {
            // En yakın yılı bul
            const closestYear = finalAvailableYears.reduce((prev, curr) => {
                return Math.abs(curr - targetYear) < Math.abs(prev - targetYear) ? curr : prev;
            });
            targetYear = closestYear;
        }

        // State'e seçili yılı kaydet (interactive map için)
        setState('selectedYear', targetYear);

        updateCountryCorridorPosition(countryName, targetYear);
        setupCorridorYearSlider(countryName, finalAvailableYears, targetYear);

        // Interactive map toggle butonunu ilk açılışta kur
        if (!state.interactiveMapSetup) {
            setupToggleInteractiveMap();
            setState('interactiveMapSetup', true);
        }
    } else {
        console.warn(`${countryName} için Dar Koridor verisi yok`);
    }

    // Paneli göster
    panel.classList.add('active');
    
    console.log(`✓ Panel açıldı: ${countryName}`);
}

function toggleCorridorSection(hasData) {
    const elementsToToggle = [
        document.getElementById('corridor-graphic-main'),
        document.getElementById('corridor-info-bar'),
        document.getElementById('corridor-year-slider'),
        document.querySelector('.corridor-interactive-toggle'),
        document.getElementById('corridor-action-btn')
    ];
    
    elementsToToggle.forEach(el => {
        if (!el) return;
        el.style.display = hasData ? '' : 'none';
    });
    
    if (hasData) {
        return;
    }
    
    const dot = document.getElementById('country-position-dot');
    if (dot) dot.style.display = 'none';
    
    const infoValues = document.querySelectorAll('#corridor-info-bar .info-value');
    infoValues.forEach(el => el.textContent = '--');
    
    const interactiveControls = document.getElementById('interactive-map-controls');
    if (interactiveControls) {
        interactiveControls.style.display = 'none';
    }
    
    const toggleBtn = document.getElementById('toggle-interactive-map');
    if (toggleBtn) {
        toggleBtn.classList.remove('active');
    }
    
    state.interactiveMapActive = false;
}
