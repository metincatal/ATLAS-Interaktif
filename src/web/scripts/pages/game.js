/**
 * Özgürlük Dengesi Oyun Sayfası - ATLAS İnteraktif
 */

import { API_CONFIG, getOllamaUrl } from '../config/api-config.js';

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

    // Dar koridor pozisyonunu göster
    await loadCorridorPosition();

    // Ülke bilgilerini Ollama'dan çek
    await loadCountryInfo();

    // Oyuna başla butonunu kur
    setupStartButton();
}

/**
 * Başlığı günceller
 */
function updateTitle() {
    const titleElement = document.getElementById('game-country-title');
    titleElement.textContent = `${countryName} - ${year}`;
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
            ? '/data/processed/vdem_historical/dar_koridor_combined_all_years.json'
            : '/data/processed/wgi_vdem_modern/dar_koridor_all_years.json';

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

        // Noktayı grafik üzerinde konumlandır
        updateDotPosition(countryData.statePower, countryData.societyPower);

    } catch (error) {
        console.error('Corridor pozisyonu yüklenirken hata:', error);
    }
}

/**
 * Grafik üzerinde noktayı konumlandırır (ana sayfadaki calculateCorridorPosition mantığını kullanır)
 */
function updateDotPosition(statePower, societyPower) {
    const dot = document.getElementById('game-country-dot');
    const container = document.querySelector('.corridor-graphic-container');

    if (!dot || !container) {
        console.warn('Nokta veya container bulunamadı');
        return;
    }

    // Grafik boyutlarını al
    const img = container.querySelector('img');

    const positionDot = () => {
        console.log(`State power: ${statePower}, Society power: ${societyPower}`);

        // Ana sayfadaki gibi pozisyon hesapla (yüzde cinsinden)
        let { x, y } = calculateCorridorPosition(statePower, societyPower);

        // Clamp işlemi
        ({ x, y } = clampAlongDiagonal(x, y));

        const imgWidth = img.offsetWidth;
        const imgHeight = img.offsetHeight;

        // Pixel pozisyonu hesapla
        const dotLeft = (imgWidth * x / 100);
        const dotTop = (imgHeight * y / 100);

        console.log(`Hesaplanan pozisyon: x=${x}%, y=${y}% => ${dotLeft}px, ${dotTop}px`);

        // Noktayı konumlandır
        dot.style.left = `${dotLeft}px`;
        dot.style.top = `${dotTop}px`;
        dot.style.display = 'block';

        console.log(`✓ Nokta konumlandı`);
    };

    // Eğer resim yüklenmemişse, yüklenmesini bekle
    if (!img.complete) {
        console.log('Grafik yükleniyor, bekleniyor...');
        img.addEventListener('load', positionDot);
    } else {
        positionDot();
    }
}

/**
 * Corridor pozisyonunu hesaplar (ana sayfadan)
 */
function calculateCorridorPosition(statePower, societyPower) {
    // [-2, 2] aralığını [0, 100] aralığına dönüştür
    const x = ((statePower + 2) / 4) * 100;
    const y = ((2 - societyPower) / 4) * 100; // Y ekseni ters

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
                Ollama servisinin çalıştığından ve deepseek-r1 modelinin yüklü olduğundan emin olun.
            </p>
        `;
    }
}

/**
 * Oyuna başla butonunu kurar
 */
function setupStartButton() {
    const startBtn = document.getElementById('start-game-btn');

    startBtn.addEventListener('click', () => {
        // Şimdilik ana sayfaya dön (sonra oyun mekaniği eklenecek)
        console.log('Oyun başlatılacak...');
        // window.location.href = 'index.html';
    });
}

// Sayfa yüklendiğinde oyunu başlat
window.addEventListener('DOMContentLoaded', initGame);
