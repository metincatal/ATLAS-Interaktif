/**
 * Veri Yardımcı Fonksiyonları - ATLAS İnteraktif
 */

import { COUNTRY_NAME_MAP } from '../config/constants.js';
import { state } from '../core/state.js';

/**
 * Ülke için belirli bir yılın verilerini döndürür
 */
export function getCountryDataForYear(countryName, year) {
    if (!state.darKoridorByCountry) return null;
    
    // Ülke adı eşleştirmesi yap
    const mappedName = COUNTRY_NAME_MAP[countryName] || countryName;
    
    // Hem eşleştirilmiş adı hem de orijinal adı dene
    let countryYearData = state.darKoridorByCountry[mappedName];
    if (!countryYearData) {
        countryYearData = state.darKoridorByCountry[countryName];
    }
    
    if (!countryYearData) return null;
    
    // O yılın verisini bul
    const yearData = countryYearData.find(d => d.year === year);
    return yearData;
}

/**
 * Ülkenin mevcut olan yıllarını döndürür
 */
export function getAvailableYearsForCountry(countryName) {
    if (!state.darKoridorByCountry) return [];
    
    const mappedName = COUNTRY_NAME_MAP[countryName] || countryName;
    let countryYearData = state.darKoridorByCountry[mappedName] || state.darKoridorByCountry[countryName];
    
    if (!countryYearData || countryYearData.length === 0) return [];
    
    // Tüm yılları döndür (sıralı)
    return countryYearData.map(d => d.year).sort((a, b) => a - b);
}

/**
 * Ülkenin mevcut olan en son yılını bulur
 */
export function getLatestYearForCountry(countryName) {
    const years = getAvailableYearsForCountry(countryName);
    if (years.length === 0) return 2023;
    return years[years.length - 1];
}

/**
 * En yakın geçerli yıla yuvarlar (snap)
 */
export function snapToNearestAvailableYear(targetYear, availableYears) {
    if (availableYears.length === 0) return targetYear;
    
    // En yakın yılı bul
    let closest = availableYears[0];
    let minDiff = Math.abs(targetYear - closest);
    
    for (const year of availableYears) {
        const diff = Math.abs(targetYear - year);
        if (diff < minDiff) {
            minDiff = diff;
            closest = year;
        }
    }
    
    return closest;
}

/**
 * ISO3 kodunu polygon'dan alır
 */
export function getIso3(polygon) {
    const props = polygon.properties || {};
    return props.ISO_A3 || props.ADM0_A3 || props.ISO3 || null;
}

