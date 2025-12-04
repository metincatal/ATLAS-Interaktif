/**
 * Game Play Page Script
 * Gerçek oyun sayfası - Ana orchestration
 */

import { gameController } from '../modules/game/game-controller.js';
import { GameUI } from '../modules/game/game-ui.js';

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

    // Oyun verilerini yükle
    const success = await gameController.loadGameData();

    if (!success) {
        gameUI.elements.countryDetails.innerHTML = `
            <div style="background: #f8d7da; padding: 20px; border-radius: 12px; border-left: 4px solid #dc3545;">
                <strong>❌ Hata!</strong>
                <p>Oyun verileri yüklenemedi. Lütfen sayfayı yenileyin.</p>
            </div>
        `;
        return;
    }

    // Oyunu başlat (ülke KODUNU kullan, adını değil)
    const gameStarted = gameController.startGame(countryCode, yearParam);

    if (!gameStarted) {
        gameUI.elements.countryDetails.innerHTML = `
            <div style="background: #f8d7da; padding: 20px; border-radius: 12px; border-left: 4px solid #dc3545;">
                <strong>❌ Hata!</strong>
                <p>Seçilen ülke veya yıl için veri bulunamadı.</p>
                <button onclick="window.location.href='index.html'"
                        style="margin-top: 10px; padding: 10px 20px; background: #667eea; color: white;
                               border: none; border-radius: 8px; cursor: pointer;">
                    Ana Sayfaya Dön
                </button>
            </div>
        `;
        return;
    }

    // Oyun aktif
    isGameActive = true;

    // UI'yi güncelle
    const state = gameController.getGameState();
    gameUI.updateGameState(state);
    gameUI.showPolicyForm(state); // GameState parametresi ile dinamik politikalar

    // Event listener'ları ekle
    setupEventListeners();

    console.log('✅ Oyun hazır!', state);
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
 * Politika uygula (multi-select destekli)
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

    // Butonu devre dışı bırak
    const btn = document.getElementById('apply-policy-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = `⏳ ${selectedPolicies.length} Politika Analiz Ediliyor...`;
    }

    try {
        // Birden fazla politika varsa, birleştirilmiş bir prompt oluştur
        let title, description;

        if (selectedPolicies.length === 1) {
            title = selectedPolicies[0].title;
            description = selectedPolicies[0].description;
        } else {
            title = `${selectedPolicies.length} Politika Paketi`;
            description = selectedPolicies.map((p, i) =>
                `${i + 1}. ${p.title}: ${p.description}`
            ).join('\n\n');
        }

        if (!title || !description) {
            gameUI.showPolicyResult({ error: 'Politika başlığı veya açıklaması eksik!' }, false);
            return;
        }

        // Politikaları uygula
        const result = await gameController.applyPolicy(title, description);

        if (result.success) {
            // UI'yi güncelle
            const newState = gameController.getGameState();
            gameUI.updateGameState(newState);
            gameUI.showPolicyResult(result, true);

            // Seçimi temizle
            gameUI.clearSelection();

            // Oyun bitti mi?
            if (gameController.getGameState().currentTurn >= gameController.getGameState().maxTurns) {
                setTimeout(() => {
                    const scores = gameController.endGame();
                    gameUI.showGameOver(scores);
                    isGameActive = false;
                }, 2000);
            }
        } else {
            gameUI.showPolicyResult(result, false);
        }
    } catch (error) {
        console.error('Politika uygulama hatası:', error);
        gameUI.showPolicyResult({ error: 'AI ile bağlantı kurulamadı! Ollama çalışıyor mu?' }, false);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '⚡ Politikayı Uygula';
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
