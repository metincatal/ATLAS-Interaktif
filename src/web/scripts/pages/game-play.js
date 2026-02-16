/**
 * Game Play Page Script
 * Gerçek oyun sayfası - Ana orchestration
 */

import { gameController } from '../modules/game/game-controller.js';
import { GameUI } from '../modules/game/game-ui.js';
import { BASE_PATH } from '../config/constants.js';

// Dar koridor verileri (index.html ve game.html ile aynı kaynak)
let darKoridorData = null;

/**
 * Ülke adından ülke koduna çeviren mapping
 * game-controller.js ülke kodu (TUR, USA, NGA) bekliyor ama biz ülke adı (Turkey, Nigeria) alıyoruz
 */
const COUNTRY_NAME_TO_CODE = {
    'Turkey': 'TUR',
    'Türkiye': 'TUR',  // Veri dosyasında "Türkiye" yazıyor
    'Tunisia': 'TUN',
    'Afghanistan': 'AFG',
    'Albania': 'ALB',
    'Algeria': 'DZA',
    'Argentina': 'ARG',
    'Armenia': 'ARM',
    'Australia': 'AUS',
    'Austria': 'AUT',
    'Azerbaijan': 'AZE',
    'Bangladesh': 'BGD',
    'Belarus': 'BLR',
    'Belgium': 'BEL',
    'Bolivia': 'BOL',
    'Brazil': 'BRA',
    'Bulgaria': 'BGR',
    'Canada': 'CAN',
    'Chile': 'CHL',
    'China': 'CHN',
    'Colombia': 'COL',
    'Croatia': 'HRV',
    'Cuba': 'CUB',
    'Cyprus': 'CYP',
    'Czech Republic': 'CZE',
    'Denmark': 'DNK',
    'Ecuador': 'ECU',
    'Egypt': 'EGY',
    'Estonia': 'EST',
    'Ethiopia': 'ETH',
    'Finland': 'FIN',
    'France': 'FRA',
    'Georgia': 'GEO',
    'Germany': 'DEU',
    'Ghana': 'GHA',
    'Greece': 'GRC',
    'Hungary': 'HUN',
    'Iceland': 'ISL',
    'India': 'IND',
    'Indonesia': 'IDN',
    'Iran': 'IRN',
    'Iraq': 'IRQ',
    'Ireland': 'IRL',
    'Israel': 'ISR',
    'Italy': 'ITA',
    'Japan': 'JPN',
    'Jordan': 'JOR',
    'Kazakhstan': 'KAZ',
    'Kenya': 'KEN',
    'Korea South': 'KOR',
    'Kuwait': 'KWT',
    'Latvia': 'LVA',
    'Lebanon': 'LBN',
    'Libya': 'LBY',
    'Lithuania': 'LTU',
    'Malaysia': 'MYS',
    'Mexico': 'MEX',
    'Morocco': 'MAR',
    'Netherlands': 'NLD',
    'New Zealand': 'NZL',
    'Nigeria': 'NGA',
    'Norway': 'NOR',
    'Pakistan': 'PAK',
    'Peru': 'PER',
    'Philippines': 'PHL',
    'Poland': 'POL',
    'Portugal': 'PRT',
    'Romania': 'ROU',
    'Russia': 'RUS',
    'Saudi Arabia': 'SAU',
    'Serbia': 'SRB',
    'Singapore': 'SGP',
    'Slovakia': 'SVK',
    'South Africa': 'ZAF',
    'Spain': 'ESP',
    'Sudan': 'SDN',
    'Sweden': 'SWE',
    'Switzerland': 'CHE',
    'Syria': 'SYR',
    'Thailand': 'THA',
    'Ukraine': 'UKR',
    'United Arab Emirates': 'ARE',
    'United Kingdom': 'GBR',
    'United States': 'USA',
    'United States of America': 'USA',
    'Uruguay': 'URY',
    'Venezuela': 'VEN',
    'Vietnam': 'VNM',
    'Yemen': 'YEM',
    'Zimbabwe': 'ZWE'
};

// URL parametrelerinden ülke ve yıl al
const urlParams = new URLSearchParams(window.location.search);
const countryParam = urlParams.get('country');
const yearParam = parseInt(urlParams.get('year'));

// Ülke adını koda çevir
const countryCode = COUNTRY_NAME_TO_CODE[countryParam] || countryParam;

// Global state
let gameUI = null;
let isGameActive = false;

/**
 * Dar koridor verilerini yükle (index.html ve game.html ile aynı kaynak)
 */
async function loadDarKoridorData() {
    try {
        // Mode'u belirle
        const mode = yearParam <= 1995 ? 'historical' : 'modern';

        const dataUrl = mode === 'historical'
            ? `${BASE_PATH}/data/processed/vdem_historical/dar_koridor_combined_all_years.json`
            : `${BASE_PATH}/data/processed/wgi_vdem_modern/dar_koridor_all_years.json`;

        console.log(`Dar koridor verileri yükleniyor: ${dataUrl}`);
        const response = await fetch(dataUrl);

        if (!response.ok) {
            throw new Error(`Veri yüklenemedi: ${response.status}`);
        }

        const data = await response.json();
        // Historical veri "years" key'i içinde ise, onu çıkar
        darKoridorData = mode === 'historical' && data.years ? data.years : data;

        console.log('✅ Dar koridor verileri yüklendi');
        return true;
    } catch (error) {
        console.error('Dar koridor verisi yüklenemedi:', error);
        return false;
    }
}

/**
 * Ülke için doğru statePower ve societyPower değerlerini al
 */
function getCorrectCorridorValues(countryName, year) {
    if (!darKoridorData) return null;

    const yearStr = String(year);
    if (!darKoridorData[yearStr]) {
        console.warn(`${year} yılı için dar koridor verisi bulunamadı`);
        return null;
    }

    const countriesInYear = darKoridorData[yearStr];
    const countryData = countriesInYear.find(c =>
        (c.name || c.country) === countryName
    );

    if (!countryData) {
        console.warn(`${countryName} için ${year} yılı verisi bulunamadı`);
        return null;
    }

    return {
        statePower: countryData.statePower,
        societyPower: countryData.societyPower,
        leviathanType: countryData.leviathanType
    };
}

/**
 * Sayfa yüklendiğinde
 */
async function initializeGamePlay() {
    console.log('🎮 Oyun başlatılıyor:', countryParam, '→', countryCode, yearParam);

    // Parametreleri kontrol et
    if (!countryParam || !yearParam) {
        alert('Ülke veya yıl bilgisi eksik! Ana sayfaya yönlendiriliyorsunuz.');
        window.location.href = 'index.html';
        return;
    }

    gameUI = new GameUI();
    gameUI.showLoading('Oyun verileri yükleniyor...');

    // Dar koridor verilerini yükle (index.html ve game.html ile aynı kaynak)
    await loadDarKoridorData();

    // Oyun verilerini yükle
    const success = await gameController.loadGameData();

    if (!success) {
        showError('Oyun verileri yüklenemedi. Lütfen sayfayı yenileyin.');
        return;
    }

    // Oyunu başlat (ülke KODUNU kullan, adını değil)
    const gameStarted = gameController.startGame(countryCode, yearParam);

    if (!gameStarted) {
        showError('Seçilen ülke veya yıl için veri bulunamadı.');
        return;
    }

    // Oyun aktif
    isGameActive = true;

    // UI'yi güncelle - doğru statePower/societyPower değerlerini kullan
    const state = gameController.getGameState();

    // JSON dosyasından doğru değerleri al (index.html ve game.html ile aynı)
    const corridorValues = getCorrectCorridorValues(countryParam, yearParam);
    if (corridorValues) {
        state.statePower = corridorValues.statePower;
        state.societyPower = corridorValues.societyPower;
        state.leviathanType = corridorValues.leviathanType;

        // Politik sermayeyi doğru Leviathan tipine göre yeniden hesapla
        gameController.recalculatePoliticalCapital(corridorValues.leviathanType);

        console.log('✅ Doğru dar koridor değerleri uygulandı:', corridorValues);
    }

    gameUI.updateGameState(gameController.getGameState());
    gameUI.showPolicyForm(gameController.getGameState()); // GameState parametresi ile dinamik politikalar

    // Event listener'ları ekle
    setupEventListeners();

    console.log('✅ Oyun hazır!', state);
}

/**
 * Hata mesajı göster
 */
function showError(message) {
    const container = document.querySelector('.center-panel');
    if (container) {
        container.innerHTML = `
            <div style="background: #f8d7da; padding: 20px; border-radius: 12px; border-left: 4px solid #dc3545; margin: 20px;">
                <strong>❌ Hata!</strong>
                <p>${message}</p>
                <button onclick="window.location.href='index.html'"
                        style="margin-top: 10px; padding: 10px 20px; background: #667eea; color: white;
                               border: none; border-radius: 8px; cursor: pointer;">
                    Ana Sayfaya Dön
                </button>
            </div>
        `;
    }
}

/**
 * Event listener'ları ayarla
 */
function setupEventListeners() {
    document.addEventListener('click', handleClick);
}

/**
 * Click event handler
 */
async function handleClick(e) {
    // Politika uygula butonu
    if (e.target.id === 'apply-policy-btn') {
        await handleApplyPolicy();
    }

    // Turu bitir butonu
    if (e.target.id === 'end-turn-btn') {
        handleEndTurn();
    }

    // Yeni oyun butonu
    if (e.target.id === 'new-game-btn') {
        handleNewGame();
    }
}

/**
 * Politika uygula (multi-select destekli) - Her politika için ayrı AI olay üretimi
 */
async function handleApplyPolicy() {
    if (!isGameActive) {
        alert('Oyun aktif değil!');
        return;
    }

    // Seçili politikaları al
    const selectedPolicies = gameUI.getSelectedPolicies();

    if (!selectedPolicies || selectedPolicies.length === 0) {
        gameUI.showPolicyResult({ error: 'Lütfen en az bir politika seçin!' }, false);
        return;
    }

    // Toplam maliyeti hesapla
    const totalCost = gameUI.getTotalCost();
    const currentCapital = gameController.getGameState().politicalCapital.current;

    // Yeterli sermaye var mı kontrol et
    if (totalCost > currentCapital) {
        gameUI.showPolicyResult({
            error: `Yetersiz politik sermaye! Gerekli: ${totalCost}, Mevcut: ${Math.round(currentCapital)}`
        }, false);
        return;
    }

    // Butonu devre dışı bırak
    const btn = document.getElementById('apply-policy-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = `${selectedPolicies.length} Politika Analiz Ediliyor...`;
    }

    try {
        // Her politika için ayrı ayrı işlem yap
        const gameState = gameController.getGameState();
        const allResults = [];
        
        for (let i = 0; i < selectedPolicies.length; i++) {
            const policy = selectedPolicies[i];
            
            if (btn) {
                btn.textContent = `Politika ${i + 1}/${selectedPolicies.length}: ${policy.title.substring(0, 20)}...`;
            }

            // Her politikayı ayrı uygula
            const result = await gameController.applyPolicy(
                policy.title, 
                policy.description, 
                policy.cost || 25
            );

            if (result.success) {
                allResults.push({ policy, result });
                
                // Her politika için AI'dan gerçekçi olay üret
                try {
                    const event = await gameUI.generateRealisticEvent(policy, gameState, result);
                    gameUI.addEvent(event);
                    console.log(`Olay oluşturuldu: ${policy.title} ->`, event.headline);
                } catch (eventError) {
                    console.warn('Olay üretilemedi, fallback kullanılıyor:', eventError);
                    const fallbackEvent = gameUI.generateFallbackEvent(policy, gameState, result);
                    gameUI.addEvent(fallbackEvent);
                }
            }
        }

        if (allResults.length > 0) {
            // Politika uygulandı - iz bırakmayı aktifleştir
            gameUI.enableTrailForNextUpdate();
            
            // UI'yi güncelle
            const newState = gameController.getGameState();
            gameUI.updateGameState(newState);
            
            // Sonuçları göster - her politika ayrı ayrı
            gameUI.showMultiPolicyResult(allResults, selectedPolicies);

            // Seçimi temizle
            gameUI.clearSelection();

            // TUR BİTİR - Politik sermaye rejenerasyonu ve yeni politikalar
            setTimeout(async () => {
                const turnResult = gameController.endTurn();

                // Güncel state'i al (rejenerasyon uygulandıktan sonra)
                const updatedState = gameController.getGameState();
                gameUI.updateGameState(updatedState);

                // Yeni tur için yeni politika kartları üret
                await gameUI.showPolicyForm(updatedState);

                console.log(`Tur ${updatedState.currentTurn} başladı, sermaye: ${updatedState.politicalCapital.current}/${updatedState.politicalCapital.max}`);

                // Oyun bitti mi?
                if (turnResult.gameOver) {
                    setTimeout(() => {
                        const scores = gameController.endGame();
                        gameUI.showGameOver(scores);
                        isGameActive = false;
                    }, 1000);
                }
            }, 2500);
        } else {
            gameUI.showPolicyResult({ error: 'Politikalar uygulanamadı!' }, false);
        }
    } catch (error) {
        console.error('Politika uygulama hatası:', error);
        gameUI.showPolicyResult({ error: 'AI ile bağlantı kurulamadı! Ollama çalışıyor mu?' }, false);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Politikayı Uygula';
        }
    }
}

/**
 * Turu bitir
 */
function handleEndTurn() {
    if (!isGameActive) {
        alert('Oyun aktif değil!');
        return;
    }

    const result = gameController.endTurn();

    // UI'yi güncelle
    const state = gameController.getGameState();
    gameUI.updateGameState(state);
    gameUI.showPolicyForm(state); // Dinamik politikalar her tur için

    // Oyun bitti mi?
    if (result.gameOver) {
        setTimeout(() => {
            const scores = gameController.endGame();
            gameUI.showGameOver(scores);
            isGameActive = false;
        }, 1000);
    }

    console.log('🔄 Tur bitti, yeni tur:', state.currentTurn);
}

/**
 * Yeni oyun
 */
function handleNewGame() {
    gameController.resetGame();
    isGameActive = false;

    // Ana sayfaya dön
    window.location.href = 'index.html';
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', initializeGamePlay);

// Debug için global export
window.gameController = gameController;
window.gameUI = gameUI;
