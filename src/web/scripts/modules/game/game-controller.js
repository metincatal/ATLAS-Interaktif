/**
 * Game Controller
 * Oyunun ana orchestrator'ı - tüm bileşenleri koordine eder
 */

import { GameState } from './game-state.js';
import { PolicyEffectsCalculator } from './policy-effects.js';
import { FactorCalculator } from './factor-calculator.js';
import { PolicyManager } from './policy-manager.js';
import { CAPITAL_BY_LEVIATHAN, COUNTRY_CAPITAL_MODIFIERS, DEFAULT_CAPITAL_MODIFIER, DEFAULT_LEVIATHAN_TYPE } from './game-constants.js';
import { BASE_PATH } from '../../config/constants.js';

export class GameController {
    constructor() {
        this.gameState = new GameState();
        this.policyManager = new PolicyManager();

        // Bu objeler veri yüklendikten sonra initialize edilecek
        this.policyEffects = null;
        this.factorCalc = null;

        // Veri dosyaları
        this.gameData = {
            volatility: null,
            correlationMatrix: null,
            factorLoadings: null,
            initialVariables: null,
            stakeholderProfiles: null
        };

        this.isInitialized = false;
    }

    /**
     * Oyun verilerini yükle
     * @returns {Promise<boolean>} Başarılı oldu mu?
     */
    async loadGameData() {
        console.log('📦 Oyun verileri yükleniyor...');

        try {
            // 5 veri dosyasını paralel yükle
            const [volatility, correlation, loadings, initVars, stakeholders] = await Promise.all([
                fetch(`${BASE_PATH}/data/processed/game_data/variable_volatility.json`).then(r => r.json()),
                fetch(`${BASE_PATH}/data/processed/game_data/correlation_matrix.json`).then(r => r.json()),
                fetch(`${BASE_PATH}/data/processed/game_data/factor_loadings.json`).then(r => r.json()),
                fetch(`${BASE_PATH}/data/processed/game_data/initial_variables.json`).then(r => r.json()),
                fetch(`${BASE_PATH}/data/processed/game_data/stakeholder_profiles.json`).then(r => r.json())
            ]);

            this.gameData.volatility = volatility;
            this.gameData.correlationMatrix = correlation;
            this.gameData.factorLoadings = loadings;
            this.gameData.initialVariables = initVars;
            this.gameData.stakeholderProfiles = stakeholders;

            // Calculator'ları initialize et
            this.policyEffects = new PolicyEffectsCalculator(volatility, correlation);
            this.factorCalc = new FactorCalculator(loadings);

            this.isInitialized = true;

            console.log('✅ Tüm oyun verileri yüklendi:', {
                volatilityVars: Object.keys(volatility.variables).length,
                correlations: Object.keys(correlation.correlations).length,
                countries: Object.keys(initVars.countries).length
            });

            return true;

        } catch (error) {
            console.error('❌ Oyun verileri yüklenirken hata:', error);
            return false;
        }
    }

    /**
     * Oyunu başlat
     * @param {string} countryCode - Ülke kodu (TUR, USA, vb.)
     * @param {number} year - Başlangıç yılı
     * @returns {boolean} Başarılı oldu mu?
     */
    startGame(countryCode, year) {
        if (!this.isInitialized) {
            console.error('❌ Oyun verileri henüz yüklenmedi!');
            return false;
        }

        // Ülke verilerini getir
        const countryData = this.gameData.initialVariables.countries[countryCode];
        if (!countryData) {
            console.error(`❌ Ülke bulunamadı: ${countryCode}`);
            return false;
        }

        const yearData = countryData.years[year.toString()];
        if (!yearData) {
            console.error(`❌ ${countryData.country_name} için ${year} yılı verisi bulunamadı`);
            return false;
        }

        // Stakeholder verilerini getir
        const stakeholderData = this.gameData.stakeholderProfiles.countries[countryCode];
        const stakeholders = stakeholderData?.years[year.toString()] || null;

        // Faktörleri hesapla
        const factors = this.factorCalc.calculateFactors(yearData);
        factors.leviathanType = this.factorCalc.getLeviathanType(factors.statePower, factors.societyPower);

        // GameState'i başlat
        this.gameState.initializeGame(
            countryData.country_name,
            countryCode,
            year,
            yearData,
            stakeholders,
            factors
        );

        console.log('🎮 Oyun başlatıldı!', {
            country: countryData.country_name,
            year,
            leviathanType: factors.leviathanType,
            statePower: factors.statePower,
            societyPower: factors.societyPower
        });

        return true;
    }

    /**
     * Politika uygula (ANA OYUN AKIŞI)
     * @param {string} policyTitle - Politika başlığı
     * @param {string} policyDescription - Politika açıklaması
     * @param {number} forcedCost - Zorunlu maliyet (UI'dan gelen toplam maliyet)
     * @returns {Promise<Object>} Sonuç
     */
    async applyPolicy(policyTitle, policyDescription, forcedCost = null) {
        if (!this.gameState.getState().gameActive) {
            return { success: false, error: 'Oyun aktif değil' };
        }

        console.log('⚙ Politika uygulanıyor:', policyTitle, 'Maliyet:', forcedCost);

        const state = this.gameState.getState();

        // 1. AI ile analiz et
        const context = {
            country: state.country,
            year: state.currentYear,
            statePower: state.statePower,
            societyPower: state.societyPower
        };

        const aiAnalysis = await this.policyEffects.analyzePolicyWithAI(
            policyTitle,
            policyDescription,
            context
        );

        // 2. Politik sermaye kontrolü - UI'dan gelen maliyet varsa onu kullan
        const cost = forcedCost !== null ? forcedCost : (aiAnalysis.political_cost || 25);
        if (!this.gameState.spendPoliticalCapital(cost)) {
            return {
                success: false,
                error: 'Yetersiz politik sermaye!',
                required: cost,
                available: state.politicalCapital.current
            };
        }

        // 3. Değişken değişimlerini hesapla
        const changes17 = this.policyEffects.calculateVariableChanges(aiAnalysis);

        // 4. Yeni değişken değerlerini uygula
        const newVariables = this.policyEffects.applyRealisticConstraints(
            state.variables,
            changes17
        );

        this.gameState.updateVariables(newVariables);

        // 5. Yeni faktörleri hesapla
        const newFactors = this.factorCalc.calculateFactors(newVariables);
        newFactors.leviathanType = this.factorCalc.getLeviathanType(
            newFactors.statePower,
            newFactors.societyPower
        );

        this.gameState.updateFactors(newFactors);

        // 6. Paydaş tepkilerini uygula
        this.gameState.updateStakeholders(aiAnalysis.stakeholders || {});

        // 7. Geçmişe ekle
        this.gameState.addPolicyToHistory({
            title: policyTitle,
            cost: cost,
            effects: aiAnalysis
        });

        this.gameState.addEvent(
            `📜 "${policyTitle}" politikası uygulandı (Maliyet: ${cost})`
        );

        // 8. Kriz kontrolü
        const crisis = this.gameState.checkCrisis();
        if (crisis) {
            this.gameState.addEvent(crisis.message);
        }

        console.log('✅ Politika uygulandı:', {
            newStatePower: newFactors.statePower,
            newSocietyPower: newFactors.societyPower,
            leviathanType: newFactors.leviathanType,
            crisis: crisis ? crisis.group : null
        });

        return {
            success: true,
            changes: changes17,
            newFactors: newFactors,
            stakeholderReactions: aiAnalysis.stakeholders,
            cost: cost,
            crisis: crisis
        };
    }

    /**
     * Turu bitir
     */
    endTurn() {
        // Önce dinamik rejenerasyonu güncelle (paydaş memnuniyetine göre)
        this.updateDynamicRegeneration();

        // Sonra turu bitir (sermaye rejenerasyonu burada uygulanıyor)
        this.gameState.endTurn();

        // Yeni politika önerileri oluştur
        const policies = this.policyManager.generatePolicyOptions(this.gameState.getState());

        console.log('🔄 Tur bitti, yeni politikalar hazır');

        return {
            policies: policies,
            gameOver: this.gameState.isGameOver()
        };
    }

    /**
     * Oyunu bitir ve skorları hesapla
     * @returns {Object} Final skorlar
     */
    endGame() {
        const scores = this.gameState.calculateFinalScores();

        this.gameState.addEvent('🏁 Oyun bitti!');

        console.log('🏁 Oyun bitti! Skorlar:', scores);

        return scores;
    }

    /**
     * Mevcut durumu al
     * @returns {Object}
     */
    getGameState() {
        return this.gameState.getState();
    }

    /**
     * Oyunu sıfırla
     */
    resetGame() {
        this.gameState.reset();
        console.log('🔄 Oyun sıfırlandı');
    }

    /**
     * Ülke listesini al
     * @returns {Array} Ülke listesi
     */
    getAvailableCountries() {
        if (!this.isInitialized) return [];

        const countries = [];
        for (const [code, data] of Object.entries(this.gameData.initialVariables.countries)) {
            const years = Object.keys(data.years).map(y => parseInt(y)).sort();
            countries.push({
                code: code,
                name: data.country_name,
                yearRange: {
                    min: years[0],
                    max: years[years.length - 1]
                },
                totalYears: years.length
            });
        }

        // Alfabetik sırala
        countries.sort((a, b) => a.name.localeCompare(b.name));

        return countries;
    }

    /**
     * Politik sermayeyi doğru Leviathan tipine göre yeniden hesapla
     * @param {string} leviathanType - Leviathan tipi
     */
    recalculatePoliticalCapital(leviathanType) {
        const state = this.gameState.getState();
        const countryCode = state.countryCode;

        const baseCapital = CAPITAL_BY_LEVIATHAN[leviathanType] || CAPITAL_BY_LEVIATHAN[DEFAULT_LEVIATHAN_TYPE];
        const countryModifier = COUNTRY_CAPITAL_MODIFIERS[countryCode] || DEFAULT_CAPITAL_MODIFIER;

        // Baz değerleri hesapla
        const baseCurrent = Math.round(baseCapital.current * countryModifier);
        const baseMax = Math.round(baseCapital.max * countryModifier);
        const baseRegen = Math.round(baseCapital.regen * countryModifier);

        // Dinamik rejenerasyon: Paydaş memnuniyetine göre çarpan
        const satisfactionMultiplier = this.calculateSatisfactionMultiplier(state.stakeholders);

        // Kriz durumu çarpanı
        const crisis = this.gameState.checkCrisis();
        const crisisMultiplier = crisis ? 0.5 : 1.0;

        // Final rejenerasyon
        const dynamicRegen = Math.round(baseRegen * satisfactionMultiplier * crisisMultiplier);

        state.leviathanType = leviathanType;
        state.politicalCapital = {
            current: baseCurrent,
            max: baseMax,
            regenPerTurn: dynamicRegen,
            baseRegen: baseRegen // UI'da göstermek için
        };

        console.log(`💰 Politik sermaye yeniden hesaplandı:`, {
            leviathanType,
            countryCode,
            countryModifier,
            baseRegen,
            satisfactionMultiplier: satisfactionMultiplier.toFixed(2),
            crisisMultiplier,
            finalRegen: dynamicRegen,
            current: baseCurrent,
            max: baseMax
        });
    }

    /**
     * Paydaş memnuniyetine göre çarpan hesapla
     * Formül: 0.5 + (ortalama memnuniyet × 0.75)
     * - %100 memnuniyet → 1.25 çarpan
     * - %50 memnuniyet → 0.875 çarpan
     * - %0 memnuniyet → 0.5 çarpan
     */
    calculateSatisfactionMultiplier(stakeholders) {
        if (!stakeholders) return 1.0;

        const satisfactions = Object.values(stakeholders).map(s => s.satisfaction || 0.5);
        const avgSatisfaction = satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length;

        return 0.5 + (avgSatisfaction * 0.75);
    }

    /**
     * Her tur sonunda dinamik rejenerasyonu güncelle
     */
    updateDynamicRegeneration() {
        const state = this.gameState.getState();
        const baseCapital = CAPITAL_BY_LEVIATHAN[state.leviathanType] || CAPITAL_BY_LEVIATHAN[DEFAULT_LEVIATHAN_TYPE];
        const countryModifier = COUNTRY_CAPITAL_MODIFIERS[state.countryCode] || DEFAULT_CAPITAL_MODIFIER;
        const baseRegen = Math.round(baseCapital.regen * countryModifier);

        const satisfactionMultiplier = this.calculateSatisfactionMultiplier(state.stakeholders);
        const crisis = this.gameState.checkCrisis();
        const crisisMultiplier = crisis ? 0.5 : 1.0;

        const dynamicRegen = Math.round(baseRegen * satisfactionMultiplier * crisisMultiplier);

        state.politicalCapital.regenPerTurn = dynamicRegen;
        state.politicalCapital.baseRegen = baseRegen;

        console.log(`🔄 Rejenerasyon güncellendi: ${dynamicRegen}/tur (baz: ${baseRegen}, memnuniyet: ${satisfactionMultiplier.toFixed(2)}, kriz: ${crisisMultiplier})`);
    }
}

// Global instance (singleton pattern)
export const gameController = new GameController();
