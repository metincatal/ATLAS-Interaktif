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
    getPolygonStrokeColor = () => '#ffffff',
    options = {}
) {
    const globe = state.globe;
    const countriesData = state.countriesData;

    if (!globe || !countriesData) {
        console.warn('Globe veya ülke verileri hazır değil');
        return;
    }

    // Mesh kalitesi ayarları (WGI için daha kaliteli render)
    const {
        enableMesh = false, // true ise mesh optimizasyonu kapalı (daha kaliteli)
        polygonAltitude = 0.001,
        enableSideColor = false
    } = options;

    const altitude = enableMesh ? 0.01 : polygonAltitude;
    const sideColor = enableMesh ? getPolygonColor : () => 'rgba(0, 0, 0, 0)';

    globe
        .polygonsData(countriesData.features)
        .polygonAltitude(altitude)
        .polygonCapColor(getPolygonColor)
        .polygonSideColor(sideColor)
        .polygonStrokeColor(getPolygonStrokeColor)
        .polygonsTransitionDuration(0)
        .polygonLabel(getPolygonLabel)
        .onPolygonHover(onPolygonHover)
        .onPolygonClick(onPolygonClick);

    console.log('✓ Globe poligonları yapılandırıldı (mesh:', enableMesh ? 'aktif' : 'optimized', ')');
}

/**
 * Globe'a tarihi haritayı yükler
 */
export function loadHistoricalMapToGlobe(mapData, milestone, year) {
    const globe = state.globe;

    if (!globe || !mapData) {
        console.warn('⚠️  Globe veya harita verisi hazır değil');
        return false;
    }

    console.log(`🗺️  Tarihi harita yükleniyor: ${milestone.year} (${mapData.features.length} feature)`);

    // Import historical maps fonksiyonlarını dinamik olarak kullan
    const createHistoricalTooltip = window.createHistoricalTooltip;

    // Poligon verisini temizle (performans için - üçgenleme yapmasın)
    globe.polygonsData([]);

    // GeoJSON'dan path'leri (sınırları) çıkar
    const paths = [];
    mapData.features.forEach(feature => {
        const geometry = feature.geometry;
        if (geometry.type === 'Polygon') {
            geometry.coordinates.forEach(ring => paths.push(ring));
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(polygon => {
                polygon.forEach(ring => paths.push(ring));
            });
        }
    });

    // Path (sınır) olarak yükle - Çok daha performanslı
    globe
        .pathsData(paths)
        .pathPointLat(p => p[1])
        .pathPointLng(p => p[0])
        .pathColor(() => '#ffffff')
        .pathDashLength(1)
        .pathDashGap(0)
        .pathAltitude(0.002) // Biraz yukarıda olsun
        .pathTransitionDuration(0);

    console.log('✓ Tarihi harita globe\'a yüklendi (sadece sınırlar, path olarak)');
    return true;
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
