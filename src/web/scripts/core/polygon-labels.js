/**
 * Polygon Label'ları - ATLAS İnteraktif
 * Globe ve flatmap için tooltip HTML'leri
 */

import { state } from './state.js';
import { WGI_INDICATORS } from '../config/constants.js';
import { getIso3 } from '../utils/data-helpers.js';
import { getWgiValue } from '../modules/wgi/wgi-data.js';
import { getVdemValue } from '../modules/vdem/vdem-data.js';

/**
 * Poligon için HTML label döndürür
 */
export function getPolygonLabelHtml(polygon) {
    const d = polygon.properties || {};
    const countryName = d.NAME || d.ADMIN || 'Bilinmeyen Ülke';
    
    if (!state.wgiEnabled && !state.vdemEnabled) {
        return `
            <div style="background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px;">
                <b>${countryName}</b>
            </div>
        `;
    }
    
    const iso3 = getIso3(polygon);
    
    if (state.wgiEnabled) {
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
    
    const vdemValue = getVdemValue(iso3, state.currentVdemIndicator, state.currentVdemYear);
    const vdemStr = (vdemValue === null || vdemValue === undefined || isNaN(vdemValue)) ? 'Veri yok' : vdemValue.toFixed(3);
    const crumb = state.currentVdemBreadcrumbs?.length
        ? state.currentVdemBreadcrumbs[state.currentVdemBreadcrumbs.length - 1]
        : state.currentVdemIndicator;
    const vdemYear = state.currentVdemYear || 'N/A';
    
    return `
        <div style="background: rgba(4,8,18,0.85); padding: 10px; border-radius: 5px; min-width: 180px;">
            <div style="font-weight:700; margin-bottom:4px;">${countryName}</div>
            <div style="font-size: 0.85rem; opacity: 0.9;">${crumb} (${vdemYear})</div>
            <div style="font-size: 1rem; font-weight:700; margin-top:4px;">${vdemStr}</div>
            ${iso3 ? `<div style="font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">ISO3: ${iso3}</div>` : ''}
        </div>
    `;
}
