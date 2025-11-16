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
    
    console.log('✓ Panel yöneticisi hazır');
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
    
    // Ülkenin mevcut yıllarını al
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
    
    // Ülke adı
    panelCountryName.textContent = countryName;
    
    // Sabit analiz metinlerini panel öğelerine yaz
    const analyses = getCountryAnalysesText(countryName);
    nationsFailText.textContent = analyses.nationsFail;
    corridorText.textContent = hasCorridorData
        ? analyses.corridor
        : `${countryName} için Dar Koridor verisi bulunamadı.`;
    
    // Dar Koridor grafiğini güncelle
    if (hasCorridorData) {
        const latestYear = getLatestYearForCountry(countryName);
        updateCountryCorridorPosition(countryName, latestYear);
        setupCorridorYearSlider(countryName, availableYears);
        
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
