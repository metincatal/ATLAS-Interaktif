/**
 * WGI Renk Yönetimi - ATLAS İnteraktif
 * WGI değerlerine göre renk hesaplama
 */

import { state } from '../../core/state.js';
import { getWgiValue } from './wgi-data.js';
import { getIso3 } from '../../utils/data-helpers.js';

// D3 global olarak yüklenmiş
const d3 = window.d3;

const MUTED_FILL = 'rgba(74, 88, 128, 0.55)';
const NODATA_HIGHLIGHT = 'rgba(167, 181, 206, 0.9)';
const DEFAULT_NODATA = 'rgba(124, 138, 175, 0.85)';
const DEFAULT_STROKE = 'rgba(255, 255, 255, 0.7)';
const MUTED_STROKE = 'rgba(255, 255, 255, 0.28)';
const HIGHLIGHT_STROKE = '#000000';
const NODATA_PATTERN = 'url(#map-nodata-pattern)';

function matchesLegendSelection(value) {
    const selection = state.selectedLegendRange;
    if (!selection) return true;
    
    if (selection.type === 'nodata') {
        return value === null;
    }
    
    if (value === null || value === undefined) {
        return false;
    }
    
    return value >= selection.min && value <= selection.max;
}

function getSelection() {
    return state.selectedLegendRange;
}

/**
 * WGI değerine göre renk döndürür
 */
export function getWgiColor(iso3, indicator, year) {
    const value = getWgiValue(iso3, indicator, year);
    
    const selection = getSelection();
    const selectionActive = Boolean(selection);
    
    if (value === null || value === undefined || isNaN(value)) {
        return selectionActive ? (selection?.type === 'nodata' ? NODATA_HIGHLIGHT : MUTED_FILL) : DEFAULT_NODATA;
    }
    
    // WGI değerleri genellikle -2.5 ile +2.5 arası
    const minValue = -2.5;
    const maxValue = 2.5;
    
    // Seçili skalayı al
    const scheme = state.currentWgiScheme || 'RdYlGn';
    const reverse = state.currentWgiReverse || false;
    
    // D3 color scale oluştur
    let colorScale;
    
    switch (scheme) {
        case 'RdYlGn':
            colorScale = d3.scaleSequential(d3.interpolateRdYlGn);
            break;
        case 'Spectral':
            colorScale = d3.scaleSequential(d3.interpolateSpectral);
            break;
        case 'RdBu':
            colorScale = d3.scaleSequential(d3.interpolateRdBu);
            break;
        case 'PiYG':
            colorScale = d3.scaleSequential(d3.interpolatePiYG);
            break;
        case 'BrBG':
            colorScale = d3.scaleSequential(d3.interpolateBrBG);
            break;
        case 'PRGn':
            colorScale = d3.scaleSequential(d3.interpolatePRGn);
            break;
        case 'PuOr':
            colorScale = d3.scaleSequential(d3.interpolatePuOr);
            break;
        case 'RdGy':
            colorScale = d3.scaleSequential(d3.interpolateRdGy);
            break;
        default:
            colorScale = d3.scaleSequential(d3.interpolateRdYlGn);
    }
    
    // Domain ayarla (ters çevrilmişse)
    if (reverse) {
        colorScale.domain([maxValue, minValue]);
    } else {
        colorScale.domain([minValue, maxValue]);
    }
    
    const color = colorScale(value);
    if (selectionActive && !matchesLegendSelection(value)) {
        return MUTED_FILL;
    }
    
    return color;
}

/**
 * Tüm ülkeler için renk fonksiyonu (Globe için)
 */
export function getWgiPolygonColor(polygon) {
    if (!state.wgiEnabled) {
        return state.currentCountryColor;
    }
    
    const iso3 = getIso3(polygon);
    if (!iso3) {
        return 'rgba(100, 100, 100, 0.5)'; // ISO3 yok
    }
    
    return getWgiColor(iso3, state.currentIndicator, state.currentYear);
}

/**
 * Flat map için özel fill (pattern desteği ile)
 */
export function getWgiFlatFill(polygon) {
    if (!state.wgiEnabled) {
        return state.currentCountryColor;
    }
    
    const iso3 = getIso3(polygon);
    const value = iso3 ? getWgiValue(iso3, state.currentIndicator, state.currentYear) : null;
    const selection = getSelection();
    
    if (selection && selection.type === 'nodata') {
        return value === null || value === undefined || isNaN(value)
            ? NODATA_PATTERN
            : MUTED_FILL;
    }
    
    return getWgiColor(iso3, state.currentIndicator, state.currentYear) || DEFAULT_NODATA;
}

/**
 * Poligon sınır rengi
 */
export function getWgiPolygonStrokeColor(polygon) {
    if (!state.wgiEnabled) return DEFAULT_STROKE;
    
    const iso3 = getIso3(polygon);
    if (!iso3) return MUTED_STROKE;
    
    const value = getWgiValue(iso3, state.currentIndicator, state.currentYear);
    const selection = getSelection();
    if (!selection) {
        return DEFAULT_STROKE;
    }
    
    return matchesLegendSelection(value) ? HIGHLIGHT_STROKE : MUTED_STROKE;
}

/**
 * Legend filtresine göre ülke seçili mi?
 */
export function isPolygonInLegendSelection(polygon) {
    if (!state.wgiEnabled || !state.selectedLegendRange) return true;
    
    const iso3 = getIso3(polygon);
    if (!iso3) return false;
    
    const value = getWgiValue(iso3, state.currentIndicator, state.currentYear);
    return matchesLegendSelection(value);
}
