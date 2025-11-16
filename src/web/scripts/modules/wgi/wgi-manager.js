/**
 * WGI Yöneticisi - ATLAS İnteraktif
 * WGI UI ve veri yükleme akışı
 */

import { state, setState } from '../../core/state.js';
import { loadWgiData } from './wgi-data.js';
import { getWgiPolygonColor, getWgiPolygonStrokeColor } from './wgi-colors.js';
import { setupGlobePolygons, focusOnLocation, getPolygonCenter } from '../../core/globe.js';
import { getPolygonLabelHtml } from '../../core/polygon-labels.js';
import { toggleFlatMap } from '../../core/flatmap.js';
import { openCountryPanel } from '../panel/panel-manager.js';
import { resumeAutoRotate } from '../../core/interaction.js';
import { ANIMATION_DURATIONS } from '../../config/constants.js';
import { setupGlobeEventHandlers } from '../../core/globe-handlers.js';

/**
 * WGI UI ve veri yükleme akışı
 */
let disableWgiModeHandler = null;
let enableWgiModeHandler = null;

export function setupWgiControls() {
    const wgiHeader = document.getElementById('wgi-header');
    const wgiBtn = document.getElementById('wgi-button');
    const indicatorGroup = document.getElementById('indicator-group');
    const scaleGroup = document.getElementById('scale-group');
    const projectionToggle = document.getElementById('projection-toggle');
    const yearSliderContainer = document.getElementById('year-slider-container');
    
    if (!wgiHeader || !wgiBtn) {
        console.warn('WGI elementleri bulunamadı');
        return;
    }
    
    // Üst WGI barını sadece buton görünür olacak şekilde aç
    wgiHeader.style.display = 'flex';
    wgiHeader.classList.remove('wgi-active');
    
    const disableWgiMode = () => {
        if (!state.wgiEnabled) return false;
        
        setState('wgiEnabled', false);
        wgiBtn.textContent = 'WGI';
        wgiBtn.classList.remove('active');
        wgiHeader.classList.remove('wgi-active');
        
        if (indicatorGroup) indicatorGroup.style.display = 'none';
        if (scaleGroup) scaleGroup.style.display = 'none';
        if (projectionToggle) projectionToggle.style.display = 'none';
        if (yearSliderContainer) yearSliderContainer.style.display = 'none';
        
        toggleFlatMap(false);
        
        const baseColorSelector = document.getElementById('base-color-selector');
        const theoryButton = document.getElementById('theory-button');
        if (baseColorSelector) baseColorSelector.style.display = 'flex';
        if (theoryButton) theoryButton.style.display = 'flex';
        
        setState('selectedLegendRange', null);
        updateLegendSelectionStyles();
        
        if (state.globe) {
            state.globe.polygonCapColor(() => state.currentCountryColor);
            state.globe.polygonStrokeColor(() => '#ffffff');
        }
        
        setupGlobeEventHandlers();
        
        const pendingFocus = state.pendingCountryFocus;
        if (pendingFocus && state.globe) {
            focusOnLocation(pendingFocus.lat, pendingFocus.lng, 1.5, ANIMATION_DURATIONS.cameraMove);
            setState('pendingCountryFocus', null);
        } else {
            setState('pendingCountryFocus', null);
        }
        
        resumeAutoRotate(ANIMATION_DURATIONS.autoRotateDelay);
        
        console.log('✓ WGI kapatıldı');
        return true;
    };
    
    const enableWgiMode = () => {
        if (state.wgiEnabled) return false;
        
        setState('wgiEnabled', true);
        wgiBtn.textContent = 'WGI Açık';
        wgiBtn.classList.add('active');
        wgiHeader.classList.add('wgi-active');
        setState('selectedLegendRange', null);
        updateLegendSelectionStyles();
        
        if (indicatorGroup) indicatorGroup.style.display = 'flex';
        if (scaleGroup) scaleGroup.style.display = 'flex';
        if (projectionToggle) projectionToggle.style.display = 'flex';
        if (yearSliderContainer) yearSliderContainer.style.display = 'flex';
        
        toggleFlatMap(false);
        
        const baseColorSelector = document.getElementById('base-color-selector');
        const theoryButton = document.getElementById('theory-button');
        if (baseColorSelector) baseColorSelector.style.display = 'none';
        if (theoryButton) theoryButton.style.display = 'none';
        
        console.log('✓ WGI açıldı');
        
        const activateVisualization = () => {
            setupWgiEventListeners();
            updateWgiVisualization();
            console.log('✓ WGI görselleştirme aktif');
        };
        
        const hasWgiData = state.wgiYears && state.wgiYears.length > 0 && state.wgiDataByIso3 && Object.keys(state.wgiDataByIso3).length > 0;
        
        if (hasWgiData) {
            activateVisualization();
        } else {
            loadWgiData().then(() => {
                activateVisualization();
            }).catch(error => {
                console.error('WGI veri yükleme hatası:', error);
            });
        }
        return true;
    };
    
    disableWgiModeHandler = disableWgiMode;
    enableWgiModeHandler = enableWgiMode;
    
    document.addEventListener('wgi:disable', () => {
        disableWgiMode();
    });
    
    wgiBtn.addEventListener('click', () => {
        if (state.wgiEnabled) {
            disableWgiMode();
        } else {
            enableWgiMode();
        }
    });
    
    console.log('✓ WGI kontrolleri hazır');
}

/**
 * WGI event listener'larını kurar
 */
function setupWgiEventListeners() {
    configureYearSlider();
    setupLegendInteractions();
    updateLegendSelectionStyles();
    updateWgiLegend();
    
    if (state.wgiListenersBound) {
        return;
    }
    
    // Gösterge değişikliği
    const indicatorSelect = document.getElementById('indicator-select');
    if (indicatorSelect) {
        indicatorSelect.addEventListener('change', (e) => {
            setState('currentIndicator', e.target.value);
            updateWgiVisualization();
        });
    }
    
    // Skala değişikliği
    const scaleSelect = document.getElementById('scale-select');
    if (scaleSelect) {
        scaleSelect.addEventListener('change', (e) => {
            setState('currentWgiScheme', e.target.value);
            updateWgiVisualization();
        });
    }
    
    // Ters checkbox
    const scaleReverse = document.getElementById('scale-reverse');
    if (scaleReverse) {
        scaleReverse.addEventListener('change', (e) => {
            setState('currentWgiReverse', e.target.checked);
            updateWgiVisualization();
        });
    }
    
    // Yıl slider
    const yearSlider = document.getElementById('year-slider');
    if (yearSlider) {
        yearSlider.addEventListener('input', handleYearSliderInput);
    }
    
    // Küre/Düzlem toggle
    const btnGlobe = document.getElementById('btn-globe');
    const btnFlat = document.getElementById('btn-flat');
    
    if (btnGlobe) {
        btnGlobe.addEventListener('click', () => {
            toggleFlatMap(false);
        });
    }
    
    if (btnFlat) {
        btnFlat.addEventListener('click', () => {
            toggleFlatMap(true);
        });
    }
    
    setState('wgiListenersBound', true);
}

function handleYearSliderInput(e) {
    const year = parseInt(e.target.value, 10);
    if (Number.isNaN(year)) return;
    
    setState('currentYear', year);
    const yearLabel = document.getElementById('year-label');
    if (yearLabel) {
        yearLabel.textContent = year;
    }
    updateWgiVisualization();
}

function configureYearSlider() {
    const years = state.wgiYears;
    const yearSlider = document.getElementById('year-slider');
    const yearLabel = document.getElementById('year-label');
    
    if (!yearSlider || !yearLabel || !years || years.length === 0) return;
    
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const currentYear = state.currentYear || maxYear;
    
    yearSlider.min = minYear;
    yearSlider.max = maxYear;
    yearSlider.value = currentYear;
    yearLabel.textContent = currentYear;
}

function setupLegendInteractions() {
    const legendSegments = document.querySelectorAll('.legend-segment-svg');
    legendSegments.forEach(segment => {
        if (segment.dataset.bound === 'true') return;
        
        segment.dataset.bound = 'true';
        segment.addEventListener('click', () => {
            const range = segment.getAttribute('data-range');
            if (!range) return;
            const [min, max] = range.split(':').map(parseFloat);
            handleLegendSelection({ type: 'range', min, max });
        });
    });
    
    const nodataSegment = document.querySelector('.legend-nodata-svg');
    if (nodataSegment && nodataSegment.dataset.bound !== 'true') {
        nodataSegment.dataset.bound = 'true';
        nodataSegment.addEventListener('click', () => handleLegendSelection({ type: 'nodata' }));
    }
}

function handleLegendSelection(selection) {
    const current = state.selectedLegendRange;
    let nextSelection = selection;
    
    if (current && current.type === selection.type) {
        if (selection.type === 'range' && current.min === selection.min && current.max === selection.max) {
            nextSelection = null;
        }
        if (selection.type === 'nodata') {
            nextSelection = null;
        }
    }
    
    if (nextSelection) {
        nextSelection = selection.type === 'range' 
            ? { type: 'range', min: selection.min, max: selection.max }
            : { type: 'nodata' };
    }
    
    setState('selectedLegendRange', nextSelection);
    updateLegendSelectionStyles();
    updateWgiVisualization();
}

function updateLegendSelectionStyles() {
    const selection = state.selectedLegendRange;
    const legendSegments = document.querySelectorAll('.legend-segment-svg');
    
    legendSegments.forEach(segment => {
        const range = segment.getAttribute('data-range');
        if (!range) return;
        const [min, max] = range.split(':').map(parseFloat);
        const isActive = selection && selection.type === 'range' && selection.min === min && selection.max === max;
        segment.classList.toggle('active', Boolean(isActive));
    });
    
    const nodataSegment = document.querySelector('.legend-nodata-svg');
    if (nodataSegment) {
        const isActive = selection && selection.type === 'nodata';
        nodataSegment.classList.toggle('active', Boolean(isActive));
    }
}

/**
 * WGI görselleştirmesini günceller
 */
function updateWgiVisualization() {
    if (!state.wgiEnabled || !state.countriesData) return;
    
    // Globe güncelle
    if (state.globe) {
        setupGlobePolygons(
            getWgiPolygonColor,
            (p) => getPolygonLabelHtml(p),
            () => {},
            handleWgiPolygonClick,
            getWgiPolygonStrokeColor
        );
    }
    
    // Flat map güncelle
    if (state.flatMapInitialized) {
        import('../../core/flatmap.js').then(module => {
            module.updateFlatMap();
        });
    }
    
    // Legend'i güncelle
    updateWgiLegend();
    
    console.log(`✓ WGI güncellendi: ${state.currentIndicator} - ${state.currentYear}`);
}

/**
 * WGI legend'ini günceller
 */
function updateWgiLegend() {
    const legend = document.getElementById('legend');
    if (!legend) return;
    
    legend.style.display = 'block';
    
    // Gradient'i güncelle
    const gradient = document.getElementById('wgi-gradient');
    if (gradient) {
        const scheme = state.currentWgiScheme || 'RdYlGn';
        const reverse = state.currentWgiReverse || false;
        
        // D3 color scale ile gradient oluştur
        if (window.d3) {
            const d3 = window.d3;
            let colorScale;
            switch (scheme) {
                case 'RdYlGn': colorScale = d3.scaleSequential(d3.interpolateRdYlGn); break;
                case 'Spectral': colorScale = d3.scaleSequential(d3.interpolateSpectral); break;
                case 'RdBu': colorScale = d3.scaleSequential(d3.interpolateRdBu); break;
                case 'PiYG': colorScale = d3.scaleSequential(d3.interpolatePiYG); break;
                case 'BrBG': colorScale = d3.scaleSequential(d3.interpolateBrBG); break;
                case 'PRGn': colorScale = d3.scaleSequential(d3.interpolatePRGn); break;
                case 'PuOr': colorScale = d3.scaleSequential(d3.interpolatePuOr); break;
                case 'RdGy': colorScale = d3.scaleSequential(d3.interpolateRdGy); break;
                default: colorScale = d3.scaleSequential(d3.interpolateRdYlGn);
            }
            
            if (reverse) {
                colorScale.domain([2.5, -2.5]);
            } else {
                colorScale.domain([-2.5, 2.5]);
            }
            
            // Gradient stops oluştur
            const stops = [];
            for (let i = 0; i <= 100; i++) {
                const value = -2.5 + (i / 100) * 5;
                const color = colorScale(value);
                stops.push(`<stop offset="${i}%" stop-color="${color}"/>`);
            }
            
            gradient.innerHTML = stops.join('');
        }
    }
    
    updateLegendSelectionStyles();
}

function handleWgiPolygonClick(polygon) {
    if (!polygon) return;
    requestDisableWgiMode();
    openPanelFromPolygon(polygon, { focusOnGlobe: true });
}

function openPanelFromPolygon(polygon, { focusOnGlobe = false } = {}) {
    if (!polygon) return;
    
    const countryName = polygon.properties.NAME || polygon.properties.ADMIN || 'Bilinmeyen Ülke';
    const countryCode = polygon.properties.ISO_A2 || 'XX';
    
    openCountryPanel(countryName, countryCode);
    
    const blurOverlay = document.getElementById('blur-overlay');
    if (blurOverlay) {
        blurOverlay.classList.add('active');
    }
    
    if (focusOnGlobe && state.globe) {
        const { lat, lng } = getPolygonCenter(polygon);
        focusOnLocation(lat, lng, 1.5, ANIMATION_DURATIONS.cameraMove);
        resumeAutoRotate(ANIMATION_DURATIONS.autoRotateDelay);
    }
}

function isGlobeVisible() {
    const globeContainer = document.getElementById('globe-container');
    return globeContainer && globeContainer.style.display !== 'none';
}

function requestDisableWgiMode() {
    if (typeof disableWgiModeHandler === 'function') {
        disableWgiModeHandler();
    }
}
