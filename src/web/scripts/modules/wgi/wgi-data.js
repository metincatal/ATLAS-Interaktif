/**
 * WGI Veri Yükleyici - ATLAS İnteraktif
 * Worldwide Governance Indicators verilerini yükler
 */

import { state, setState } from '../../core/state.js';
import { DATA_PATHS } from '../../config/constants.js';

/**
 * WGI verilerini yükler
 */
export async function loadWgiData() {
    try {
        console.log('📊 WGI verileri yükleniyor...');
        
        const response = await fetch(DATA_PATHS.wgiDataset);
        if (!response.ok) {
            throw new Error('WGI verileri yüklenemedi');
        }
        
        const csvText = await response.text();
        
        // PapaParse ile CSV'yi parse et (global olarak yüklenmiş)
        // Delimiter'ı otomatik algıla (; veya ,)
        const firstLine = csvText.split('\n')[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        
        console.log(`📊 CSV delimiter algılandı: "${delimiter}"`);
        
        const parsed = window.Papa ? window.Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            delimiter: delimiter,
            dynamicTyping: false  // Manuel parse edeceğiz (virgül ondalık ayracı)
        }) : { data: [] };
        
        if (!parsed.data || parsed.data.length === 0) {
            console.error('❌ CSV parse edilemedi veya veri yok');
            throw new Error('CSV parse hatası');
        }
        
        console.log(`📊 CSV satır sayısı: ${parsed.data.length}`);
        
        const wgiData = parsed.data;
        
        // Veriyi organize et: { indicator: { year: { ISO3: value } } }
        const wgiDataByIso3 = {};
        const indicators = ['va', 'pv', 'ge', 'rq', 'rl', 'cc'];
        const years = new Set();
        
        indicators.forEach(ind => {
            wgiDataByIso3[ind] = {};
        });
        
        let processedCount = 0;
        let skippedCount = 0;
        
        wgiData.forEach((row, index) => {
            // CSV formatı: code;countryname;year;indicator;estimate
            // Sütun isimlerini farklı varyasyonlarda dene
            const iso3 = row['code'] || row['Code'] || row['CODE'] || row['Code'] || row['countrycode'];
            const year = row['year'] || row['Year'] || row['YEAR'] || row['Year'];
            const indicator = row['indicator'] || row['Indicator'] || row['INDICATOR'] || row['Indicator'];
            let estimate = row['estimate'] || row['Estimate'] || row['ESTIMATE'] || row['Estimate'];
            
            // İlk satırı debug için göster
            if (index === 0) {
                console.log('📊 İlk CSV satırı:', Object.keys(row));
                console.log('📊 İlk satır değerleri:', { iso3, year, indicator, estimate });
            }
            
            // Veri kontrolü
            if (!iso3 || !year || !indicator || !estimate) {
                skippedCount++;
                return;
            }
            if (iso3 === '..' || estimate === '..' || estimate === '' || estimate === null || estimate === undefined) {
                skippedCount++;
                return;
            }
            
            // Virgülü noktaya çevir (Türkçe format: -1,29 -> -1.29)
            if (typeof estimate === 'string') {
                estimate = estimate.replace(',', '.');
            }
            
            const numValue = parseFloat(estimate);
            if (isNaN(numValue)) return;
            
            // Indicator'ı kontrol et
            if (!indicators.includes(indicator.toLowerCase())) return;
            
            const ind = indicator.toLowerCase();
            const yearStr = String(year);
            
            // Veriyi kaydet
            if (!wgiDataByIso3[ind][yearStr]) {
                wgiDataByIso3[ind][yearStr] = {};
            }
            wgiDataByIso3[ind][yearStr][iso3] = numValue;
            years.add(parseInt(year));
            processedCount++;
        });
        
        console.log(`📊 İşlenen satır: ${processedCount}, Atlanan satır: ${skippedCount}`);
        
        // Yılları sırala
        const sortedYears = Array.from(years).sort((a, b) => a - b);
        
        setState('wgiDataByIso3', wgiDataByIso3);
        setState('wgiYears', sortedYears);
        setState('currentYear', sortedYears[sortedYears.length - 1]); // En son yıl
        
        // Debug: İlk birkaç ülke verisini göster
        const sampleYear = sortedYears[sortedYears.length - 1];
        const sampleInd = 'cc';
        if (wgiDataByIso3[sampleInd] && wgiDataByIso3[sampleInd][String(sampleYear)]) {
            const sampleData = wgiDataByIso3[sampleInd][String(sampleYear)];
            const sampleCountries = Object.keys(sampleData).slice(0, 5);
            console.log(`✓ WGI verileri yüklendi: ${sortedYears.length} yıl (${sortedYears[0]}-${sortedYears[sortedYears.length-1]})`);
            console.log(`  Göstergeler: ${indicators.length} (${indicators.join(', ')})`);
            console.log(`  Örnek veriler (${sampleYear}, ${sampleInd}):`, sampleCountries.map(iso => `${iso}: ${sampleData[iso]}`));
        } else {
            console.warn('⚠️ WGI veri yapısı beklenen formatta değil');
        }
        
        return wgiDataByIso3;
        
    } catch (error) {
        console.error('WGI veri yükleme hatası:', error);
        setState('wgiDataByIso3', {});
        setState('wgiYears', []);
        throw error;
    }
}

/**
 * Belirli bir ülke ve yıl için WGI değerini döndürür
 */
export function getWgiValue(iso3, indicator, year) {
    if (!iso3 || !indicator || !year) return null;
    
    const wgiData = state.wgiDataByIso3;
    if (!wgiData || !wgiData[indicator]) {
        return null;
    }
    
    const yearStr = String(year);
    if (!wgiData[indicator][yearStr]) {
        return null;
    }
    
    const value = wgiData[indicator][yearStr][iso3];
    
    // Değer varsa döndür
    if (value !== null && value !== undefined && !isNaN(value)) {
        return value;
    }
    
    return null;
}

