/**
 * Dar Koridor Veri Yükleyici - ATLAS İnteraktif
 */

import { state, setState } from '../../core/state.js';
import { DATA_PATHS } from '../../config/constants.js';

/**
 * Dar Koridor verilerini yükler (faktör analizi sonuçları)
 */
export async function loadDarKoridorData() {
    try {
        // Yıllara göre organize edilmiş veri
        const responseByYear = await fetch(DATA_PATHS.darKoridorAllYears);
        if (!responseByYear.ok) {
            throw new Error('Dar Koridor verileri (yıllara göre) yüklenemedi');
        }
        const darKoridorByYear = await responseByYear.json();
        setState('darKoridorByYear', darKoridorByYear);
        
        // Ülkelere göre organize edilmiş veri
        const responseByCountry = await fetch(DATA_PATHS.darKoridorByCountry);
        if (!responseByCountry.ok) {
            throw new Error('Dar Koridor verileri (ülkelere göre) yüklenemedi');
        }
        const darKoridorByCountry = await responseByCountry.json();
        setState('darKoridorByCountry', darKoridorByCountry);
        
        // Varsayılan olarak 2023 yılı için darKoridorData'yı oluştur
        updateDarKoridorDataForYear(2023);
        
        const yearCount = Object.keys(darKoridorByYear).length;
        const countryCount = Object.keys(darKoridorByCountry).length;
        console.log(`✓ Dar Koridor verileri yüklendi (v2.1)`);
        console.log(`  Yıl aralığı: ${yearCount} yıl (1996-2023)`);
        console.log(`  Ülke sayısı: ${countryCount} ülke`);
        
    } catch (error) {
        console.warn('Dar Koridor verileri yüklenemedi:', error);
        setState('darKoridorData', null);
        setState('darKoridorByYear', null);
        setState('darKoridorByCountry', null);
    }
}

/**
 * Belirli bir yıl için darKoridorData'yı günceller (mode'a göre)
 */
export function updateDarKoridorDataForYear(year, mode = null) {
    // Mode belirtilmemişse state'den al
    const corridorMode = mode || state.corridorMode || 'modern';

    // Mode'a göre doğru veri kaynağını seç
    const darKoridorByYear = corridorMode === 'historical'
        ? state.darKoridorHistoricalByYear
        : state.darKoridorByYear;

    if (!darKoridorByYear) return;

    const yearStr = String(year);
    if (!darKoridorByYear[yearStr]) {
        console.warn(`⚠ ${year} yılı için veri bulunamadı (${corridorMode} mode)`);
        return;
    }

    // darKoridorData formatını oluştur
    const darKoridorData = {
        countries: darKoridorByYear[yearStr].map(country => ({
            name: country.country,
            statePower: country.statePower,
            societyPower: country.societyPower,
            leviathanType: country.leviathanType,
            cluster: country.cluster
        }))
    };

    setState('darKoridorData', darKoridorData);
    setState('selectedYear', year);

    console.log(`✓ ${year} yılı verileri yüklendi: ${darKoridorData.countries.length} ülke (${corridorMode} mode)`);
}

/**
 * Historical Dar Koridor verilerini yükler (1995'e kadar geri giden veriler)
 */
export async function loadHistoricalCorridorData() {
    try {
        // Yıllara göre organize edilmiş historical veri
        const responseByYear = await fetch(DATA_PATHS.darKoridorHistoricalAllYears);
        if (!responseByYear.ok) {
            throw new Error('Historical Dar Koridor verileri (yıllara göre) yüklenemedi');
        }
        const historicalByYear = await responseByYear.json();
        setState('darKoridorHistoricalByYear', historicalByYear);

        // Ülkelere göre organize edilmiş historical veri
        const responseByCountry = await fetch(DATA_PATHS.darKoridorHistoricalByCountry);
        if (!responseByCountry.ok) {
            throw new Error('Historical Dar Koridor verileri (ülkelere göre) yüklenemedi');
        }
        const historicalByCountry = await responseByCountry.json();
        setState('darKoridorHistoricalByCountry', historicalByCountry);

        const yearCount = Object.keys(historicalByYear).length;
        const countryCount = Object.keys(historicalByCountry).length;
        console.log(`✓ Historical Dar Koridor verileri yüklendi`);
        console.log(`  Yıl aralığı: ${yearCount} yıl (1789-2023)`);
        console.log(`  Ülke sayısı: ${countryCount} ülke`);

        return true;
    } catch (error) {
        console.warn('Historical Dar Koridor verileri yüklenemedi:', error);
        setState('darKoridorHistoricalByYear', null);
        setState('darKoridorHistoricalByCountry', null);
        return false;
    }
}

