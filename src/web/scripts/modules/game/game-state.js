/**
 * Game State Manager
 * Oyunun tüm durumunu tutar ve günceller
 */

export class GameState {
    constructor() {
        this.state = {
            // Oyun meta bilgileri
            gameActive: false,
            country: null,
            countryCode: null,
            startYear: null,
            currentYear: null,
            currentTurn: 0,
            maxTurns: 20,

            // 17 Ana Değişkenler (oyunun temel durumu)
            variables: {},

            // Faktör skorları
            statePower: 0,
            societyPower: 0,
            leviathanType: "Absent",

            // Paydaş grupları
            stakeholders: {
                military: { influence: 0.5, satisfaction: 0.5 },
                elite: { influence: 0.5, satisfaction: 0.5 },
                civil_society: { influence: 0.5, satisfaction: 0.5 },
                religious: { influence: 0.5, satisfaction: 0.5 },
                international: { influence: 0.5, satisfaction: 0.5 }
            },

            // Politik sermaye
            politicalCapital: {
                current: 100,
                max: 100,
                regenPerTurn: 20
            },

            // Oyun geçmişi
            history: {
                trail: [], // SVG trail için {statePower, societyPower, turn}
                policies: [], // Uygulanan politikalar
                events: [], // Oyun olayları
                crises: [] // Kriz olayları
            },

            // Skor
            scores: {
                freedom: 0,
                balance: 0,
                democracy: 0,
                stability: 0
            }
        };
    }

    /**
     * Oyunu başlat
     * @param {string} country - Ülke adı
     * @param {string} countryCode - Ülke kodu (TUR, USA, vb.)
     * @param {number} year - Başlangıç yılı
     * @param {Object} initialVariables - 17 değişkenin başlangıç değerleri
     * @param {Object} initialStakeholders - Paydaş başlangıç değerleri
     * @param {Object} initialFactors - {statePower, societyPower}
     */
    initializeGame(country, countryCode, year, initialVariables, initialStakeholders, initialFactors) {
        this.state.gameActive = true;
        this.state.country = country;
        this.state.countryCode = countryCode;
        this.state.startYear = year;
        this.state.currentYear = year;
        this.state.currentTurn = 0;

        // 17 değişkeni kopyala
        this.state.variables = { ...initialVariables };

        // Faktörleri ayarla
        this.state.statePower = initialFactors.statePower;
        this.state.societyPower = initialFactors.societyPower;
        this.state.leviathanType = initialFactors.leviathanType || 'Absent';

        // Paydaşları ayarla
        if (initialStakeholders) {
            for (const [group, data] of Object.entries(initialStakeholders)) {
                this.state.stakeholders[group] = { ...data };
            }
        }

        // İlk pozisyonu trail'e ekle
        this.state.history.trail.push({
            statePower: this.state.statePower,
            societyPower: this.state.societyPower,
            turn: 0
        });

        // Başlangıç olayı ekle
        this.addEvent(`🎮 Oyun başladı: ${country} (${year})`);

        console.log('✓ Oyun başlatıldı:', {
            country,
            year,
            statePower: this.state.statePower,
            societyPower: this.state.societyPower,
            variables: Object.keys(this.state.variables).length
        });
    }

    /**
     * Değişkenleri güncelle
     * @param {Object} newVariables - Yeni 17 değişken değerleri
     */
    updateVariables(newVariables) {
        this.state.variables = { ...newVariables };
    }

    /**
     * Faktörleri güncelle
     * @param {Object} factors - {statePower, societyPower, leviathanType}
     */
    updateFactors(factors) {
        this.state.statePower = factors.statePower;
        this.state.societyPower = factors.societyPower;
        this.state.leviathanType = factors.leviathanType;

        // Trail'e ekle
        this.state.history.trail.push({
            statePower: factors.statePower,
            societyPower: factors.societyPower,
            turn: this.state.currentTurn
        });
    }

    /**
     * Paydaş memnuniyetlerini güncelle
     * @param {Object} reactions - {military: -0.1, elite: 0.05, ...}
     */
    updateStakeholders(reactions) {
        for (const [group, reaction] of Object.entries(reactions)) {
            if (this.state.stakeholders[group]) {
                // Satisfaction'ı güncelle (-1.0 ile +1.0 arası)
                let newSatisfaction = this.state.stakeholders[group].satisfaction + reaction;
                newSatisfaction = Math.max(0, Math.min(1, newSatisfaction));
                this.state.stakeholders[group].satisfaction = parseFloat(newSatisfaction.toFixed(3));
            }
        }
    }

    /**
     * Politik sermayeyi harca
     * @param {number} cost - Harcama miktarı
     * @returns {boolean} Başarılı oldu mu?
     */
    spendPoliticalCapital(cost) {
        if (this.state.politicalCapital.current >= cost) {
            this.state.politicalCapital.current -= cost;
            return true;
        }
        return false;
    }

    /**
     * Tur sonu işlemleri
     */
    endTurn() {
        this.state.currentTurn++;
        this.state.currentYear++;

        // Politik sermaye rejenerasyonu
        const newCapital = Math.min(
            this.state.politicalCapital.current + this.state.politicalCapital.regenPerTurn,
            this.state.politicalCapital.max
        );
        this.state.politicalCapital.current = newCapital;

        this.addEvent(`📅 Tur ${this.state.currentTurn} tamamlandı (${this.state.currentYear})`);

        console.log(`Tur ${this.state.currentTurn} bitti:`, {
            year: this.state.currentYear,
            capital: this.state.politicalCapital.current,
            statePower: this.state.statePower,
            societyPower: this.state.societyPower
        });
    }

    /**
     * Politika geçmişine ekle
     * @param {Object} policy - Politika bilgisi
     */
    addPolicyToHistory(policy) {
        this.state.history.policies.push({
            turn: this.state.currentTurn,
            year: this.state.currentYear,
            title: policy.title,
            cost: policy.cost,
            effects: policy.effects
        });
    }

    /**
     * Olay ekle
     * @param {string} message - Olay mesajı
     */
    addEvent(message) {
        this.state.history.events.push({
            turn: this.state.currentTurn,
            year: this.state.currentYear,
            message: message,
            timestamp: Date.now()
        });

        // Son 50 olayı tut
        if (this.state.history.events.length > 50) {
            this.state.history.events.shift();
        }
    }

    /**
     * Kriz kontrolü
     * @returns {Object|null} Kriz bilgisi veya null
     */
    checkCrisis() {
        for (const [group, data] of Object.entries(this.state.stakeholders)) {
            // Kriz şartı: satisfaction < 0.2 VE influence > 0.6
            if (data.satisfaction < 0.2 && data.influence > 0.6) {
                return {
                    group: group,
                    influence: data.influence,
                    satisfaction: data.satisfaction,
                    message: this._getCrisisMessage(group)
                };
            }
        }
        return null;
    }

    _getCrisisMessage(group) {
        const messages = {
            military: "⚠ ASKERİ DARBЕ TEHDİDİ: Ordu müdahale etmeye hazırlanıyor!",
            elite: "⚠ EKONOMİK KRİZ: Ekonomik elitler sistemi boykot ediyor!",
            civil_society: "⚠ KITLE HAREKETİ: Sivil toplum ayaklandı, sokaklar karıştı!",
            religious: "⚠ DİNİ GERİLİM: Dini kurumlar rejime karşı harekete geçti!",
            international: "⚠ ULUSLARARASI İZOLASYON: Dış güçler yaptırım uyguluyor!"
        };
        return messages[group] || "⚠ KRİZ!";
    }

    /**
     * Oyun bitti mi?
     * @returns {boolean}
     */
    isGameOver() {
        return this.state.currentTurn >= this.state.maxTurns;
    }

    /**
     * Final skorları hesapla
     * @returns {Object} {freedom, balance, democracy, stability, total}
     */
    calculateFinalScores() {
        // Özgürlük skoru: Liberal + Katılımcı demokrasi
        const freedom = Math.round(
            ((this.state.variables.v2x_libdem + this.state.variables.v2x_partipdem) / 2) * 100
        );

        // Denge skoru: Shackled'a ne kadar yakın?
        // İdeal: statePower > 0, societyPower > 0
        let balance = 50;
        if (this.state.statePower > 0 && this.state.societyPower > 0) {
            // Her ikisi de pozitif - iyi
            balance = 70 + Math.min(30, (this.state.statePower + this.state.societyPower) * 10);
        } else if (this.state.statePower > 0 || this.state.societyPower > 0) {
            // Biri pozitif - orta
            balance = 50;
        } else {
            // İkisi de negatif - kötü
            balance = 30;
        }

        // Demokrasi skoru: freedom ile aynı
        const democracy = freedom;

        // Stabilite skoru: Paydaş memnuniyetlerinin ortalaması
        const satisfactions = Object.values(this.state.stakeholders).map(s => s.satisfaction);
        const stability = Math.round(
            (satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length) * 100
        );

        // Toplam
        const total = Math.round((freedom + balance + democracy + stability) / 4);

        this.state.scores = { freedom, balance, democracy, stability, total };

        return this.state.scores;
    }

    /**
     * State'in tamamını al
     * @returns {Object}
     */
    getState() {
        return this.state;
    }

    /**
     * Oyunu sıfırla
     */
    reset() {
        this.state = {
            gameActive: false,
            country: null,
            countryCode: null,
            startYear: null,
            currentYear: null,
            currentTurn: 0,
            maxTurns: 20,
            variables: {},
            statePower: 0,
            societyPower: 0,
            leviathanType: "Absent",
            stakeholders: {
                military: { influence: 0.5, satisfaction: 0.5 },
                elite: { influence: 0.5, satisfaction: 0.5 },
                civil_society: { influence: 0.5, satisfaction: 0.5 },
                religious: { influence: 0.5, satisfaction: 0.5 },
                international: { influence: 0.5, satisfaction: 0.5 }
            },
            politicalCapital: {
                current: 100,
                max: 100,
                regenPerTurn: 20
            },
            history: {
                trail: [],
                policies: [],
                events: []
            },
            scores: {
                freedom: 0,
                balance: 0,
                democracy: 0,
                stability: 0
            }
        };

        console.log('✓ Oyun sıfırlandı');
    }
}
