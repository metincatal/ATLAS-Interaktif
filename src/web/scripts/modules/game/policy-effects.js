/**
 * Policy Effects Calculator
 * Politika etkilerini AI ile analiz eder ve değişken değişimlerini hesaplar
 */

import { API_CONFIG, getOllamaUrl } from '../../config/api-config.js';
import { INTENSITY_MULTIPLIERS, MAX_VARIABLE_CHANGE } from './game-constants.js';

export class PolicyEffectsCalculator {
    constructor(volatilityData, correlationMatrix) {
        this.sigmaValues = volatilityData.variables; // 4500+ değişken için sigma değerleri
        this.correlationMatrix = correlationMatrix.correlations; // 2318 değişken × 17 ana değişken
        this.core17Variables = correlationMatrix.metadata.core_variables; // 17 ana değişken listesi

        // Şiddet çarpanları (game-constants.js'den import ediliyor)
        // Orijinal değerler (0.5, 1.0, 2.5, 4.0) çok yüksekti ve radikal değişimlere neden oluyordu
        this.intensityMultipliers = INTENSITY_MULTIPLIERS;
    }

    /**
     * Politikayı AI ile analiz et
     * @param {string} policyTitle - Politika başlığı
     * @param {string} policyDescription - Politika açıklaması
     * @param {Object} context - Oyun bağlamı (ülke, yıl, faktörler)
     * @returns {Promise<Object>} AI analiz sonucu
     */
    async analyzePolicyWithAI(policyTitle, policyDescription, context) {
        const prompt = this._buildPrompt(policyTitle, policyDescription, context);

        try {
            const response = await fetch(getOllamaUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: API_CONFIG.ollama.model,
                    prompt: prompt,
                    stream: false,
                    options: API_CONFIG.ollama.options
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API hatası: ${response.status}`);
            }

            const data = await response.json();
            let aiResponse = data.response;

            // JSON'u temizle (markdown code block varsa)
            if (aiResponse.includes('```json')) {
                aiResponse = aiResponse.split('```json')[1].split('```')[0];
            } else if (aiResponse.includes('```')) {
                aiResponse = aiResponse.split('```')[1].split('```')[0];
            }

            const parsed = JSON.parse(aiResponse.trim());

            console.log('✓ AI analizi tamamlandı:', {
                variables: Object.keys(parsed.variables || {}).length,
                stakeholders: Object.keys(parsed.stakeholders || {}).length,
                cost: parsed.political_cost
            });

            return parsed;

        } catch (error) {
            console.error('❌ AI analizi hatası:', error);

            // Fallback: Basit default analiz
            return this._getFallbackAnalysis(policyTitle);
        }
    }

    /**
     * AI promptunu oluştur (PRD'deki prompt)
     */
    _buildPrompt(policyTitle, policyDescription, context) {
        return `Sen bir siyaset bilimcisin. Bir politika analizi yapacaksın.

POLİTİKA:
Başlık: ${policyTitle}
Açıklama: ${policyDescription}

Bağlam:
- Ülke: ${context.country}
- Yıl: ${context.year}
- Mevcut Faktörler: Devlet Gücü=${context.statePower}, Toplum Gücü=${context.societyPower}

GÖREVİN:
Aşağıdaki 17 V-Dem değişkeninden bu politika HANGİLERİNİ etkiler? (Maksimum 5 değişken seç)

DEĞİŞKENLER:
1. v2x_libdem (Liberal Demokrasi İndeksi, 0-1)
2. v2x_partipdem (Katılımcı Demokrasi İndeksi, 0-1)
3. v2x_delibdem (Müzakereci Demokrasi İndeksi, 0-1)
4. v2x_egaldem (Eşitlikçi Demokrasi İndeksi, 0-1)
5. v2x_freexp (İfade ve İnanç Özgürlüğü, 0-1)
6. v2mecenefm (Medya Sansürü Çabaları, 0-4, yüksek=kötü)
7. v2x_cspart (Sivil Toplum Katılımı, 0-1)
8. v2cseeorgs (Örgütlenme Özgürlüğü, 0-4)
9. v2cscnsult (Sivil Toplum Danışması, 0-4)
10. v2x_elecreg (Seçim Rejimi, 0-1)
11. v2x_elecoff (Seçimle İşbaşına Gelme, 0-1)
12. v2juhcind (Yargı Bağımsızlığı, 0-4)
13. v2juaccnt (Hesap Verilebilirlik, 0-4)
14. v2x_corr (Politik Yolsuzluk, 0-1, yüksek=kötü)
15. v2x_rule (Hukuk Üstünlüğü, 0-1)
16. v2xcs_ccsi (Core Civil Society Index, 0-1)
17. v2x_frassoc_thick (Association Freedom, 0-1)

Her değişken için belirle:
- direction: 1 (artış) veya -1 (azalış)
- intensity: "Soft", "Moderate", "Radical", veya "Extreme"
- reasoning: Kısa açıklama (1 cümle)

Ayrıca 5 baskı grubunun tepkisini belirle (-1.0 ~ +1.0):
- military (Ordu)
- elite (Ekonomik Seçkinler)
- civil_society (Sivil Toplum)
- religious (Dini Kurumlar)
- international (Uluslararası Toplum)

Ve politik sermaye maliyetini belirle: 10, 25, 50, veya 80

SADECE JSON formatında dön:
{
  "variables": {
    "değişken_adı": {
      "direction": 1 or -1,
      "intensity": "Soft"|"Moderate"|"Radical"|"Extreme",
      "reasoning": "..."
    }
  },
  "stakeholders": {
    "military": -0.15,
    "elite": 0.05,
    "civil_society": 0.20,
    "religious": 0.0,
    "international": 0.10
  },
  "political_cost": 25
}`;
    }

    /**
     * AI analizinden değişken değişimlerini hesapla
     * Formül: Δ = Yön × σ × Şiddet_Çarpanı
     * @param {Object} aiAnalysis - AI'dan gelen analiz
     * @returns {Object} 17 ana değişken için değişim miktarları
     */
    calculateVariableChanges(aiAnalysis) {
        const changes17 = {};

        // Her ana değişken için sıfırla
        for (const coreVar of this.core17Variables) {
            changes17[coreVar] = 0;
        }

        // AI'ın seçtiği değişkenler üzerinde dön
        for (const [variable, effect] of Object.entries(aiAnalysis.variables || {})) {
            // Eğer bu değişken 17 ana değişkenden biriyse, direkt uygula
            if (this.core17Variables.includes(variable)) {
                const sigma = this.sigmaValues[variable]?.sigma || 0.05;
                const intensityMultiplier = this.intensityMultipliers[effect.intensity] || 0.5;
                const direction = effect.direction;

                // FORMÜL: Δ = Yön × σ × Şiddet
                let change = direction * sigma * intensityMultiplier;
                
                // Değişken bazlı maksimum değişim sınırı uygula
                change = Math.max(-MAX_VARIABLE_CHANGE, Math.min(MAX_VARIABLE_CHANGE, change));
                changes17[variable] += change;

                console.log(`  ${variable}: ${direction > 0 ? '+' : ''}${change.toFixed(4)} (σ=${sigma.toFixed(4)}, ${effect.intensity})`);
            }
            // Eğer bu değişken 500+ listeden biriyse, korelasyon ile yayılım
            else if (this.correlationMatrix[variable]) {
                const sigma = this.sigmaValues[variable]?.sigma || 0.05;
                const intensityMultiplier = this.intensityMultipliers[effect.intensity] || 0.5;
                const direction = effect.direction;

                // FORMÜL: Δ = Yön × σ × Şiddet
                let change = direction * sigma * intensityMultiplier;
                
                // Değişken bazlı maksimum değişim sınırı uygula
                change = Math.max(-MAX_VARIABLE_CHANGE, Math.min(MAX_VARIABLE_CHANGE, change));

                // Korelasyon ile 17 ana değişkene yayılım
                const correlations = this.correlationMatrix[variable];
                for (const [coreVar, correlation] of Object.entries(correlations)) {
                    if (Math.abs(correlation) >= 0.3) {
                        let propagatedChange = change * correlation;
                        // Yayılan değişimi de sınırla
                        propagatedChange = Math.max(-MAX_VARIABLE_CHANGE, Math.min(MAX_VARIABLE_CHANGE, propagatedChange));
                        changes17[coreVar] += propagatedChange;
                    }
                }

                console.log(`  ${variable} → 17 ana değişkene yayılım (σ=${sigma.toFixed(4)}, ${effect.intensity})`);
            }
        }

        return changes17;
    }

    /**
     * Değişimleri gerçekçi sınırlar içinde tut
     * @param {Object} currentVariables - Mevcut 17 değişken değerleri
     * @param {Object} changes - Hesaplanan değişimler
     * @returns {Object} Sınırlanmış yeni değerler
     */
    applyRealisticConstraints(currentVariables, changes) {
        const newVariables = {};

        for (const [variable, currentValue] of Object.entries(currentVariables)) {
            const change = changes[variable] || 0;
            let newValue = currentValue + change;

            // Min-max sınırları
            const varData = this.sigmaValues[variable];
            if (varData) {
                const min = varData.min;
                const max = varData.max;
                newValue = Math.max(min, Math.min(max, newValue));
            } else {
                // Varsayılan sınırlar
                newValue = Math.max(0, Math.min(1, newValue));
            }

            newVariables[variable] = newValue;
        }

        return newVariables;
    }

    /**
     * Fallback analiz (AI başarısız olursa)
     */
    _getFallbackAnalysis(policyTitle) {
        console.warn('⚠ Fallback analiz kullanılıyor');

        return {
            variables: {
                "v2x_libdem": {
                    direction: 1,
                    intensity: "Soft",
                    reasoning: "Genel demokrasi iyileşmesi (fallback)"
                }
            },
            stakeholders: {
                military: 0.0,
                elite: 0.0,
                civil_society: 0.1,
                religious: 0.0,
                international: 0.0
            },
            political_cost: 25
        };
    }
}
