/**
 * Özgürlük Dengesi Oyun Sayfası - ATLAS İnteraktif
 */

import { API_CONFIG, getOllamaUrl } from '../config/api-config.js';
import { BASE_PATH } from '../config/constants.js';

// URL parametrelerinden ülke ve yıl bilgisini al
const urlParams = new URLSearchParams(window.location.search);
const countryName = urlParams.get('country');
const year = parseInt(urlParams.get('year'));

console.log(`Oyun başlatılıyor: ${countryName} - ${year}`);

/**
 * Sayfa yüklendiğinde çalışır
 */
async function initGame() {
    if (!countryName || !year) {
        alert('Ülke veya yıl bilgisi eksik!');
        window.location.href = 'index.html';
        return;
    }

    // Başlığı güncelle
    updateTitle();

    // Oyuna başla butonunu hemen kur (AI yanıtını beklemeye gerek yok)
    setupStartButton();

    // Dar koridor pozisyonunu göster
    await loadCorridorPosition();

    // Ülke bilgilerini Ollama'dan çek (async, buton beklemez)
    loadCountryInfo();
}

/**
 * Başlığı günceller (bayrak, ülke adı, yıl)
 */
function updateTitle() {
    const nameElement = document.getElementById('game-country-name');
    const yearElement = document.getElementById('game-country-year');
    const flagElement = document.getElementById('game-country-flag');

    nameElement.textContent = countryName;
    yearElement.textContent = year;

    // Bayrak emoji'sini al
    const countryFlag = getCountryFlag(countryName);
    flagElement.textContent = countryFlag;
}

/**
 * Ülke adına göre bayrak emoji'si döndürür
 */
function getCountryFlag(countryName) {
    const flagMap = {
        'Turkey': '🇹🇷',
        'Tunisia': '🇹🇳',
        'Afghanistan': '🇦🇫',
        'Albania': '🇦🇱',
        'Algeria': '🇩🇿',
        'Argentina': '🇦🇷',
        'Armenia': '🇦🇲',
        'Australia': '🇦🇺',
        'Austria': '🇦🇹',
        'Azerbaijan': '🇦🇿',
        'Bangladesh': '🇧🇩',
        'Belarus': '🇧🇾',
        'Belgium': '🇧🇪',
        'Bolivia': '🇧🇴',
        'Brazil': '🇧🇷',
        'Bulgaria': '🇧🇬',
        'Canada': '🇨🇦',
        'Chile': '🇨🇱',
        'China': '🇨🇳',
        'Colombia': '🇨🇴',
        'Croatia': '🇭🇷',
        'Cuba': '🇨🇺',
        'Cyprus': '🇨🇾',
        'Czech Republic': '🇨🇿',
        'Denmark': '🇩🇰',
        'Ecuador': '🇪🇨',
        'Egypt': '🇪🇬',
        'Estonia': '🇪🇪',
        'Ethiopia': '🇪🇹',
        'Finland': '🇫🇮',
        'France': '🇫🇷',
        'Georgia': '🇬🇪',
        'Germany': '🇩🇪',
        'Ghana': '🇬🇭',
        'Greece': '🇬🇷',
        'Hungary': '🇭🇺',
        'Iceland': '🇮🇸',
        'India': '🇮🇳',
        'Indonesia': '🇮🇩',
        'Iran': '🇮🇷',
        'Iraq': '🇮🇶',
        'Ireland': '🇮🇪',
        'Israel': '🇮🇱',
        'Italy': '🇮🇹',
        'Japan': '🇯🇵',
        'Jordan': '🇯🇴',
        'Kazakhstan': '🇰🇿',
        'Kenya': '🇰🇪',
        'Korea South': '🇰🇷',
        'Kuwait': '🇰🇼',
        'Latvia': '🇱🇻',
        'Lebanon': '🇱🇧',
        'Libya': '🇱🇾',
        'Lithuania': '🇱🇹',
        'Malaysia': '🇲🇾',
        'Mexico': '🇲🇽',
        'Morocco': '🇲🇦',
        'Netherlands': '🇳🇱',
        'New Zealand': '🇳🇿',
        'Nigeria': '🇳🇬',
        'Norway': '🇳🇴',
        'Pakistan': '🇵🇰',
        'Peru': '🇵🇪',
        'Philippines': '🇵🇭',
        'Poland': '🇵🇱',
        'Portugal': '🇵🇹',
        'Romania': '🇷🇴',
        'Russia': '🇷🇺',
        'Saudi Arabia': '🇸🇦',
        'Serbia': '🇷🇸',
        'Singapore': '🇸🇬',
        'Slovakia': '🇸🇰',
        'South Africa': '🇿🇦',
        'Spain': '🇪🇸',
        'Sudan': '🇸🇩',
        'Sweden': '🇸🇪',
        'Switzerland': '🇨🇭',
        'Syria': '🇸🇾',
        'Thailand': '🇹🇭',
        'Ukraine': '🇺🇦',
        'United Arab Emirates': '🇦🇪',
        'United Kingdom': '🇬🇧',
        'United States': '🇺🇸',
        'Uruguay': '🇺🇾',
        'Venezuela': '🇻🇪',
        'Vietnam': '🇻🇳',
        'Yemen': '🇾🇪',
        'Zimbabwe': '🇿🇼'
    };

    return flagMap[countryName] || '🏳️';
}

/**
 * Dar koridor pozisyonunu yükler ve gösterir
 */
async function loadCorridorPosition() {
    try {
        // Mode'u belirle
        const mode = year <= 1995 ? 'historical' : 'modern';

        // Yıllara göre organize edilmiş veri dosyasını yükle
        const dataUrl = mode === 'historical'
            ? `${BASE_PATH}/data/processed/vdem_historical/dar_koridor_combined_all_years.json`
            : `${BASE_PATH}/data/processed/wgi_vdem_modern/dar_koridor_all_years.json`;

        console.log(`Veri yükleniyor: ${dataUrl} (mode: ${mode})`);
        const response = await fetch(dataUrl);

        if (!response.ok) {
            throw new Error(`Veri yüklenemedi: ${response.status}`);
        }

        const data = await response.json();

        // Historical veri "years" key'i içinde ise, onu çıkar
        let yearlyData = mode === 'historical' && data.years ? data.years : data;

        // Yıl verisini al
        const yearStr = String(year);
        if (!yearlyData[yearStr]) {
            console.error(`${year} yılı için veri bulunamadı (${mode} mode)`);
            console.log('Mevcut yıllar:', Object.keys(yearlyData).slice(0, 10));
            return;
        }

        const countriesInYear = yearlyData[yearStr];
        console.log(`${year} yılı için ${countriesInYear.length} ülke bulundu`);

        // Ülkeyi bul
        const countryData = countriesInYear.find(c =>
            (c.name || c.country) === countryName
        );

        if (!countryData) {
            console.error(`${countryName} için ${year} yılı verisi bulunamadı`);
            console.log('Mevcut ülkeler:', countriesInYear.slice(0, 10).map(c => c.name || c.country));
            return;
        }

        console.log('Ülke verisi:', countryData);

        // Noktayı grafik üzerinde konumlandır ve tooltip'i kur
        updateDotPosition(countryData.statePower, countryData.societyPower, countryData);

    } catch (error) {
        console.error('Corridor pozisyonu yüklenirken hata:', error);
    }
}

/**
 * Image'ın container içindeki gerçek render alanını hesaplar
 * object-fit: contain kullanıldığında image, container'dan küçük olabilir
 */
function getImageRenderBounds(img) {
    const containerWidth = img.clientWidth;
    const containerHeight = img.clientHeight;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    if (!naturalWidth || !naturalHeight) {
        return { offsetX: 0, offsetY: 0, width: containerWidth, height: containerHeight };
    }
    
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = naturalWidth / naturalHeight;
    
    let renderWidth, renderHeight, offsetX, offsetY;
    
    if (imageRatio > containerRatio) {
        renderWidth = containerWidth;
        renderHeight = containerWidth / imageRatio;
        offsetX = 0;
        offsetY = (containerHeight - renderHeight) / 2;
    } else {
        renderHeight = containerHeight;
        renderWidth = containerHeight * imageRatio;
        offsetX = (containerWidth - renderWidth) / 2;
        offsetY = 0;
    }
    
    return { offsetX, offsetY, width: renderWidth, height: renderHeight };
}

// Mevcut state'i sakla (resize için)
let currentDotState = null;

/**
 * Grafik üzerinde noktayı konumlandırır ve tooltip ekler
 * object-fit: contain ile uyumlu - gerçek render alanını hesaplar
 */
function updateDotPosition(statePower, societyPower, countryData) {
    const dot = document.getElementById('game-country-dot');
    const container = document.querySelector('.corridor-graphic-container');
    const tooltip = document.getElementById('game-corridor-tooltip');

    if (!dot || !container || !tooltip) {
        console.warn('Nokta, container veya tooltip bulunamadı');
        return;
    }

    // Grafik boyutlarını al
    const img = container.querySelector('img');

    // State'i kaydet (resize için)
    currentDotState = { statePower, societyPower, countryData };

    const positionDot = () => {
        // Image naturalWidth kontrolü - yüklenmemişse bekle
        if (!img.naturalWidth || !img.naturalHeight) {
            dot.style.display = 'none';
            console.warn('Image henüz yüklenmedi, bekleniyor...');
            setTimeout(() => updateDotPosition(statePower, societyPower, countryData), 100);
            return;
        }

        console.log(`State power: ${statePower}, Society power: ${societyPower}`);

        // Ana sayfadaki gibi pozisyon hesapla (yüzde cinsinden)
        let { x, y } = calculateCorridorPosition(statePower, societyPower);

        // Clamp işlemi
        ({ x, y } = clampAlongDiagonal(x, y));

        // Image'ın gerçek render alanını hesapla
        const bounds = getImageRenderBounds(img);
        
        // Pixel pozisyonunu hesapla
        const dotLeft = bounds.offsetX + (bounds.width * x / 100);
        const dotTop = bounds.offsetY + (bounds.height * y / 100);

        console.log(`Hesaplanan pozisyon: x=${x}%, y=${y}% => ${dotLeft.toFixed(1)}px, ${dotTop.toFixed(1)}px`);

        dot.style.left = `${dotLeft}px`;
        dot.style.top = `${dotTop}px`;
        dot.style.display = 'block';

        // Leviathan tipine göre class ekle (ana sayfadaki gibi)
        const levType = countryData.leviathanType || 'Absent';
        dot.className = 'country-dot ' + levType.toLowerCase();

        // Tooltip event'lerini ekle
        setupTooltip(dot, tooltip, countryData);

        console.log(`✓ Nokta konumlandı (${levType}) ve tooltip kuruldu`);
    };

    // Image'ın tam yüklenmesini bekle
    if (img.complete && img.naturalWidth) {
        positionDot();
    } else {
        dot.style.display = 'none'; // Yüklenene kadar gizle
        console.log('Grafik yükleniyor, bekleniyor...');
        img.addEventListener('load', positionDot);
    }
}

// Resize handler - nokta pozisyonunu yeniden hesapla
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentDotState) {
            updateDotPosition(
                currentDotState.statePower,
                currentDotState.societyPower,
                currentDotState.countryData
            );
        }
    }, 100);
});

/**
 * Tooltip kurulumu - Ana sayfadaki gibi
 */
function setupTooltip(dot, tooltip, countryData) {
    // Leviathan tipi renkleri (ana sayfadaki gibi)
    const LEVIATHAN_COLORS = {
        'Shackled': '#2ecc71',
        'Despotic': '#e74c3c',
        'Paper': '#f39c12',
        'Absent': '#9b59b6'
    };

    const levType = countryData.leviathanType || 'Absent';
    const levColor = LEVIATHAN_COLORS[levType] || '#999';

    // Mouse enter - Tooltip göster
    dot.addEventListener('mouseenter', (e) => {
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
            <div class="tooltip-country">${countryName}</div>
            <div class="tooltip-info">
                Devlet: <span class="tooltip-value state-power">${countryData.statePower.toFixed(2)}</span><br>
                Toplum: <span class="tooltip-value society-power">${countryData.societyPower.toFixed(2)}</span><br>
                Tip: <span class="tooltip-value leviathan-type" style="color:${levColor}">${levType}</span>
            </div>
        `;
        updateTooltipPosition(e, tooltip);
    });

    // Mouse move - Tooltip pozisyonunu güncelle
    dot.addEventListener('mousemove', (e) => {
        updateTooltipPosition(e, tooltip);
    });

    // Mouse leave - Tooltip gizle
    dot.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
}

/**
 * Tooltip pozisyonunu günceller (ana sayfadaki gibi)
 */
function updateTooltipPosition(e, tooltip) {
    const container = document.querySelector('.corridor-graphic-container');
    const rect = container.getBoundingClientRect();

    // Tooltip boyutlarını al
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;

    // İlk pozisyon hesaplama (mouse'un sağında ve biraz üstünde)
    let left = e.clientX - rect.left + 15;
    let top = e.clientY - rect.top - 10;

    // Sağ tarafta taşma kontrolü
    if (left + tooltipWidth > rect.width) {
        // Mouse'un soluna yerleştir
        left = e.clientX - rect.left - tooltipWidth - 15;
    }

    // Sol tarafta taşma kontrolü
    if (left < 0) {
        left = 10; // Minimum padding
    }

    // Üst tarafta taşma kontrolü
    if (top < 0) {
        // Mouse'un altına yerleştir
        top = e.clientY - rect.top + 20;
    }

    // Alt tarafta taşma kontrolü
    if (top + tooltipHeight > rect.height) {
        // Yukarı çıkar
        top = rect.height - tooltipHeight - 10;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

/**
 * Corridor pozisyonunu hesaplar (ana sayfadan - geometry.js)
 * X ekseni: SocietyPower (Toplum Gücü) - soldan sağa
 * Y ekseni: StatePower (Devlet Gücü) - yukarıdan aşağıya (ters)
 */
function calculateCorridorPosition(statePower, societyPower) {
    // Faktör sınırları
    const FACTOR_MIN = -3;
    const FACTOR_MAX = 3;
    const MARGIN = 3; // Kenar boşluğu
    
    // Faktör değerlerini sınırla
    const clampedStatePower = Math.max(FACTOR_MIN, Math.min(FACTOR_MAX, statePower || 0));
    const clampedSocietyPower = Math.max(FACTOR_MIN, Math.min(FACTOR_MAX, societyPower || 0));
    
    // X ekseni: SocietyPower (Toplum Gücü) - soldan sağa
    // -3 → 0%, 0 → 50%, +3 → 100%
    let x = ((clampedSocietyPower - FACTOR_MIN) / (FACTOR_MAX - FACTOR_MIN)) * 100;
    
    // Y ekseni: StatePower (Devlet Gücü) - alttan yukarıya
    // Y'yi ters çeviriyoruz çünkü grafik koordinatları üstten başlar
    // -3 → 100% (alt), 0 → 50% (orta), +3 → 0% (üst)
    let y = 100 - ((clampedStatePower - FACTOR_MIN) / (FACTOR_MAX - FACTOR_MIN)) * 100;
    
    // Kesin sınırlandırma: koordinatlar her zaman grafik içinde olmalı
    x = Math.max(MARGIN, Math.min(100 - MARGIN, x));
    y = Math.max(MARGIN, Math.min(100 - MARGIN, y));

    return { x, y };
}

/**
 * Pozisyonu grafik sınırları içinde tutar (ana sayfadan)
 */
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
 * Ollama'dan ülke bilgilerini çeker
 */
async function loadCountryInfo() {
    const detailsElement = document.getElementById('game-country-details');

    // Prompt oluştur
    const prompt = `${countryName} ülkesi hakkında ${year} yılı bağlamında kısa bir analiz yap.

Aşağıdaki konulara değin:
1. O dönemdeki politik durumu
2. Ekonomik yapısı
3. Devlet kapasitesi ve toplumsal güç dengesi
4. Dar Koridor teorisi açısından konumu

Yanıtını 3-4 kısa paragraf halinde ver. Markdown kullanma, sadece düz metin.`;

    try {
        detailsElement.innerHTML = '<div class="loading-spinner"></div><p>Ülke bilgileri yükleniyor...</p>';

        const response = await fetch(getOllamaUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-v3.1:671b-cloud',
                prompt: prompt,
                stream: true,
                options: {
                    temperature: 0.7,
                    top_p: 0.9
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API hatası: ${response.status}`);
        }

        // Stream'i oku
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        detailsElement.innerHTML = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);

                    if (data.response) {
                        fullResponse += data.response;
                        detailsElement.textContent = fullResponse;
                    }

                    if (data.done) {
                        break;
                    }
                } catch (e) {
                    console.warn('JSON parse hatası:', e);
                }
            }
        }

        console.log('✓ Ülke bilgileri yüklendi');

    } catch (error) {
        console.error('Ollama bağlantı hatası:', error);
        detailsElement.innerHTML = `
            <p style="color: #e74c3c;">
                <strong>Bilgiler yüklenemedi.</strong><br>
                Ollama servisinin çalıştığından ve deepseek-v3.1:671b-cloud modelinin yüklü olduğundan emin olun.
            </p>
        `;
    }
}

/**
 * Oyuna başla butonunu kurar - Sayfa yüklenir yüklenmez aktif olur
 */
function setupStartButton() {
    const startBtn = document.getElementById('start-game-btn');

    if (!startBtn) return;

    // Butonu hemen aktif et (AI yanıtını beklemeye gerek yok)
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
    startBtn.style.cursor = 'pointer';

    // "(Yakında)" yazısını kaldır
    const subtitle = startBtn.querySelector('.btn-subtitle');
    if (subtitle) {
        subtitle.textContent = 'Hemen Başla!';
    }

    startBtn.addEventListener('click', () => {
        // Ülke ve yıl parametrelerini al
        const urlParams = new URLSearchParams(window.location.search);
        const country = urlParams.get('country');
        const year = urlParams.get('year');

        if (country && year) {
            // Oyun sayfasına yönlendir
            window.location.href = `game-play.html?country=${country}&year=${year}`;
        } else {
            alert('Ülke veya yıl bilgisi eksik!');
        }
    });
}

// Sayfa yüklendiğinde oyunu başlat
window.addEventListener('DOMContentLoaded', initGame);







