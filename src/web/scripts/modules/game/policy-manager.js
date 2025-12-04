/**
 * Policy Manager
 * Politika önerilerini yönetir ve kullanıcıya sunar
 */

export class PolicyManager {
    constructor() {
        // Basit politika şablonları (örnek)
        this.policyTemplates = [
            {
                id: 1,
                title: "Basın Özgürlüğü Reformu",
                description: "Medya üzerindeki devlet kontrolünü azaltma, bağımsız gazeteciliği güçlendirme",
                category: "media",
                estimatedCost: 25
            },
            {
                id: 2,
                title: "Yargı Bağımsızlığı Güçlendirme",
                description: "Yargının siyasi etkilerden arındırılması, hakim ve savcı atamalarında reform",
                category: "judiciary",
                estimatedCost: 30
            },
            {
                id: 3,
                title: "Seçim Sistemi Reformu",
                description: "Adil ve şeffaf seçim sistemi, bağımsız seçim kurulları oluşturma",
                category: "elections",
                estimatedCost: 35
            },
            {
                id: 4,
                title: "Sivil Topluma Alan Açma",
                description: "STK'lara serbestlik, örgütlenme özgürlüğünü genişletme",
                category: "civil_society",
                estimatedCost: 20
            },
            {
                id: 5,
                title: "Eşitlik ve Kapsayıcılık Politikaları",
                description: "Zenginlik eşitsizliğini azaltma, sosyal güvenlik ağı güçlendirme",
                category: "equality",
                estimatedCost: 40
            },
            {
                id: 6,
                title: "Anayasal Reformlar",
                description: "Kuvvetler ayrılığını güçlendirme, denge ve denetim mekanizmaları",
                category: "constitution",
                estimatedCost: 50
            },
            {
                id: 7,
                title: "Şeffaflık ve Hesap Verebilirlik",
                description: "Bilgi edinme hakkını genişletme, kamu denetimi mekanizmaları",
                category: "transparency",
                estimatedCost: 25
            },
            {
                id: 8,
                title: "Güvenlik Reformu",
                description: "Polis ve ordu üzerinde sivil kontrolü artırma, insan hakları eğitimi",
                category: "security",
                estimatedCost: 45
            }
        ];

        this.currentPolicySet = [];
    }

    /**
     * Oyun bağlamına göre 3-4 politika öner
     * @param {Object} gameState - Oyun durumu
     * @returns {Array} Önerilen politikalar
     */
    generatePolicyOptions(gameState) {
        // Basit versiyon: Random 4 politika seç
        const shuffled = [...this.policyTemplates].sort(() => Math.random() - 0.5);
        this.currentPolicySet = shuffled.slice(0, 4);

        console.log('✓ 4 politika önerisi oluşturuldu');

        return this.currentPolicySet;
    }

    /**
     * Manuel politika girişi
     * @param {string} title - Politika başlığı
     * @param {string} description - Politika açıklaması
     * @returns {Object} Politika objesi
     */
    createCustomPolicy(title, description) {
        return {
            id: 'custom_' + Date.now(),
            title: title,
            description: description,
            category: "custom",
            estimatedCost: 30 // Varsayılan
        };
    }

    /**
     * Politika ID'sine göre getir
     * @param {string|number} policyId
     * @returns {Object|null}
     */
    getPolicyById(policyId) {
        const found = this.policyTemplates.find(p => p.id == policyId);
        if (found) return found;

        // Mevcut set'te ara
        return this.currentPolicySet.find(p => p.id == policyId) || null;
    }
}
