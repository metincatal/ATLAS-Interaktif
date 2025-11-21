import { state, setState } from '../../core/state.js';
import { DATA_PATHS } from '../../config/constants.js';

let vdemDataPromise = null;

function sanitizeNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') {
        return Number.isNaN(value) ? null : value;
    }
    if (typeof value === 'string') {
        const normalized = value.replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}

function ensureIndicatorEntry(map, key) {
    if (!map[key]) {
        map[key] = {
            years: new Set(),
            values: {},
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY
        };
    }
    return map[key];
}

export async function loadVdemData() {
    if (state.vdemYears && state.vdemYears.length && Object.keys(state.vdemDataByIndicator).length) {
        return state.vdemDataByIndicator;
    }

    if (!vdemDataPromise) {
        vdemDataPromise = fetchVdem();
    }

    return vdemDataPromise;
}

async function fetchVdem() {
    try {
        console.log('📚 V-Dem veri kümesi yükleniyor...');
        const response = await fetch(DATA_PATHS.vdemDataset);
        if (!response.ok) {
            throw new Error('V-Dem veri dosyası yüklenemedi');
        }
        const data = await response.json();

        const indicators = {};
        const allYears = new Set();

        // Transform data to match application state structure
        Object.entries(data).forEach(([key, info]) => {
            const years = Object.keys(info.values).map(y => parseInt(y, 10));
            years.forEach(y => allYears.add(y));

            indicators[key] = {
                years: new Set(years),
                values: info.values,
                min: info.min,
                max: info.max
            };
        });

        const sortedYears = Array.from(allYears).sort((a, b) => a - b);

        // Set state values
        setState('vdemDataByIndicator', indicators);

        // Create meta info for easy access
        const indicatorMeta = {};
        Object.entries(indicators).forEach(([key, info]) => {
            indicatorMeta[key] = {
                years: Array.from(info.years).sort((a, b) => a - b),
                min: info.min,
                max: info.max
            };
        });

        setState('vdemIndicatorsMeta', indicatorMeta);
        setState('vdemYears', sortedYears);

        if (!state.currentVdemYear && sortedYears.length) {
            setState('currentVdemYear', sortedYears[sortedYears.length - 1]);
        }

        console.log(`✓ V-Dem verileri hazır (${Object.keys(indicators).length} gösterge, ${sortedYears[0]}-${sortedYears[sortedYears.length - 1]})`);
        return indicators;
    } catch (error) {
        console.error('V-Dem veri yükleme hatası:', error);
        setState('vdemDataByIndicator', {});
        setState('vdemIndicatorsMeta', {});
        setState('vdemYears', []);
        throw error;
    }
}

export function getVdemValue(iso3, indicatorId, year) {
    if (!iso3 || !indicatorId || !year) return null;
    const indicators = state.vdemDataByIndicator;
    if (!indicators[indicatorId]) return null;
    const yearData = indicators[indicatorId].values[String(year)];
    if (!yearData) return null;
    const value = yearData[iso3];
    return (value === null || value === undefined || Number.isNaN(value)) ? null : value;
}

export function getVdemMeta(indicatorId) {
    return state.vdemIndicatorsMeta[indicatorId] || null;
}
