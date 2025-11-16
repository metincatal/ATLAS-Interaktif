/**
 * Polygon Label'ları - ATLAS İnteraktif
 * Globe ve flatmap için tooltip HTML'leri
 */

import { state } from './state.js';
import { WGI_INDICATORS } from '../config/constants.js';
import { getIso3 } from '../utils/data-helpers.js';
import { getWgiValue } from '../modules/wgi/wgi-data.js';

/**
 * Poligon için HTML label döndürür
 */
export function getPolygonLabelHtml(polygon) {
    const d = polygon.properties || {};
    const countryName = d.NAME || d.ADMIN || 'Bilinmeyen Ülke';
    
    if (!state.wgiEnabled) {
        return `
            <div style="background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px;">
                <b>${countryName}</b>
            </div>
        `;
    }
    
    const iso3 = getIso3(polygon);
    
    // WGI değerini al
    const v = getWgiValue(iso3, state.currentIndicator, state.currentYear);
    
    const valueStr = (v === null || v === undefined || isNaN(v)) ? 'Veri yok' : v.toFixed(2);
    const indName = WGI_INDICATORS[state.currentIndicator] || state.currentIndicator.toUpperCase();
    const year = state.currentYear || 'N/A';
    
    return `
        <div style="background: rgba(0,0,0,0.85); padding: 10px; border-radius: 5px; min-width: 160px;">
            <div style="font-weight:700; margin-bottom:4px;">${countryName}</div>
            <div style="font-size: 0.9rem; opacity: 0.95;">${indName} (${year}): <b>${valueStr}</b></div>
            ${iso3 ? `<div style="font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">ISO3: ${iso3}</div>` : ''}
        </div>
    `;
}

