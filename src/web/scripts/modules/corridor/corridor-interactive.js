/**
 * Dar Koridor İnteraktif Harita - ATLAS İnteraktif
 * Tüm ülkeleri grafik üzerinde gösterme
 */

import { state, setState } from '../../core/state.js';
import { calculateCorridorPosition } from '../../utils/geometry.js';
import { LEVIATHAN_COLORS } from '../../config/constants.js';

/**
 * Toggle interactive map butonunu kurar
 */
export function setupToggleInteractiveMap() {
    const toggleBtn = document.getElementById('toggle-interactive-map');
    const controlsContainer = document.getElementById('interactive-map-controls');
    
    if (!toggleBtn || !controlsContainer) {
        console.warn('Interactive map elementleri bulunamadı');
        return;
    }
    
    toggleBtn.innerHTML = '<span>📊</span> Tüm Ülkeleri Göster';
    
    // Yıl değişikliğini dinle
    document.addEventListener('corridorYearChanged', (e) => {
        if (state.interactiveMapActive) {
            const newYear = e.detail.year;
            refreshInteractiveMapForYear(newYear);
        }
    });
    
    toggleBtn.addEventListener('click', () => {
        const isActive = state.interactiveMapActive;
        
        if (isActive) {
            // Kapat
            controlsContainer.style.display = 'none';
            toggleBtn.innerHTML = '<span>📊</span> Tüm Ülkeleri Göster';
            toggleBtn.classList.remove('active');
            setState('interactiveMapActive', false);
            
            // Tüm ülke noktalarını gizle
            hideAllCountryDots();
            
            console.log('Interactive map kapatıldı');
        } else {
            // Aç
            controlsContainer.style.display = 'block';
            toggleBtn.innerHTML = '<span>✕</span> Kapat';
            toggleBtn.classList.add('active');
            setState('interactiveMapActive', true);
            
            // Tüm ülke noktalarını göster
            showAllCountryDots();
            
            console.log('Interactive map açıldı');
        }
    });
    
    console.log('✓ Toggle interactive map hazır');
}

/**
 * Tüm ülke noktalarını gösterir
 */
function showAllCountryDots() {
    const graphic = document.getElementById('corridor-graphic-main');
    const img = graphic?.querySelector('img');
    const tooltip = document.getElementById('corridor-tooltip');
    
    if (!graphic || !img || !state.darKoridorData) {
        console.warn('Grafik veya veri bulunamadı');
        return;
    }
    
    // Önceki noktaları temizle
    const oldDots = graphic.querySelectorAll('.corridor-country-dot');
    oldDots.forEach(dot => dot.remove());
    
    // Her ülke için nokta oluştur
    const countries = state.darKoridorData.countries || [];
    
    countries.forEach((country, index) => {
        createCountryDot(graphic, img, country, tooltip);
    });
    
    // İstatistikleri göster
    showStatistics(countries);
    
    console.log(`✓ ${countries.length} ülke noktası eklendi`);
}

/**
 * Bir ülke için nokta oluşturur
 */
function createCountryDot(graphic, img, country, tooltip) {
    const dot = document.createElement('div');
    dot.className = 'corridor-country-dot visible';
    
    // Leviathan tipine göre renk
    const levType = country.leviathanType || 'Absent';
    dot.classList.add(levType.toLowerCase());
    dot.style.backgroundColor = LEVIATHAN_COLORS[levType] || '#999';
    
    // Pozisyonu hesapla
    let { x, y } = calculateCorridorPosition(
        country.statePower,
        country.societyPower
    );
    
    ({ x, y } = clampAlongDiagonal(x, y));
    
    // Pixel pozisyonu hesapla
    const computedStyle = window.getComputedStyle(graphic);
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    
    const imgRect = img.getBoundingClientRect();
    const imgWidth = imgRect.width;
    const imgHeight = imgRect.height;
    
    const dotLeft = paddingLeft + (imgWidth * x / 100);
    const dotTop = paddingTop + (imgHeight * y / 100);
    
    dot.style.left = `${dotLeft}px`;
    dot.style.top = `${dotTop}px`;
    
    // Hover event
    dot.addEventListener('mouseenter', (e) => {
        tooltip.style.display = 'block';
        const stateValue = country.statePower.toFixed(2);
        const societyValue = country.societyPower.toFixed(2);
        tooltip.innerHTML = `
            <div class="tooltip-country">${country.name}</div>
            <div class="tooltip-info">
                Devlet: <span class="tooltip-value state-power">${stateValue}</span><br>
                Toplum: <span class="tooltip-value society-power">${societyValue}</span><br>
                Tip: <span class="tooltip-value leviathan-type" style="color:${LEVIATHAN_COLORS[levType] || '#fff'}">${levType}</span>
            </div>
        `;
        updateTooltipPosition(e, tooltip);
    });
    
    dot.addEventListener('mousemove', (e) => {
        updateTooltipPosition(e, tooltip);
    });
    
    dot.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
    
    graphic.appendChild(dot);
}

/**
 * Tooltip pozisyonunu günceller
 */
function updateTooltipPosition(e, tooltip) {
    const graphic = document.getElementById('corridor-graphic-main');
    const rect = graphic.getBoundingClientRect();
    
    tooltip.style.left = `${e.clientX - rect.left + 15}px`;
    tooltip.style.top = `${e.clientY - rect.top - 10}px`;
}

function clampAlongDiagonal(x, y, margin = 3) {
    const min = margin;
    const max = 100 - margin;
    let newX = x;
    let newY = y;
    
    if (newY < min) {
        const delta = min - newY;
        newY = min;
        newX = Math.min(max, newX + delta);
    }
    
    if (newY > max) {
        const delta = newY - max;
        newY = max;
        newX = Math.max(min, newX - delta);
    }
    
    if (newX < min) {
        const delta = min - newX;
        newX = min;
        newY = Math.min(max, newY + delta);
    }
    
    if (newX > max) {
        const delta = newX - max;
        newX = max;
        newY = Math.max(min, newY - delta);
    }
    
    return { x: newX, y: newY };
}

/**
 * İstatistikleri gösterir
 */
function showStatistics(countries) {
    const statsContainer = document.getElementById('corridor-stats-filters');
    if (!statsContainer) return;
    
    // Tiplere göre say
    const counts = {
        all: countries.length,
        shackled: countries.filter(c => c.leviathanType === 'Shackled').length,
        despotic: countries.filter(c => c.leviathanType === 'Despotic').length,
        paper: countries.filter(c => c.leviathanType === 'Paper').length,
        absent: countries.filter(c => c.leviathanType === 'Absent').length
    };
    
    // HTML oluştur
    statsContainer.innerHTML = `
        <div class="stat-filter-btn" data-type="all">
            <div class="stat-count">${counts.all}</div>
            <div class="stat-label">Toplam</div>
            <div class="stat-percent">%100</div>
        </div>
        <div class="stat-filter-btn" data-type="shackled">
            <div class="stat-count">${counts.shackled}</div>
            <div class="stat-label">Zincirlenmiş</div>
            <div class="stat-percent">%${((counts.shackled/counts.all)*100).toFixed(0)}</div>
        </div>
        <div class="stat-filter-btn" data-type="despotic">
            <div class="stat-count">${counts.despotic}</div>
            <div class="stat-label">Despotik</div>
            <div class="stat-percent">%${((counts.despotic/counts.all)*100).toFixed(0)}</div>
        </div>
        <div class="stat-filter-btn" data-type="paper">
            <div class="stat-count">${counts.paper}</div>
            <div class="stat-label">Kağıt</div>
            <div class="stat-percent">%${((counts.paper/counts.all)*100).toFixed(0)}</div>
        </div>
        <div class="stat-filter-btn" data-type="absent">
            <div class="stat-count">${counts.absent}</div>
            <div class="stat-label">Mevcut Olmayan</div>
            <div class="stat-percent">%${((counts.absent/counts.all)*100).toFixed(0)}</div>
        </div>
    `;
    
    // Filter event'leri ekle
    statsContainer.querySelectorAll('.stat-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.dataset.type;
            filterCountryDots(filterType);
            
            // Active class'ı güncelle
            statsContainer.querySelectorAll('.stat-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

/**
 * Ülke noktalarını filtreler
 */
function filterCountryDots(type) {
    const allDots = document.querySelectorAll('.corridor-country-dot');
    
    allDots.forEach(dot => {
        if (type === 'all') {
            dot.classList.add('visible');
        } else {
            if (dot.classList.contains(type)) {
                dot.classList.add('visible');
            } else {
                dot.classList.remove('visible');
            }
        }
    });
    
    setState('selectedCorridorFilter', type);
    console.log(`Filtre uygulandı: ${type}`);
}

/**
 * Tüm ülke noktalarını gizler
 */
function hideAllCountryDots() {
    const allDots = document.querySelectorAll('.corridor-country-dot');
    allDots.forEach(dot => dot.remove());
    
    // İstatistikleri temizle
    const statsContainer = document.getElementById('corridor-stats-filters');
    if (statsContainer) {
        statsContainer.innerHTML = '';
    }
}

/**
 * Belirli bir yıl için interactive map'i yeniler
 */
function refreshInteractiveMapForYear(year) {
    // O yıl için darKoridorData'yı güncelle
    import('../corridor/corridor-data.js').then(module => {
        module.updateDarKoridorDataForYear(year);
        
        // Noktaları yeniden oluştur
        setTimeout(() => {
            showAllCountryDots();
            console.log(`✓ Interactive map ${year} yılı için güncellendi`);
        }, 100);
    });
}
