/**
 * Global State Yönetimi - ATLAS İnteraktif
 * Uygulama genelinde paylaşılan state
 */

import { COUNTRY_COLOR } from '../config/constants.js';

// Global State
export const state = {
    // Globe
    globe: null,
    globeInitialized: false,  // Globe başlatıldı mı?
    autoRotate: true,
    countriesData: null,
    
    // WGI
    wgiEnabled: false,
    wgiDataByIso3: {},
    wgiYears: [],
    currentIndicator: 'cc',
    currentYear: null,
    currentWgiScheme: 'Turbo',
    currentWgiReverse: false,
    selectedLegendRange: null,
    wgiListenersBound: false,
    pendingCountryFocus: null,

    // V-Dem
    vdemEnabled: false,
    vdemOverlayOpen: false,
    vdemMindmapData: null,
    vdemMindmapRendered: false,
    vdemDataByIndicator: {},
    vdemIndicatorsMeta: {},
    vdemYears: [],
    currentVdemIndicator: null,
    currentVdemYear: null,
    currentVdemScheme: 'Turbo',
    currentVdemReverse: false,
    currentVdemBreadcrumbs: [],
    vdemListenersBound: false,
    
    // Flat Map
    flatMapInitialized: false,
    flatSvg: null,
    flatProjection: null,
    flatPath: null,
    flatTopPadding: 0,
    
    // Renk ayarları
    currentCountryColor: COUNTRY_COLOR,
    
    // Dar Koridor
    darKoridorData: null,
    darKoridorByYear: null,
    darKoridorByCountry: null,
    selectedYear: 2023,
    currentCountryName: null,
    currentCountryAvailableYears: [],
    
    // Panel ve Chat
    conversationHistory: [],
    
    // Koridor İnteraktif Harita
    interactiveMapActive: false,
    interactiveMapSetup: false,
    selectedCorridorFilter: 'all'
};

// State getter ve setter fonksiyonları
export function getState(key) {
    return state[key];
}

export function setState(key, value) {
    state[key] = value;
}

export function updateState(updates) {
    Object.keys(updates).forEach(key => {
        state[key] = updates[key];
    });
}

// State reset fonksiyonu (gerekirse)
export function resetState(keys) {
    if (Array.isArray(keys)) {
        keys.forEach(key => {
            if (key in state) {
                // Varsayılan değere dön
                if (key === 'currentCountryColor') state[key] = COUNTRY_COLOR;
                else if (typeof state[key] === 'boolean') state[key] = false;
                else if (typeof state[key] === 'number') state[key] = 0;
                else if (Array.isArray(state[key])) state[key] = [];
                else if (typeof state[key] === 'object') state[key] = null;
                else state[key] = null;
            }
        });
    }
}
