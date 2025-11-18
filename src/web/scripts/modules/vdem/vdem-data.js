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
            throw new Error('V-Dem CSV dosyası yüklenemedi');
        }
        const csvText = await response.text();
        const parsed = window.Papa ? window.Papa.parse(csvText, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: true
        }) : { data: [], meta: { fields: [] } };
        
        const rows = parsed.data || [];
        const fields = parsed.meta?.fields || [];
        const indicatorColumns = fields.filter(col => !['country_name', 'country_text_id', 'year', 'project', 'historical_date'].includes(col));
        
        const indicators = {};
        const yearSet = new Set();
        
        rows.forEach((row, idx) => {
            const iso3 = (row.country_text_id || row.country_id || '').trim();
            const yearVal = parseInt(row.year, 10);
            if (!iso3 || Number.isNaN(yearVal)) {
                return;
            }
            const yearKey = String(yearVal);
            yearSet.add(yearVal);
            
            indicatorColumns.forEach((col) => {
                const meta = ensureIndicatorEntry(indicators, col);
                meta.years.add(yearVal);
                if (!meta.values[yearKey]) {
                    meta.values[yearKey] = {};
                }
                const raw = row[col];
                const value = sanitizeNumber(raw);
                meta.values[yearKey][iso3] = value;
                if (value !== null) {
                    if (value < meta.min) meta.min = value;
                    if (value > meta.max) meta.max = value;
                }
            });
            
            if (idx === 0) {
                console.log('📚 V-Dem örnek satır:', { iso3, year: yearVal });
            }
        });
        
        // Set state values
        const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
        const indicatorMeta = {};
        Object.entries(indicators).forEach(([key, info]) => {
            indicatorMeta[key] = {
                years: Array.from(info.years).sort((a, b) => a - b),
                min: info.min === Number.POSITIVE_INFINITY ? 0 : info.min,
                max: info.max === Number.NEGATIVE_INFINITY ? 1 : info.max
            };
            info.years = indicatorMeta[key].years;
            if (!Number.isFinite(info.min)) info.min = 0;
            if (!Number.isFinite(info.max)) info.max = 1;
        });
        
        setState('vdemDataByIndicator', indicators);
        setState('vdemIndicatorsMeta', indicatorMeta);
        setState('vdemYears', sortedYears);
        if (!state.currentVdemYear && sortedYears.length) {
            setState('currentVdemYear', sortedYears[sortedYears.length - 1]);
        }
        
        console.log(`✓ V-Dem verileri hazır (${rows.length} satır, ${indicatorColumns.length} gösterge, ${sortedYears[0]}-${sortedYears[sortedYears.length-1]})`);
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
