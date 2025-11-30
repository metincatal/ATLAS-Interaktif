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
        // Corridor verilerini yükle
        const mode = year <= 1995 ? 'historical' : 'modern';
        const dataUrl = mode === 'historical'
            ? 'data/processed/vdem_historical/dar_koridor_by_country_all_years.json'
            : 'data/processed/v2_1/dar_koridor_by_country.json';

        console.log(`Veri yükleniyor: ${dataUrl}`);
        const response = await fetch(dataUrl);

        if (!response.ok) {
            throw new Error(`Veri yüklenemedi: ${response.status}`);
        }

        const data = await response.json();

        console.log(`Toplam ülke sayısı: ${data.countries?.length || 'bilinmiyor'}`);

        // Ülke verisini bul
        const countryData = data.countries.find(c => c.country === countryName);

        if (!countryData) {
            console.error(`${countryName} için veri bulunamadı`);
            console.log('Mevcut ülkeler:', data.countries.slice(0, 5).map(c => c.country));
            return;
        }

        console.log(`${countryName} için ${countryData.years?.length || 0} yıl verisi bulundu`);

        // Yıl verisini bul
        const yearData = countryData.years.find(y => y.year === year);

        if (!yearData) {
            console.error(`${countryName} için ${year} yılı verisi bulunamadı`);
            console.log('Mevcut yıllar:', countryData.years.slice(0, 5).map(y => y.year));
            return;
        }

        console.log('Yıl verisi:', yearData);

        // Noktayı grafik üzerinde konumlandır
        updateDotPosition(yearData.state_capacity, yearData.society_strength);

    } catch (error) {
        console.error('Corridor pozisyonu yüklenirken hata:', error);
    }
}

/**
 * Grafik üzerinde noktayı konumlandırır
 */
function updateDotPosition(stateCapacity, societyStrength) {
    const dot = document.getElementById('game-country-dot');
    const container = document.querySelector('.corridor-graphic-container');

    if (!dot || !container) {
        console.warn('Nokta veya container bulunamadı');
        return;
    }

    // Grafik boyutlarını al
    const img = container.querySelector('img');

    const positionDot = () => {
        const graphWidth = img.offsetWidth;
        const graphHeight = img.offsetHeight;

        console.log(`Grafik boyutları: ${graphWidth}x${graphHeight}`);
        console.log(`State capacity: ${stateCapacity}, Society strength: ${societyStrength}`);

        // Normalize edilmiş koordinatlar (0-1 arası)
        // State capacity: X ekseni (soldan sağa)
        // Society strength: Y ekseni (yukarıdan aşağıya, tersine çevrilmiş)
        const x = stateCapacity * graphWidth;
        const y = (1 - societyStrength) * graphHeight;

        console.log(`Hesaplanan pozisyon: x=${x}, y=${y}`);

        // Noktayı konumlandır
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        dot.style.display = 'block';

        console.log(`✓ Nokta konumlandı: State=${stateCapacity}, Society=${societyStrength}`);
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
