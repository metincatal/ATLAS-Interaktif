/**
 * Renk Yardımcı Fonksiyonları - ATLAS İnteraktif
 */

import { HOVER_COLOR, SELECTED_COLOR } from '../config/constants.js';

/**
 * Ana sayfa rengi hover/selected ile çakışmasın diye ayarlar
 */
export function ensureDistinctBaseColor(hexColor) {
    const hover = d3.color(HOVER_COLOR);
    const selected = d3.color(SELECTED_COLOR);
    let base = d3.hsl(hexColor);
    const minLightDiff = 0.18;
    const minSatDiff = 0.15;
    
    function tooClose(a, b) {
        const ah = d3.hsl(a);
        const bh = d3.hsl(b);
        return (Math.abs(ah.l - bh.l) < minLightDiff) && (Math.abs(ah.s - bh.s) < minSatDiff);
    }
    
    let iterations = 0;
    while ((tooClose(base, hover) || tooClose(base, selected)) && iterations < 10) {
        base.l = Math.min(0.9, base.l + 0.08);
        base.s = Math.max(0.2, base.s - 0.05);
        iterations++;
    }
    return base.formatHex();
}

