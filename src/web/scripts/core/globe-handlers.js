/**
 * Globe Event Handlers - ATLAS İnteraktif
 * Globe poligon etkileşimleri
 */

import { state, setState } from './state.js';
import { setupGlobePolygons, getPolygonCenter, focusOnLocation } from './globe.js';
import { resumeAutoRotate } from './interaction.js';
import { HOVER_COLOR, SELECTED_COLOR, ANIMATION_DURATIONS } from '../config/constants.js';
import { openCountryPanel } from '../modules/panel/panel-manager.js';
import { getPolygonLabelHtml } from './polygon-labels.js';

/**
 * Globe event handler'larını kurar
 */
export function setupGlobeEventHandlers() {
    setupGlobePolygons(
        getPolygonColor,
        getPolygonLabel,
        handleCountryHover,
        handleCountryClick
    );
}

/**
 * Poligon rengini döndürür
 */
function getPolygonColor(p) {
    if (state.wgiEnabled) {
        // WGI modülünden renk al
        return getWgiCountryColor(p);
    }
    return state.currentCountryColor;
}

/**
 * Poligon etiketini döndürür
 */
function getPolygonLabel(p) {
    return getPolygonLabelHtml(p);
}

/**
 * Fare ülke üzerinde gezindiğinde renk değişimi
 */
function handleCountryHover(polygon, prevPolygon) {
    // WGI aktifken veya panel açıkken hover rengi değiştirmeyelim
    const panel = document.getElementById('country-panel');
    const isPanelOpen = panel && panel.classList.contains('active');
    if (state.wgiEnabled || isPanelOpen) return;
    
    if (polygon) {
        state.globe.polygonCapColor(p => p === polygon ? HOVER_COLOR : state.currentCountryColor);
    } else {
        state.globe.polygonCapColor(() => state.currentCountryColor);
    }
}

/**
 * Ülkeye tıklandığında sağ paneli aç ve içeriği doldur
 */
function handleCountryClick(polygon) {
    if (!polygon) return;
    
    const countryName = polygon.properties.NAME || polygon.properties.ADMIN || 'Bilinmeyen Ülke';
    const countryCode = polygon.properties.ISO_A2 || 'XX';
    
    // WGI açık ise kapatıp küreye dön
    if (state.wgiEnabled) {
        // WGI disable fonksiyonu buradan çağrılacak
        console.log('WGI kapatılıyor...');
    }
    
    // Ülkeyi vurgula
    state.globe.polygonCapColor(p => 
        p === polygon ? SELECTED_COLOR : state.currentCountryColor
    );
    
    // Kameraya ülkeyi odakla
    const { lat, lng } = getPolygonCenter(polygon);
    focusOnLocation(lat, lng, 1.5, ANIMATION_DURATIONS.cameraMove);
    
    // Otomatik dönüşü yeniden aktif et (panel açıkken dönmeye devam etsin)
    resumeAutoRotate(ANIMATION_DURATIONS.autoRotateDelay);
    
    // Sağ paneli aç ve içeriği doldur
    openCountryPanel(countryName, countryCode);
    
    // Blur efektini aktifleştir
    document.getElementById('blur-overlay').classList.add('active');
    
    console.log('Seçilen ülke:', countryName, 'Kod:', countryCode);
}

// WGI renk fonksiyonu (placeholder - gerçek implementasyon WGI modülünde)
function getWgiCountryColor(polygon) {
    // Bu fonksiyon WGI modülünden import edilecek
    return state.currentCountryColor;
}

