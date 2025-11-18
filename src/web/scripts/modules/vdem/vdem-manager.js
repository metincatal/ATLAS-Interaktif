import { state, setState } from '../../core/state.js';
import { loadVdemData } from './vdem-data.js';
import { renderVdemMindmap } from './vdem-mindmap.js';
import { getVdemPolygonColor, getVdemPolygonStrokeColor, getVdemFlatFill, getVdemGradientStops } from './vdem-colors.js';
import { setupGlobePolygons, getPolygonCenter, focusOnLocation } from '../../core/globe.js';
import { getPolygonLabelHtml } from '../../core/polygon-labels.js';
import { toggleFlatMap } from '../../core/flatmap.js';
import { openCountryPanel } from '../panel/panel-manager.js';
import { resumeAutoRotate } from '../../core/interaction.js';
import { ANIMATION_DURATIONS } from '../../config/constants.js';

const overlaySelectors = {
    overlay: 'vdem-overlay',
    openBtn: 'vdem-button',
    closeBtn: 'vdem-overlay-close',
    reopenBtn: 'open-vdem-mindmap'
};

export function setupVdemExperience() {
    const vdemBtn = document.getElementById(overlaySelectors.openBtn);
    const overlay = document.getElementById(overlaySelectors.overlay);
    const closeBtn = document.getElementById(overlaySelectors.closeBtn);
    const reopenBtn = document.getElementById(overlaySelectors.reopenBtn);
    const scaleSelect = document.getElementById('vdem-scale-select');
    const scaleReverse = document.getElementById('vdem-scale-reverse');
    const yearSlider = document.getElementById('vdem-year-slider');
    const datasetHeader = document.getElementById('dataset-header');
    const wgiControls = document.getElementById('wgi-controls');
    const vdemControls = document.getElementById('vdem-controls');
    const legend = document.getElementById('vdem-legend');
    const sliderContainer = document.getElementById('vdem-year-slider-container');
    
    if (!vdemBtn || !overlay) {
        console.warn('V-Dem UI elemanları bulunamadı');
        return;
    }
    
    const ensureMindmap = async () => {
        if (state.vdemMindmapRendered) return;
        try {
            await renderVdemMindmap(handleMindmapSelection);
        } catch (error) {
            console.error('Mind map render hatası:', error);
        }
    };
    
    vdemBtn.addEventListener('click', () => {
        if (state.vdemOverlayOpen) {
            closeOverlay();
            return;
        }
        if (state.vdemEnabled) {
            disableVdemMode();
        } else {
            openOverlay();
        }
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeOverlay();
        });
    }
    
    if (reopenBtn) {
        reopenBtn.addEventListener('click', () => {
            openOverlay();
        });
    }
    
    if (scaleSelect) {
        scaleSelect.addEventListener('change', (e) => {
            setState('currentVdemScheme', e.target.value);
            updateVdemVisualization();
        });
    }
    
    if (scaleReverse) {
        scaleReverse.addEventListener('change', (e) => {
            setState('currentVdemReverse', e.target.checked);
            updateVdemVisualization();
        });
    }
    
    if (yearSlider) {
        yearSlider.addEventListener('input', (e) => {
            const year = parseInt(e.target.value, 10);
            if (Number.isNaN(year)) return;
            setState('currentVdemYear', year);
            const label = document.getElementById('vdem-year-label');
            if (label) label.textContent = year;
            updateVdemVisualization();
        });
    }
    
    const vdemGlobebtn = document.getElementById('vdem-btn-globe');
    const vdemFlatBtn = document.getElementById('vdem-btn-flat');
    if (vdemGlobebtn) {
        vdemGlobebtn.addEventListener('click', () => toggleFlatMap(false, 'vdem'));
    }
    if (vdemFlatBtn) {
        vdemFlatBtn.addEventListener('click', () => toggleFlatMap(true, 'vdem'));
    }
    
    function openOverlay() {
        if (!overlay) return;
        overlay.classList.add('active');
        setState('vdemOverlayOpen', true);
        vdemBtn.classList.add('active');
        ensureMindmap();
    }
    
    function closeOverlay() {
        if (!overlay) return;
        overlay.classList.remove('active');
        setState('vdemOverlayOpen', false);
        if (!state.vdemEnabled) {
            vdemBtn.classList.remove('active');
        }
    }
    
    async function handleMindmapSelection(nodeData, breadcrumbs) {
        const indicatorId = nodeData.columns?.[0];
        if (!indicatorId) {
            console.warn('Bu düğüm için veri bulunamadı');
            return;
        }
        await loadVdemData();
        if (!state.vdemDataByIndicator[indicatorId]) {
            alert(`"${indicatorId}" kolonuna ait veri bulunamadı.`);
            return;
        }
        setState('currentVdemIndicator', indicatorId);
        setState('currentVdemBreadcrumbs', breadcrumbs || []);
        closeOverlay();
        await enableVdemMode();
    }
    
    async function enableVdemMode() {
        document.dispatchEvent(new CustomEvent('wgi:disable', { detail: { nextMode: 'vdem' } }));
        await loadVdemData();
        setState('vdemEnabled', true);
        vdemBtn.classList.add('active');
        if (datasetHeader) {
            datasetHeader.style.display = 'flex';
            datasetHeader.classList.add('dataset-active', 'dataset-mode-vdem');
        }
        if (wgiControls) {
            wgiControls.style.display = 'none';
        }
        if (vdemControls) {
            vdemControls.style.display = 'flex';
        }
        if (sliderContainer) sliderContainer.style.display = 'flex';
        if (legend) legend.style.display = 'block';
        const baseColorSelector = document.getElementById('base-color-selector');
        const theoryButton = document.getElementById('theory-button');
        if (baseColorSelector) baseColorSelector.style.display = 'none';
        if (theoryButton) theoryButton.style.display = 'none';
        configureYearSlider();
        toggleFlatMap(false, 'vdem');
        updateBreadcrumbDisplay();
        updateVdemVisualization();
    }
    
    function disableVdemMode(options = {}) {
        const { nextMode = null, skipOverlayClose = false } = options;
        if (!state.vdemEnabled) {
            if (!skipOverlayClose) {
                closeOverlay();
            }
            return;
        }
        setState('vdemEnabled', false);
        vdemBtn.classList.remove('active');
        if (!skipOverlayClose) {
            closeOverlay();
        }
        const baseColorSelector = document.getElementById('base-color-selector');
        const theoryButton = document.getElementById('theory-button');
        if (!state.wgiEnabled && nextMode !== 'wgi') {
            if (baseColorSelector) baseColorSelector.style.display = 'flex';
            if (theoryButton) theoryButton.style.display = 'flex';
        }
        if (vdemControls) vdemControls.style.display = 'none';
        if (sliderContainer) sliderContainer.style.display = 'none';
        if (legend) legend.style.display = 'none';
        if (datasetHeader) {
            datasetHeader.classList.remove('dataset-mode-vdem');
            if (!state.wgiEnabled && nextMode !== 'wgi') {
                datasetHeader.classList.remove('dataset-active');
            }
        }
        import('../../core/globe-handlers.js').then(module => {
            module.setupGlobeEventHandlers();
        });
        toggleFlatMap(false);
    }
    
    function configureYearSlider() {
        const years = state.vdemYears;
        const slider = document.getElementById('vdem-year-slider');
        const label = document.getElementById('vdem-year-label');
        if (!slider || !label || !years || years.length === 0) return;
        slider.min = Math.min(...years);
        slider.max = Math.max(...years);
        const current = state.currentVdemYear || slider.max;
        slider.value = current;
        label.textContent = current;
        setState('currentVdemYear', current);
    }
    
    function updateBreadcrumbDisplay() {
        const el = document.getElementById('vdem-selected-path');
        if (!el) return;
        const crumbs = state.currentVdemBreadcrumbs || [];
        if (!crumbs.length || !state.currentVdemIndicator) {
            el.textContent = 'Mind map üzerinden seçin';
            el.title = '';
            return;
        }
        const pathText = crumbs.join(' › ');
        el.textContent = pathText;
        el.title = pathText;
    }
    
    function updateLegend() {
        const gradient = document.getElementById('vdem-gradient');
        if (!gradient || !state.currentVdemIndicator) return;
        const info = getVdemGradientStops(state.currentVdemIndicator);
        gradient.innerHTML = info.stops.map(stop => `<stop offset="${stop.offset}%" stop-color="${stop.color}"/>`).join('');
        const minEl = document.getElementById('vdem-legend-min');
        const midEl = document.getElementById('vdem-legend-mid');
        const maxEl = document.getElementById('vdem-legend-max');
        if (minEl) minEl.textContent = formatValue(info.min);
        if (midEl) midEl.textContent = formatValue(info.mid);
        if (maxEl) maxEl.textContent = formatValue(info.max);
    }
    
    function formatValue(value) {
        if (value === undefined || value === null) return '--';
        if (Math.abs(value) >= 1000) return value.toFixed(0);
        if (Math.abs(value) >= 100) return value.toFixed(1);
        return value.toFixed(2);
    }
    
    function updateVdemVisualization() {
        if (!state.vdemEnabled || !state.globe) return;
        setupGlobePolygons(
            getVdemPolygonColor,
            (p) => getPolygonLabelHtml(p),
            () => {},
            handlePolygonClick,
            getVdemPolygonStrokeColor
        );
        if (state.flatMapInitialized) {
            import('../../core/flatmap.js').then(module => {
                module.updateFlatMap();
            });
        }
        updateBreadcrumbDisplay();
        updateLegend();
    }
    
    function handlePolygonClick(polygon) {
        if (!polygon) return;
        openPanelFromPolygon(polygon);
    }
    
    function openPanelFromPolygon(polygon) {
        const countryName = polygon.properties.NAME || polygon.properties.ADMIN || 'Bilinmeyen Ülke';
        const countryCode = polygon.properties.ISO_A2 || 'XX';
        openCountryPanel(countryName, countryCode);
        const blurOverlay = document.getElementById('blur-overlay');
        if (blurOverlay) blurOverlay.classList.add('active');
        if (state.globe) {
            const { lat, lng } = getPolygonCenter(polygon);
            focusOnLocation(lat, lng, 1.5, ANIMATION_DURATIONS.cameraMove);
            resumeAutoRotate(ANIMATION_DURATIONS.autoRotateDelay);
        }
    }
    
    // Expose functions for other modules if needed
    window.vdemControls = {
        disable: (opts = {}) => disableVdemMode(opts),
        update: updateVdemVisualization
    };
}
