/**
 * 2D Düzlem Harita - ATLAS İnteraktif
 * D3.js ile düz harita projeksiyonu
 */

import { state, setState } from './state.js';
import { getWgiPolygonStrokeColor, isPolygonInLegendSelection, getWgiFlatFill } from '../modules/wgi/wgi-colors.js';
import { getPolygonLabelHtml } from './polygon-labels.js';
import { openCountryPanel } from '../modules/panel/panel-manager.js';

// D3 global olarak yüklenmiş
const d3 = window.d3;

/**
 * 2D düzlem haritayı başlatır
 */
export function initializeFlatMap() {
    const container = document.getElementById('flatmap-container');
    if (!container || !state.countriesData) {
        console.warn('Flat map container veya veri bulunamadı');
        return;
    }
    
    // SVG oluştur
    const width = window.innerWidth;
    const topPadding = state.flatTopPadding || 0;
    const height = Math.max(window.innerHeight - topPadding, 300);
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Projeksiyon oluştur
    const projection = d3.geoNaturalEarth1()
        .scale(Math.min(width, height) / 3.2)
        .translate([width / 2, height / 2 + 80])
        .precision(0.1);
    
    const path = d3.geoPath().projection(projection);
    
    // Path'leri çiz
    svg.selectAll('path.country')
        .data(state.countriesData.features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', path)
        .attr('fill', (d) => {
            if (state.wgiEnabled) {
                return getWgiFlatFill(d);
            }
            return state.currentCountryColor;
        })
        .attr('stroke', (d) => {
            if (state.wgiEnabled) {
                return getWgiPolygonStrokeColor(d);
            }
            return '#fff';
        })
        .attr('stroke-width', (d) => {
            if (state.wgiEnabled && state.selectedLegendRange) {
                return isPolygonInLegendSelection(d) ? 2.2 : 0.6;
            }
            return 0.6;
        })
        .attr('opacity', (d) => {
            if (state.wgiEnabled && state.selectedLegendRange) {
                return isPolygonInLegendSelection(d) ? 1 : 0.45;
            }
            return 0.9;
        })
        .on('mouseenter', function(event, d) {
            const selectionActive = state.wgiEnabled && state.selectedLegendRange;
            const targetOpacity = selectionActive
                ? (isPolygonInLegendSelection(d) ? 1 : 0.35)
                : 1;
            const targetStrokeWidth = selectionActive
                ? (isPolygonInLegendSelection(d) ? 2.8 : 0.8)
                : 2.2;
            d3.select(this).attr('opacity', targetOpacity).attr('stroke-width', targetStrokeWidth);
            showTooltip(event, d);
        })
        .on('mouseleave', function(event, d) {
            const selectionActive = state.wgiEnabled && state.selectedLegendRange;
            const baseOpacity = selectionActive
                ? (isPolygonInLegendSelection(d) ? 1 : 0.45)
                : 0.9;
            const baseStrokeWidth = selectionActive
                ? (isPolygonInLegendSelection(d) ? 2.2 : 0.6)
                : 0.6;
            d3.select(this).attr('opacity', baseOpacity).attr('stroke-width', baseStrokeWidth);
            hideTooltip();
        })
        .on('mousemove', function(event) {
            updateTooltipPosition(event);
        })
        .on('click', function(event, d) {
            handleFlatMapCountryClick(d);
        });
    
    setState('flatSvg', svg);
    setState('flatProjection', projection);
    setState('flatPath', path);
    setState('flatMapInitialized', true);
    
    console.log('✓ 2D Düzlem harita başlatıldı');
}

/**
 * Flat map'i günceller (WGI değiştiğinde)
 */
export function updateFlatMap() {
    if (!state.flatMapInitialized || !state.flatSvg) return;
    
    const selectionActive = Boolean(state.wgiEnabled && state.selectedLegendRange);
    
    state.flatSvg.selectAll('path.country')
        .attr('fill', (d) => {
            if (state.wgiEnabled) {
                return getWgiFlatFill(d);
            }
            return state.currentCountryColor;
        })
        .attr('stroke', (d) => {
            if (state.wgiEnabled) {
                return getWgiPolygonStrokeColor(d);
            }
            return '#fff';
        })
        .attr('stroke-width', (d) => {
            if (state.wgiEnabled && selectionActive) {
                return isPolygonInLegendSelection(d) ? 2.2 : 0.6;
            }
            return 0.6;
        })
        .attr('opacity', (d) => {
            if (state.wgiEnabled && selectionActive) {
                return isPolygonInLegendSelection(d) ? 1 : 0.45;
            }
            return 0.9;
        });
    
    console.log('✓ Flat map güncellendi');
}

/**
 * Flat map'i göster/gizle
 */
export function toggleFlatMap(show) {
    const globeContainer = document.getElementById('globe-container');
    const flatContainer = document.getElementById('flatmap-container');
    const btnGlobe = document.getElementById('btn-globe');
    const btnFlat = document.getElementById('btn-flat');
    
    if (show) {
        // Flat map göster
        if (globeContainer) globeContainer.style.display = 'none';
        if (flatContainer) flatContainer.style.display = 'block';
        if (btnGlobe) btnGlobe.classList.remove('active');
        if (btnFlat) btnFlat.classList.add('active');
        
        // Eğer henüz başlatılmadıysa başlat
        if (!state.flatMapInitialized) {
            initializeFlatMap();
        } else {
            updateFlatMap();
        }
        
        console.log('✓ Düzlem harita gösterildi');
    } else {
        // Globe göster
        if (globeContainer) globeContainer.style.display = 'block';
        if (flatContainer) flatContainer.style.display = 'none';
        if (btnGlobe) btnGlobe.classList.add('active');
        if (btnFlat) btnFlat.classList.remove('active');
        
        console.log('✓ Küre harita gösterildi');
    }
}

/**
 * Tooltip gösterir
 */
function showTooltip(event, d) {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    
    const countryName = d.properties.NAME || d.properties.ADM0 || 'Bilinmeyen Ülke';
    tooltip.innerHTML = getPolygonLabelHtml(d);
    tooltip.style.display = 'block';
    updateTooltipPosition(event);
}

/**
 * Tooltip'i gizler
 */
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

/**
 * Tooltip pozisyonunu günceller
 */
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    
    const padding = 12;
    const tooltipWidth = tooltip.offsetWidth || 200;
    const tooltipHeight = tooltip.offsetHeight || 80;
    
    let left = event.pageX + 12;
    let top = event.pageY - tooltipHeight - 8;
    
    if (left + tooltipWidth + padding > window.pageXOffset + window.innerWidth) {
        left = window.pageXOffset + window.innerWidth - tooltipWidth - padding;
    }
    
    if (left < window.pageXOffset + padding) {
        left = window.pageXOffset + padding;
    }
    
    if (top < window.pageYOffset + padding) {
        top = event.pageY + 12;
    }
    
    if (top + tooltipHeight + padding > window.pageYOffset + window.innerHeight) {
        top = window.pageYOffset + window.innerHeight - tooltipHeight - padding;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function handleFlatMapCountryClick(feature) {
    if (!feature) return;
    
    const center = getFeatureCenterLatLng(feature);
    if (center) {
        setState('pendingCountryFocus', center);
    }
    
    if (state.wgiEnabled) {
        document.dispatchEvent(new CustomEvent('wgi:disable', { detail: { reason: 'selection' } }));
    }
    
    const countryName = feature.properties.NAME || feature.properties.ADMIN || 'Bilinmeyen Ülke';
    const countryCode = feature.properties.ISO_A2 || 'XX';
    openCountryPanel(countryName, countryCode);
    
    const blurOverlay = document.getElementById('blur-overlay');
    if (blurOverlay) {
        blurOverlay.classList.add('active');
    }
}

function getFeatureCenterLatLng(feature) {
    if (!feature || !feature.geometry) return null;
    const { geometry } = feature;
    if (geometry.type === 'Polygon') {
        const first = geometry.coordinates?.[0]?.[0];
        if (first) return { lng: first[0], lat: first[1] };
    } else if (geometry.type === 'MultiPolygon') {
        const first = geometry.coordinates?.[0]?.[0]?.[0];
        if (first) return { lng: first[0], lat: first[1] };
    }
    return null;
}
