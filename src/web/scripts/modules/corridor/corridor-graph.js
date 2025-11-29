/**
 * Dar Koridor Grafik Yönetimi - ATLAS İnteraktif
 * Ülke pozisyonlarını grafik üzerinde gösterme
 */

import { state } from '../../core/state.js';
import { getCountryDataForYear } from '../../utils/data-helpers.js';
import { calculateCorridorPosition, updateDotPosition } from '../../utils/geometry.js';
import { LEVIATHAN_TYPES, LEVIATHAN_TYPES_SHORT } from '../../config/constants.js';

/**
 * Ülke için grafik pozisyonunu günceller
 */
export function updateCountryCorridorPosition(countryName, year) {
    const graphic = document.getElementById('corridor-graphic-main');
    const img = graphic?.querySelector('img');
    const dot = document.getElementById('country-position-dot');
    const infoBar = document.getElementById('corridor-info-bar');

    if (!graphic || !img || !dot || !infoBar) {
        console.warn('Corridor grafik elementleri bulunamadı');
        return;
    }

    // Ülke verisini al (mevcut mode'a göre)
    const countryData = getCountryDataForYear(countryName, year, state.corridorMode);
    
    if (!countryData) {
        console.warn(`${countryName} için ${year} yılı verisi bulunamadı`);
        // Veri yoksa gizle
        dot.style.display = 'none';
        updateInfoBar(null);
        return;
    }
    
    // Pozisyonu hesapla
    const { x, y } = calculateCorridorPosition(
        countryData.statePower,
        countryData.societyPower
    );
    
    // Dot'u güncelle
    dot.style.display = 'block';
    updateDotPosition(graphic, img, dot, x, y);
    
    // Leviathan tipine göre renk
    const levType = countryData.leviathanType || 'Absent';
    dot.className = 'position-dot ' + levType.toLowerCase();
    
    // Bilgi çubuğunu güncelle
    updateInfoBar(countryData);
    
    console.log(`✓ ${countryName} grafik pozisyonu güncellendi:`, { x, y, type: levType });
}

/**
 * Bilgi çubuğunu günceller
 */
function updateInfoBar(countryData) {
    const statePowerEl = document.querySelector('#corridor-info-bar .state-power');
    const societyPowerEl = document.querySelector('#corridor-info-bar .society-power');
    const leviathanTypeEl = document.querySelector('#corridor-info-bar .leviathan-type');
    
    if (!statePowerEl || !societyPowerEl || !leviathanTypeEl) return;
    
    if (!countryData) {
        statePowerEl.textContent = '--';
        societyPowerEl.textContent = '--';
        leviathanTypeEl.textContent = '--';
        return;
    }
    
    // Değerleri göster
    statePowerEl.textContent = countryData.statePower.toFixed(2);
    societyPowerEl.textContent = countryData.societyPower.toFixed(2);
    
    // Leviathan tipini Türkçe göster
    const levType = countryData.leviathanType || 'Absent';
    const levTypeText = LEVIATHAN_TYPES_SHORT[levType] || levType;
    leviathanTypeEl.textContent = levTypeText;
    
    // Renk ekle
    leviathanTypeEl.style.color = getTypeColor(levType);
}

/**
 * Leviathan tipine göre renk döndürür
 */
function getTypeColor(type) {
    const colors = {
        'Shackled': '#2ecc71',
        'Despotic': '#e74c3c',
        'Paper': '#f39c12',
        'Absent': '#9b59b6'
    };
    return colors[type] || '#666';
}

/**
 * Yıl slider'ını kurar - SADECE MEVCUT YILLAR
 */
export function setupCorridorYearSlider(countryName, availableYears, targetYear = null) {
    const yearInput = document.getElementById('corridor-year-input');
    const yearLabel = document.getElementById('corridor-year-label');

    if (!yearInput || !yearLabel) return;

    if (availableYears.length === 0) {
        console.warn('Ülke için yıl verisi yok');
        return;
    }

    // Yılları sırala (küçükten büyüğe)
    const sortedYears = [...availableYears].sort((a, b) => a - b);

    // Slider'ı index bazlı yap (0, 1, 2, ...)
    const minIndex = 0;
    const maxIndex = sortedYears.length - 1;

    yearInput.min = minIndex;
    yearInput.max = maxIndex;
    yearInput.step = 1;

    // Hedef yılı bul veya son yılı kullan
    let initialIndex = maxIndex;
    let initialYear = sortedYears[maxIndex];

    if (targetYear !== null) {
        // targetYear'a en yakın yılı bul
        const targetIndex = sortedYears.indexOf(targetYear);
        if (targetIndex !== -1) {
            initialIndex = targetIndex;
            initialYear = targetYear;
        } else {
            // Tam eşleşme yoksa en yakın yılı bul
            initialIndex = sortedYears.findIndex(y => y >= targetYear);
            if (initialIndex === -1) initialIndex = maxIndex;
            initialYear = sortedYears[initialIndex];
        }
    }

    yearInput.value = initialIndex;
    yearLabel.textContent = initialYear;

    // Eski event listener'ı kaldır ve yeni ekle (duplicate önleme)
    const newInput = yearInput.cloneNode(true);
    yearInput.parentNode.replaceChild(newInput, yearInput);

    // Yeni input elementine event listener ekle
    const updatedInput = document.getElementById('corridor-year-input');
    updatedInput.addEventListener('input', (e) => {
        const index = parseInt(e.target.value);
        const selectedYear = sortedYears[index];

        if (selectedYear) {
            yearLabel.textContent = selectedYear;

            // State'e seçili yılı kaydet (interactive map için)
            import('../../core/state.js').then(({ setState }) => {
                setState('selectedYear', selectedYear);
            });

            // Grafik pozisyonunu güncelle
            updateCountryCorridorPosition(countryName, selectedYear);

            // Eğer interactive map aktifse, tüm ülkeleri de güncelle
            if (state.interactiveMapActive) {
                updateInteractiveMapYear(selectedYear);
            }
        }
    });

    console.log(`✓ Corridor year slider kuruldu: ${sortedYears.length} yıl (${sortedYears[0]}-${sortedYears[sortedYears.length-1]})`);
}

/**
 * Interactive map için yıl güncellemesi
 */
function updateInteractiveMapYear(year) {
    // darKoridorData'yı mevcut mode'a göre güncelle (tüm ülkeler için)
    import('./corridor-data.js').then(({ updateDarKoridorDataForYear }) => {
        updateDarKoridorDataForYear(year, state.corridorMode);
    });

    // Interactive map modülüne yıl değişikliğini bildir
    const event = new CustomEvent('corridorYearChanged', { detail: { year } });
    document.dispatchEvent(event);

    console.log(`📊 Interactive map yıl güncellendi: ${year}`);
}

