/**
 * Temel Renk Seçici - ATLAS İnteraktif
 * Ana sayfa ülke rengi seçici
 */

import { state, setState } from './state.js';
import { ensureDistinctBaseColor } from '../utils/color-utils.js';

/**
 * Ana sayfa renk seçiciyi kur
 */
export function setupBaseColorSelector() {
    const baseColorSelect = document.getElementById('base-color-select');
    if (!baseColorSelect) return;
    
    baseColorSelect.addEventListener('change', () => {
        const picked = baseColorSelect.value;
        const adjusted = ensureDistinctBaseColor(picked);
        setState('currentCountryColor', adjusted);
        
        // WGI aktif değilse globe'u güncelle
        if (!state.wgiEnabled && state.globe) {
            state.globe.polygonCapColor(() => state.currentCountryColor);
        }
        
        // 2D harita aktifse onu da güncelle
        if (!state.wgiEnabled && state.flatMapInitialized && state.flatSvg) {
            state.flatSvg.selectAll('path.country').attr('fill', state.currentCountryColor);
        }
    });
    
    console.log('✓ Renk seçici hazır');
}

