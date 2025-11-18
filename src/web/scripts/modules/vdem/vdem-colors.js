import { state } from '../../core/state.js';
import { getIso3 } from '../../utils/data-helpers.js';
import { getVdemValue, getVdemMeta } from './vdem-data.js';

const d3 = window.d3;

const schemeMap = {
    Turbo: d3?.interpolateTurbo,
    Viridis: d3?.interpolateViridis,
    Plasma: d3?.interpolatePlasma,
    Magma: d3?.interpolateMagma,
    Warm: d3?.interpolateWarm,
    Cool: d3?.interpolateCool,
    Cividis: d3?.interpolateCividis
};

const NODATA_COLOR = 'rgba(120, 136, 164, 0.8)';
const DEFAULT_STROKE = 'rgba(255,255,255,0.85)';

function getRangeMeta(indicatorId) {
    const meta = getVdemMeta(indicatorId);
    if (!meta) {
        return { min: 0, max: 1 };
    }
    if (meta.min === meta.max) {
        return { min: meta.min - 0.5, max: meta.max + 0.5 };
    }
    return { min: meta.min, max: meta.max };
}

function getColorScale(indicatorId) {
    const { min, max } = getRangeMeta(indicatorId);
    const schemeId = state.currentVdemScheme || 'Turbo';
    const interpolator = schemeMap[schemeId] || d3?.interpolateTurbo;
    if (!interpolator) return null;
    
    const scale = d3.scaleSequential(interpolator);
    const domain = state.currentVdemReverse ? [max, min] : [min, max];
    scale.domain(domain);
    return scale;
}

export function getVdemColorForValue(indicatorId, value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return NODATA_COLOR;
    }
    const scale = getColorScale(indicatorId);
    if (!scale) return NODATA_COLOR;
    return scale(value);
}

export function getVdemPolygonColor(polygon) {
    if (!state.vdemEnabled) return state.currentCountryColor;
    const iso3 = getIso3(polygon);
    if (!iso3) return NODATA_COLOR;
    const value = getVdemValue(iso3, state.currentVdemIndicator, state.currentVdemYear);
    return getVdemColorForValue(state.currentVdemIndicator, value);
}

export function getVdemPolygonStrokeColor(polygon) {
    if (!state.vdemEnabled) return DEFAULT_STROKE;
    const iso3 = getIso3(polygon);
    const value = getVdemValue(iso3, state.currentVdemIndicator, state.currentVdemYear);
    if (value === null || value === undefined || Number.isNaN(value)) {
        return 'rgba(255,255,255,0.3)';
    }
    return '#060f30';
}

export function getVdemFlatFill(polygon) {
    if (!state.vdemEnabled) {
        return state.currentCountryColor;
    }
    const iso3 = getIso3(polygon);
    const value = getVdemValue(iso3, state.currentVdemIndicator, state.currentVdemYear);
    if (value === null || value === undefined || Number.isNaN(value)) {
        return 'url(#vdem-nodata-pattern)';
    }
    return getVdemColorForValue(state.currentVdemIndicator, value);
}

export function getVdemGradientStops(indicatorId) {
    const { min, max } = getRangeMeta(indicatorId);
    const stops = [];
    const scale = getColorScale(indicatorId);
    if (!scale) return stops;
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const value = min + (max - min) * t;
        stops.push({
            offset: t * 100,
            color: scale(value)
        });
    }
    return { stops, min, max, mid: (min + max) / 2 };
}
