/**
 * Factor Calculator
 * 17 V-Dem değişkenini 2 faktöre (State Power, Society Power) dönüştürür
 */

export class FactorCalculator {
    constructor(loadingsData) {
        this.loadings = loadingsData.loadings; // {factor1_state: [...], factor2_society: [...]}
        this.variables = loadingsData.variables; // 17 değişken adları sıralı
        this.explainedVariance = loadingsData.metadata.explained_variance;

        console.log('FactorCalculator başlatıldı:', {
            variables: this.variables.length,
            factor1Variance: (this.explainedVariance.factor1_state * 100).toFixed(1) + '%',
            factor2Variance: (this.explainedVariance.factor2_society * 100).toFixed(1) + '%'
        });
    }

    /**
     * 17 değişkenden 2 faktör hesapla
     * Formül: Factor = Σ(variable[i] × loading[i])
     *
     * @param {Object} variables17 - 17 değişken değerleri {v2x_libdem: 0.5, ...}
     * @returns {Object} {statePower, societyPower}
     */
    calculateFactors(variables17) {
        // Değişkenleri standardize et (mean=0, std=1)
        const standardized = this._standardize(variables17);

        let statePower = 0;
        let societyPower = 0;

        // Matris çarpımı
        for (let i = 0; i < this.variables.length; i++) {
            const varName = this.variables[i];
            const varValue = standardized[varName] || 0;

            statePower += varValue * this.loadings.factor1_state[i];
            societyPower += varValue * this.loadings.factor2_society[i];
        }

        // Faktör skorlarını sınırla (-3 ile +3 arasında)
        // Bu, aşırı değerlerin (örn: -9, +12) oluşmasını önler
        const MIN_FACTOR = -3;
        const MAX_FACTOR = 3;
        statePower = Math.max(MIN_FACTOR, Math.min(MAX_FACTOR, statePower));
        societyPower = Math.max(MIN_FACTOR, Math.min(MAX_FACTOR, societyPower));

        return {
            statePower: parseFloat(statePower.toFixed(4)),
            societyPower: parseFloat(societyPower.toFixed(4))
        };
    }

    /**
     * Değişkenleri standardize et (z-score)
     * Not: Gerçek uygulamada, tüm veri setinden hesaplanan mean/std kullanılmalı
     * Şimdilik basitleştirilmiş versiyon
     */
    _standardize(variables17) {
        const standardized = {};

        // V-Dem değişkenleri için yaklaşık mean/std değerleri
        // (Gerçek değerler veri setinden gelecek)
        const stats = {
            v2x_libdem: { mean: 0.22, std: 0.21 },
            v2x_partipdem: { mean: 0.16, std: 0.16 },
            v2x_delibdem: { mean: 0.24, std: 0.24 },
            v2x_egaldem: { mean: 0.24, std: 0.20 },
            v2x_freexp: { mean: 0.43, std: 0.29 },
            v2mecenefm: { mean: -0.21, std: 1.45 },
            v2x_cspart: { mean: 0.37, std: 0.27 },
            v2cseeorgs: { mean: -0.18, std: 1.52 },
            v2cscnsult: { mean: -0.42, std: 1.42 },
            v2x_elecreg: { mean: 0.57, std: 0.41 },
            v2x_elecoff: { mean: 0.44, std: 0.43 },
            v2juhcind: { mean: 0.08, std: 1.61 },
            v2juaccnt: { mean: 0.36, std: 1.42 },
            v2x_corr: { mean: 0.44, std: 0.28 },
            v2x_rule: { mean: 0.49, std: 0.30 },
            v2xcs_ccsi: { mean: 0.42, std: 0.27 },
            v2x_frassoc_thick: { mean: 0.39, std: 0.26 }
        };

        for (const [varName, value] of Object.entries(variables17)) {
            const stat = stats[varName];
            if (stat) {
                // Z-score: (x - mean) / std
                standardized[varName] = (value - stat.mean) / stat.std;
            } else {
                // Varsayılan: standardize etme
                standardized[varName] = value;
            }
        }

        return standardized;
    }

    /**
     * Faktörleri leviathan tipine çevir
     * @param {number} statePower - Devlet gücü faktörü
     * @param {number} societyPower - Toplum gücü faktörü
     * @returns {string} "Shackled" | "Despotic" | "Paper" | "Absent"
     */
    getLeviathanType(statePower, societyPower) {
        // Dar koridor teorisi sınıflandırması
        // Medyan değerleri threshold olarak kullan (yaklaşık 0)

        if (statePower >= 0 && societyPower >= 0) {
            return "Shackled"; // Kayıtlı Leviathan (ideal)
        } else if (statePower >= 0 && societyPower < 0) {
            return "Despotic"; // Despotik Leviathan
        } else if (statePower < 0 && societyPower >= 0) {
            return "Paper"; // Kağıt Leviathan
        } else {
            return "Absent"; // Yokluğun Derinlikleri
        }
    }

    /**
     * Faktör skorlarını 0-100 arasına normalize et (UI için)
     * @param {number} factorScore - Ham faktör skoru
     * @returns {number} 0-100 arası normalized skor
     */
    normalizeForUI(factorScore) {
        // Faktör skorları genelde -3 ile +3 arasında
        // -3 → 0, 0 → 50, +3 → 100
        const normalized = ((factorScore + 3) / 6) * 100;
        return Math.max(0, Math.min(100, Math.round(normalized)));
    }

    /**
     * Özgürlük skorunu hesapla (basitleştirilmiş)
     * @param {Object} variables17 - 17 değişken değerleri
     * @returns {number} 0-100 arası özgürlük skoru
     */
    calculateFreedomScore(variables17) {
        // Basit formül: (v2x_libdem + v2x_partipdem) / 2 * 100
        const libdem = variables17.v2x_libdem || 0;
        const partipdem = variables17.v2x_partipdem || 0;

        const score = ((libdem + partipdem) / 2) * 100;
        return Math.round(score);
    }
}
