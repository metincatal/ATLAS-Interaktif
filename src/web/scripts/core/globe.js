/**
 * Globe Yönetimi - ATLAS İnteraktif
 * Globe.gl başlatma ve yapılandırma
 */

import { state, setState } from './state.js';
import { 
    GLOBE_TEXTURE_URL, 
    GLOBE_BUMP_URL, 
    GLOBE_BACKGROUND_URL,
    GLOBE_SETTINGS 
} from '../config/constants.js';
import { setupInteractionListeners } from './interaction.js';
import { setupWgiControls } from '../modules/wgi/wgi-manager.js';
import { setupBaseColorSelector } from './base-color-selector.js';

/**
 * Globe.gl objesini başlatır ve temel ayarları yapar
 */
export function initializeGlobe() {
    const container = document.getElementById('globe-container');
    const mapTopOffset = getMapTopOffset();
    const availableHeight = Math.max(window.innerHeight - mapTopOffset, 300);
    setState('flatTopPadding', mapTopOffset);
    
    // Globe objesini oluştur
    const globe = Globe()
        (container)
        .globeImageUrl(GLOBE_TEXTURE_URL)
        .bumpImageUrl(GLOBE_BUMP_URL)
        .backgroundImageUrl(GLOBE_BACKGROUND_URL)
        .width(window.innerWidth)
        .height(availableHeight);
    
    // Otomatik dönüş kontrolü
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = GLOBE_SETTINGS.autoRotateSpeed;
    globe.controls().enableZoom = GLOBE_SETTINGS.enableZoom;
    
    // State'e kaydet
    setState('globe', globe);
    
    // Kullanıcı etkileşimi olduğunda otomatik dönüşü durdur
    setupInteractionListeners();
    
    // Pencere boyutu değiştiğinde globe'u yeniden boyutlandır
    window.addEventListener('resize', () => {
        const currentGlobe = state.globe;
        if (currentGlobe) {
            const offset = getMapTopOffset();
            const height = Math.max(window.innerHeight - offset, 300);
            setState('flatTopPadding', offset);
            currentGlobe.width(window.innerWidth);
            currentGlobe.height(height);
        }
    });

    // WGI Kontrollerini kur (UI)
    setupWgiControls();
    
    // Ana sayfa renk seçiciyi kur
    setupBaseColorSelector();
    
    console.log('✓ Globe başlatıldı');
}

/**
 * Globe'a ülke verilerini yükler
 */
export async function loadCountriesData(geojsonUrl) {
    try {
        const response = await fetch(geojsonUrl);
        
        if (!response.ok) {
            throw new Error('GeoJSON verisi yüklenemedi');
        }
        
        const countriesData = await response.json();
        setState('countriesData', countriesData);
        
        console.log('✓ Ülke verileri yüklendi:', countriesData.features.length, 'ülke');
        
        return countriesData;
        
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        alert('Harita verileri yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
        throw error;
    }
}

/**
 * Globe'a poligonları ekler
 */
export function setupGlobePolygons(
    getPolygonColor,
    getPolygonLabel,
    onPolygonHover,
    onPolygonClick,
    getPolygonStrokeColor = () => '#ffffff'
) {
    const globe = state.globe;
    const countriesData = state.countriesData;
    
    if (!globe || !countriesData) {
        console.warn('Globe veya ülke verileri hazır değil');
        return;
    }
    
    globe
        .polygonsData(countriesData.features)
        .polygonAltitude(GLOBE_SETTINGS.polygonAltitude)
        .polygonCapColor(getPolygonColor)
        .polygonSideColor(() => 'rgba(50, 150, 220, 0.5)')
        .polygonStrokeColor(getPolygonStrokeColor)
        .polygonLabel(getPolygonLabel)
        .onPolygonHover(onPolygonHover)
        .onPolygonClick(onPolygonClick);
    
    console.log('✓ Globe poligonları yapılandırıldı');
}

/**
 * Poligonun merkez koordinatlarını hesaplar
 */
export function getPolygonCenter(polygon) {
    const coordinates = polygon.geometry.coordinates[0];
    
    if (polygon.geometry.type === 'Polygon') {
        const firstCoord = coordinates[0];
        return { lng: firstCoord[0], lat: firstCoord[1] };
    } else if (polygon.geometry.type === 'MultiPolygon') {
        const firstCoord = coordinates[0][0];
        return { lng: firstCoord[0], lat: firstCoord[1] };
    }
    
    return { lng: 0, lat: 0 };
}

/**
 * Globe kamerasını belirli bir konuma odaklar
 */
export function focusOnLocation(lat, lng, altitude = 1.5, duration = 1000) {
    const globe = state.globe;
    if (globe) {
        globe.pointOfView({ lat, lng, altitude }, duration);
    }
}

function getMapTopOffset() {
    if (typeof window === 'undefined') return 0;
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue('--map-top-offset');
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
}
