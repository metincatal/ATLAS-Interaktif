/**
 * Game UI Manager - PRD'ye uygun tam implementasyon
 * Sol Panel: Baskı Grupları + Olaylar
 * Orta Panel: Ülke Başlık + Dar Koridor + Dashboard
 * Sağ Panel: Politik Sermaye + 6 Politika Kartı + AI Yardımcı + Önizleme + Butonlar
 */

import { API_CONFIG, getOllamaUrl } from '../../config/api-config.js';

export class GameUI {
    constructor() {
        // DOM elementlerini al
        this.elements = {
            // Orta Panel - Ülke Başlık
            countryNameDisplay: document.getElementById('country-name-display'),
            statePowerDisplay: document.getElementById('state-power-display'),
            societyPowerDisplay: document.getElementById('society-power-display'),

            // Orta Panel - Dar Koridor
            countryDot: document.getElementById('country-dot'),
            corridorTooltip: document.getElementById('corridor-tooltip'),

            // Orta Panel - Dashboard
            currentYear: document.getElementById('current-year'),
            currentTurn: document.getElementById('current-turn'),
            maxTurns: document.getElementById('max-turns'),
            freedomScore: document.getElementById('freedom-score'),
            leviathanBadge: document.getElementById('leviathan-badge'),

            // Sol Panel - Baskı Grupları
            stakeholdersList: document.getElementById('stakeholders-list'),

            // Sol Panel - Olaylar
            eventsList: document.getElementById('events-list'),

            // Sağ Panel - Politik Sermaye
            capitalFill: document.getElementById('capital-fill'),
            capitalCurrent: document.getElementById('capital-current'),
            capitalMax: document.getElementById('capital-max'),

            // Sağ Panel - Politika Kartları
            policyGrid: document.getElementById('policy-grid'),
            generateMoreBtn: document.getElementById('generate-more-btn'),
            previewBox: document.getElementById('preview-box'),
            applyPolicyBtn: document.getElementById('apply-policy-btn'),
            writePolicyBtn: document.getElementById('write-policy-btn'),

            // AI Yardımcı
            aiHelperSection: document.getElementById('ai-helper-section'),
            aiChatContainer: document.getElementById('ai-chat-container'),
            aiInput: document.getElementById('ai-input'),
            aiSendBtn: document.getElementById('ai-send-btn')
        };

        // Seçili politikalar (multi-select için array)
        this.selectedPolicies = [];
        this.policyCards = []; // Politika verilerini tutmak için
        this.manualPolicyCard = null; // Manuel oluşturulan politika kartı

        // HAFIZA (Memory) - sonra uygulamak için saklanan politikalar
        this.memoryPolicies = [];
        this.isMemoryOpen = false;
        this.isPolicyDetailOpen = false;
        this.currentDetailPolicy = null;

        // Önceki stakeholder değerlerini tutmak için (değişim göstergesi)
        this.previousStakeholders = {};

        // Oyun state referansı
        this.currentGameState = null;

        // İz bırakma özelliği (sadece game-play.html için)
        this.trailEnabled = true;
        this.isFirstPosition = true; // İlk pozisyonlamada iz bırakma
        this.isResizing = false; // Resize sırasında iz bırakma
        this.shouldTrail = false; // Sadece politika uygulandığında true olur

        // Mevcut corridor state (resize için)
        this.currentCorridorState = null;

        // Resize handler kur
        this.setupResizeHandler();

        // Event listener'ları kur
        this.setupEventListeners();
    }

    /**
     * Resize handler - ekran boyutu değiştiğinde noktayı yeniden konumlandır
     */
    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.currentCorridorState) {
                    // Resize sırasında iz bırakma
                    this.isResizing = true;
                    this.updateCorridorDot(this.currentCorridorState);
                    this.isResizing = false;
                }
            }, 100);
        });
    }

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners() {
        // Manuel politika yazma butonu
        if (this.elements.writePolicyBtn) {
            this.elements.writePolicyBtn.addEventListener('click', () => {
                this.showManualPolicyForm();
            });
        }

        // Daha fazla politika üret butonu
        if (this.elements.generateMoreBtn) {
            this.elements.generateMoreBtn.addEventListener('click', () => {
                this.generateMorePolicies();
            });
        }

        // AI yardımcı gönder butonu
        if (this.elements.aiSendBtn) {
            this.elements.aiSendBtn.addEventListener('click', () => {
                this.sendAIMessage();
            });
        }

        // AI input enter tuşu
        if (this.elements.aiInput) {
            this.elements.aiInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendAIMessage();
                }
            });
        }
    }

    /**
     * Yükleme göster
     */
    showLoading(message = 'Yükleniyor...') {
        if (this.elements.leviathanBadge) {
            this.elements.leviathanBadge.textContent = message;
        }
    }

    /**
     * Oyun durumunu güncelle (ANA FONKSIYON)
     * @param {Object} state - GameState
     */
    updateGameState(state) {
        console.log('🎨 UI güncelleniyor:', state);

        // Önceki stakeholder değerlerini kaydet (ilk güncellemede)
        if (Object.keys(this.previousStakeholders).length === 0 && state.stakeholders) {
            for (const [key, data] of Object.entries(state.stakeholders)) {
                this.previousStakeholders[key] = { ...data };
            }
        }

        // State referansını kaydet
        this.currentGameState = state;

        // Ülke başlık alanını güncelle
        this.updateCountryHeader(state);

        // Dashboard güncelle
        this.updateDashboard(state);

        // Dar koridor noktasını güncelle
        this.updateCorridorDot(state);

        // Baskı gruplarını güncelle
        this.updateStakeholders(state);

        // Olayları güncelle
        this.updateEvents(state);

        // Politik sermayeyi güncelle
        this.updatePoliticalCapital(state);
    }

    /**
     * Ülke başlık alanını güncelle
     */
    updateCountryHeader(state) {
        if (this.elements.countryNameDisplay) {
            this.elements.countryNameDisplay.textContent = state.country || 'Ülke';
        }
        if (this.elements.statePowerDisplay) {
            this.elements.statePowerDisplay.textContent = (state.statePower || 0).toFixed(2);
        }
        if (this.elements.societyPowerDisplay) {
            this.elements.societyPowerDisplay.textContent = (state.societyPower || 0).toFixed(2);
        }
    }

    /**
     * Dashboard'u güncelle (Yıl, Tur, Özgürlük, Leviathan)
     */
    updateDashboard(state) {
        // Yıl
        if (this.elements.currentYear) {
            this.elements.currentYear.textContent = state.currentYear || '----';
        }

        // Tur
        if (this.elements.currentTurn) {
            this.elements.currentTurn.textContent = state.currentTurn || 0;
        }
        if (this.elements.maxTurns) {
            this.elements.maxTurns.textContent = state.maxTurns || 20;
        }

        // Özgürlük Skoru (v2x_libdem + v2x_partipdem) / 2 * 100
        if (this.elements.freedomScore && state.variables) {
            const libdem = state.variables.v2x_libdem || 0;
            const partipdem = state.variables.v2x_partipdem || 0;
            const freedom = Math.round(((libdem + partipdem) / 2) * 100);
            this.elements.freedomScore.textContent = `${freedom}/100`;
        }

        // Leviathan Badge
        if (this.elements.leviathanBadge) {
            const typeMap = {
                'Shackled': { text: 'Shackled', class: 'shackled' },
                'Despotic': { text: 'Despotic', class: 'despotic' },
                'Paper': { text: 'Paper', class: 'paper' },
                'Absent': { text: 'Absent', class: 'absent' }
            };

            const levType = state.leviathanType || 'Absent';
            const badgeData = typeMap[levType] || { text: levType, class: 'absent' };

            this.elements.leviathanBadge.textContent = badgeData.text;
            this.elements.leviathanBadge.className = 'leviathan-badge ' + badgeData.class;
        }
    }

    /**
     * Image'ın container içindeki gerçek render alanını hesaplar
     * object-fit: contain kullanıldığında image, container'dan küçük olabilir
     */
    getImageRenderBounds(img) {
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

    /**
     * Dar koridor noktasını güncelle (index.html ve game.html ile aynı mantık)
     * object-fit: contain ile uyumlu - gerçek render alanını hesaplar
     */
    updateCorridorDot(state) {
        const dot = this.elements.countryDot;
        const tooltip = this.elements.corridorTooltip;

        if (!dot) return;

        const container = dot.parentElement;
        const img = container.querySelector('img');

        if (!img) return;

        // State'i kaydet (resize için)
        this.currentCorridorState = state;

        const positionDot = () => {
            // Image naturalWidth kontrolü - yüklenmemişse bekle
            if (!img.naturalWidth || !img.naturalHeight) {
                dot.style.display = 'none';
                console.warn('Image henüz yüklenmedi, bekleniyor...');
                setTimeout(() => this.updateCorridorDot(state), 100);
                return;
            }

            // Faktör değerlerini al ve sınırla (-3 ile +3 arasında)
            const FACTOR_MIN = -3;
            const FACTOR_MAX = 3;
            const statePower = Math.max(FACTOR_MIN, Math.min(FACTOR_MAX, state.statePower || 0));
            const societyPower = Math.max(FACTOR_MIN, Math.min(FACTOR_MAX, state.societyPower || 0));

            // X ekseni: SocietyPower (Toplum Gücü) - soldan sağa
            // -3 → 0%, 0 → 50%, +3 → 100%
            let x = ((societyPower - FACTOR_MIN) / (FACTOR_MAX - FACTOR_MIN)) * 100;
            
            // Y ekseni: StatePower (Devlet Gücü) - alttan yukarıya
            // Y'yi ters çeviriyoruz çünkü grafik koordinatları üstten başlar
            // -3 → 100% (alt), 0 → 50% (orta), +3 → 0% (üst)
            let y = 100 - ((statePower - FACTOR_MIN) / (FACTOR_MAX - FACTOR_MIN)) * 100;

            // Kesin sınırlandırma: x ve y her zaman 0-100 arasında olmalı
            const MARGIN = 3; // Kenar boşluğu (noktanın tam kenarda olmaması için)
            x = Math.max(MARGIN, Math.min(100 - MARGIN, x));
            y = Math.max(MARGIN, Math.min(100 - MARGIN, y));

            // Image'ın gerçek render alanını hesapla
            const bounds = this.getImageRenderBounds(img);
            
            // Pixel pozisyonunu hesapla
            const dotLeft = bounds.offsetX + (bounds.width * x / 100);
            const dotTop = bounds.offsetY + (bounds.height * y / 100);

            // İz bırakma: SADECE shouldTrail true ise ve resize değilse
            const prevLeft = dot.style.left;
            const prevTop = dot.style.top;
            if (prevLeft && prevTop && this.trailEnabled && this.shouldTrail && !this.isResizing && !this.isFirstPosition) {
                this.addTrailDot(container, prevLeft, prevTop, state.leviathanType);
            }

            // İlk pozisyonlama tamamlandı
            if (this.isFirstPosition) {
                this.isFirstPosition = false;
            }

            // shouldTrail'i sıfırla (bir kez iz bıraktıktan sonra)
            this.shouldTrail = false;

            dot.style.left = `${dotLeft}px`;
            dot.style.top = `${dotTop}px`;
            dot.style.display = 'block';

            const levType = (state.leviathanType || 'Absent').toLowerCase();
            dot.className = 'country-dot ' + levType;

            this.setupCorridorTooltip(dot, tooltip, state);

            console.log(`✓ Nokta konumlandı: x=${x.toFixed(1)}%, y=${y.toFixed(1)}% => ${dotLeft.toFixed(1)}px, ${dotTop.toFixed(1)}px (${levType})`);
        };

        // Image'ın tam yüklenmesini bekle
        if (img.complete && img.naturalWidth) {
            positionDot();
        } else {
            dot.style.display = 'none'; // Yüklenene kadar gizle
            img.addEventListener('load', positionDot);
        }
    }

    /**
     * Politika uygulandığında iz bırakmayı aktifleştir
     */
    enableTrailForNextUpdate() {
        this.shouldTrail = true;
    }

    /**
     * İz noktası ekle (trail)
     */
    addTrailDot(container, left, top, leviathanType) {
        const trail = document.createElement('div');
        trail.className = 'trail-dot ' + (leviathanType || 'absent').toLowerCase();
        trail.style.cssText = `
            position: absolute;
            left: ${left};
            top: ${top};
            width: 8px;
            height: 8px;
            border-radius: 50%;
            opacity: 0.5;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 5;
        `;

        // Leviathan tipine göre renk
        const colors = {
            'shackled': '#10b981',
            'despotic': '#ef4444',
            'paper': '#f59e0b',
            'absent': '#8b5cf6'
        };
        trail.style.background = colors[(leviathanType || 'absent').toLowerCase()] || '#8b5cf6';

        container.appendChild(trail);

        // Trail noktalarını sınırla (max 20)
        const trails = container.querySelectorAll('.trail-dot');
        if (trails.length > 20) {
            trails[0].remove();
        }
    }

    /**
     * Koridor tooltip'ini kur
     */
    setupCorridorTooltip(dot, tooltip, state) {
        if (!dot || !tooltip) return;

        dot.onmouseenter = (e) => {
            tooltip.innerHTML = `
                <strong>${state.country || 'Ülke'}</strong><br>
                Devlet Gücü: ${(state.statePower || 0).toFixed(2)}<br>
                Toplum Gücü: ${(state.societyPower || 0).toFixed(2)}<br>
                Tip: ${state.leviathanType || 'Unknown'}
            `;
            tooltip.style.display = 'block';
            this.updateTooltipPosition(e, tooltip);
        };

        dot.onmousemove = (e) => {
            this.updateTooltipPosition(e, tooltip);
        };

        dot.onmouseleave = () => {
            tooltip.style.display = 'none';
        };
    }

    /**
     * Tooltip pozisyonunu güncelle
     */
    updateTooltipPosition(e, tooltip) {
        const container = tooltip.parentElement;
        const rect = container.getBoundingClientRect();

        let left = e.clientX - rect.left + 15;
        let top = e.clientY - rect.top - 10;

        const tooltipRect = tooltip.getBoundingClientRect();
        if (left + tooltipRect.width > rect.width) {
            left = e.clientX - rect.left - tooltipRect.width - 15;
        }
        if (top < 0) {
            top = e.clientY - rect.top + 20;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    /**
     * Baskı gruplarını güncelle - değişim göstergesi ile
     */
    updateStakeholders(state) {
        const container = this.elements.stakeholdersList;
        if (!container) return;

        const stakeholders = state.stakeholders || {};

        const stakeholderData = {
            military: { abbr: 'ORD', name: 'Ordu' },
            elite: { abbr: 'EKO', name: 'Ekonomik Seçkinler' },
            civil_society: { abbr: 'STV', name: 'Sivil Toplum' },
            religious: { abbr: 'DIN', name: 'Dini Kurumlar' },
            international: { abbr: 'ULS', name: 'Uluslararası Toplum' }
        };

        let html = '';
        for (const [key, data] of Object.entries(stakeholders)) {
            const info = stakeholderData[key] || { abbr: 'GNL', name: key };
            const influence = (data.influence || 0.5) * 100;
            const satisfaction = (data.satisfaction || 0.5) * 100;

            // Önceki değerlerle karşılaştır
            const prevData = this.previousStakeholders[key] || { influence: 0.5, satisfaction: 0.5 };
            const prevInfluence = (prevData.influence || 0.5) * 100;
            const prevSatisfaction = (prevData.satisfaction || 0.5) * 100;

            const influenceChange = influence - prevInfluence;
            const satisfactionChange = satisfaction - prevSatisfaction;

            // Memnuniyet durumu (emoji yerine renk ve metin)
            const satisfactionStatus = satisfaction > 75 ? { text: 'Cok Iyi', class: 'status-excellent' } :
                                       satisfaction > 60 ? { text: 'Iyi', class: 'status-good' } :
                                       satisfaction > 40 ? { text: 'Normal', class: 'status-normal' } :
                                       satisfaction > 25 ? { text: 'Kotu', class: 'status-bad' } : 
                                       { text: 'Kritik', class: 'status-critical' };

            // Kriz kontrolü
            const hasCrisis = satisfaction < 20 && influence > 60;

            // Değişim göstergesi HTML
            const getChangeIndicator = (change) => {
                if (Math.abs(change) < 0.5) return '';
                const isPositive = change > 0;
                const sign = isPositive ? '+' : '';
                const cssClass = isPositive ? 'positive' : 'negative';
                return `<span class="change-indicator ${cssClass}">${sign}${change.toFixed(0)}%</span>`;
            };

            html += `
                <div class="stakeholder-item">
                    <div class="stakeholder-header">
                        <span class="stakeholder-badge">${info.abbr}</span>
                        <strong>${info.name}</strong>
                        <span class="mood-status ${satisfactionStatus.class}">${satisfactionStatus.text}</span>
                    </div>
                    <div class="stakeholder-bar">
                        <div class="bar-row">
                            <span class="bar-label">Etki:</span>
                            <div class="progress-bar">
                                <div class="progress-fill influence" style="width: ${influence}%;">
                                    ${getChangeIndicator(influenceChange)}
                                </div>
                            </div>
                            <span class="bar-value">${influence.toFixed(0)}%</span>
                        </div>
                        <div class="bar-row">
                            <span class="bar-label">Memnuniyet:</span>
                            <div class="progress-bar">
                                <div class="progress-fill satisfaction" style="width: ${satisfaction}%;">
                                    ${getChangeIndicator(satisfactionChange)}
                                </div>
                            </div>
                            <span class="bar-value">${satisfaction.toFixed(0)}%</span>
                        </div>
                    </div>
                    ${hasCrisis ? `<div class="crisis-warning">UYARI: ${info.name === 'Ordu' ? 'Darbe' : 'Kriz'} riski!</div>` : ''}
                </div>
            `;
        }

        container.innerHTML = html || '<p style="text-align: center; color: var(--text-muted);">Veri yok</p>';

        // Değişim gösterildikten sonra, 3 saniye sonra önceki değerleri güncelle
        setTimeout(() => {
            for (const [key, data] of Object.entries(stakeholders)) {
                this.previousStakeholders[key] = { ...data };
            }
        }, 3000);
    }

    /**
     * Olayları güncelle (Yeni tasarım - events-feed-center için)
     */
    updateEvents(state) {
        const container = this.elements.eventsList;
        if (!container) return;

        const events = state.history?.events || [];

        if (events.length === 0) {
            container.innerHTML = '<p class="events-placeholder">Henüz olay yok. Politika uyguladıkça olaylar burada görünecek.</p>';
            return;
        }

        const recentEvents = events.slice(-5).reverse();

        const html = recentEvents.map(event => {
            const sentiment = event.sentiment || 'neutral';
            const category = event.category || 'Genel';
            
            return `
                <div class="event-card ${sentiment}">
                    <div class="event-headline">${event.headline || event.message || 'Bir olay gerçekleşti'}</div>
                    ${event.details ? `<div class="event-details">${event.details}</div>` : ''}
                    <div class="event-meta">
                        <span class="event-category">${category}</span>
                        <span class="event-turn">Tur ${event.turn || 0} - ${state.currentYear || ''}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * AI ile gerçekçi olay üret
     * @param {Object} policy - Uygulanan politika
     * @param {Object} gameState - Oyun durumu
     * @param {Object} result - Politika sonucu
     * @returns {Object} Üretilen olay
     */
    async generateRealisticEvent(policy, gameState, result) {
        const prompt = `Sen bir haber editorusun. ${gameState.country} ulkesinde ${gameState.currentYear} yilinda "${policy.title}" politikasi uygulandi.

Politika aciklamasi: ${policy.description}

Sonuclar:
- Devlet Gucu: ${result.newFactors?.statePower?.toFixed(2) || 'degismedi'}
- Toplum Gucu: ${result.newFactors?.societyPower?.toFixed(2) || 'degismedi'}
- Yeni Durum: ${result.newFactors?.leviathanType || 'belirsiz'}

Bu politikanin sonucunda cikacak gercekci bir haber yaz. JSON formatinda yanit ver:
{
    "headline": "Kisa ve etkili haber basligi (max 12 kelime)",
    "details": "Kisa aciklama (1 cumle, max 20 kelime)",
    "sentiment": "positive veya negative veya neutral",
    "category": "Politika veya Ekonomi veya Toplum veya Uluslararasi"
}

SADECE JSON formatinda yanit ver, baska bir sey yazma.`;

        try {
            const response = await fetch(getOllamaUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: API_CONFIG.ollama.model,
                    prompt: prompt,
                    stream: false,
                    options: { ...API_CONFIG.ollama.options, num_predict: 300 }
                })
            });

            if (!response.ok) throw new Error('AI yanıt vermedi');

            const data = await response.json();
            const text = data.response.trim();

            // JSON'u parse et
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('JSON bulunamadı');

            const eventData = JSON.parse(jsonMatch[0]);
            
            return {
                headline: eventData.headline || `${policy.title} uygulandı`,
                details: eventData.details || '',
                sentiment: eventData.sentiment || 'neutral',
                category: eventData.category || 'Politika',
                turn: gameState.currentTurn,
                policy: policy.title
            };

        } catch (error) {
            console.warn('AI olay üretimi başarısız, fallback kullanılıyor:', error);
            return this.generateFallbackEvent(policy, gameState, result);
        }
    }

    /**
     * Fallback olay üret (AI başarısız olursa)
     */
    generateFallbackEvent(policy, gameState, result) {
        const sentimentTemplates = {
            positive: [
                { headline: `${policy.title} reformu başarıyla hayata geçti`, details: 'Kamuoyundan olumlu tepkiler alındı.' },
                { headline: `Hükümetin ${policy.title} hamlesi destek gördü`, details: 'Sivil toplum kuruluşları memnuniyetini dile getirdi.' },
                { headline: `${gameState.country} yeni bir döneme giriyor`, details: `${policy.title} politikası yürürlüğe girdi.` }
            ],
            negative: [
                { headline: `${policy.title} tartışmalara yol açtı`, details: 'Muhalefet eleştirilerini sıraladı.' },
                { headline: `${policy.title} kararı tepki çekti`, details: 'Bazı kesimlerden itirazlar yükseldi.' },
                { headline: `Hükümetin ${policy.title} politikası sorgulanıyor`, details: 'Uzmanlar olası risklere dikkat çekti.' }
            ],
            neutral: [
                { headline: `${policy.title} meclisten geçti`, details: 'Yeni düzenleme yürürlüğe girdi.' },
                { headline: `${gameState.country} hükümeti ${policy.title} kararı aldı`, details: 'Kamuoyu tepkileri bekleniyor.' },
                { headline: `${policy.title} resmi olarak ilan edildi`, details: 'Uygulama süreci başladı.' }
            ]
        };

        // Sonuca göre duygu belirle
        let sentiment = 'neutral';
        if (result.newFactors) {
            const stateDiff = (result.newFactors.statePower || 0) - (gameState.statePower || 0);
            const societyDiff = (result.newFactors.societyPower || 0) - (gameState.societyPower || 0);
            
            if (societyDiff > 0.1) sentiment = 'positive';
            else if (stateDiff > 0.2 && societyDiff < -0.1) sentiment = 'negative';
        }

        const templates = sentimentTemplates[sentiment];
        const template = templates[Math.floor(Math.random() * templates.length)];

        return {
            headline: template.headline,
            details: template.details,
            sentiment: sentiment,
            category: policy.category || 'Politika',
            turn: gameState.currentTurn,
            policy: policy.title
        };
    }

    /**
     * Olay ekle ve göster
     * @param {Object} event - Olay verisi
     */
    addEvent(event) {
        if (!this.currentGameState) return;
        
        if (!this.currentGameState.history) {
            this.currentGameState.history = { events: [] };
        }
        if (!this.currentGameState.history.events) {
            this.currentGameState.history.events = [];
        }

        this.currentGameState.history.events.push(event);
        this.updateEvents(this.currentGameState);
    }

    /**
     * Politik sermayeyi güncelle (dinamik max ve regen gösterimi)
     */
    updatePoliticalCapital(state) {
        const current = state.politicalCapital?.current || 100;
        const max = state.politicalCapital?.max || 100;
        const regen = state.politicalCapital?.regenPerTurn || 20;
        const baseRegen = state.politicalCapital?.baseRegen || regen;
        const percentage = (current / max) * 100;

        if (this.elements.capitalCurrent) {
            this.elements.capitalCurrent.textContent = Math.round(current);
        }
        if (this.elements.capitalMax) {
            this.elements.capitalMax.textContent = max;
        }
        if (this.elements.capitalFill) {
            this.elements.capitalFill.style.width = `${percentage}%`;

            // Düşük sermaye uyarısı
            if (percentage < 25) {
                this.elements.capitalFill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
            } else if (percentage < 50) {
                this.elements.capitalFill.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
            } else {
                this.elements.capitalFill.style.background = 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)';
            }
        }

        // Rejenerasyon bilgisini güncelle - renk kodlaması ile
        const regenDisplay = document.getElementById('capital-regen');
        if (regenDisplay) {
            regenDisplay.textContent = `(+${regen}/tur)`;

            // Regen durumuna göre renk
            if (regen > baseRegen) {
                regenDisplay.style.color = '#10b981'; // Yeşil - bonus
                regenDisplay.style.background = 'rgba(16, 185, 129, 0.1)';
            } else if (regen < baseRegen) {
                regenDisplay.style.color = '#ef4444'; // Kırmızı - ceza
                regenDisplay.style.background = 'rgba(239, 68, 68, 0.1)';
            } else {
                regenDisplay.style.color = '#10b981'; // Normal
                regenDisplay.style.background = 'rgba(16, 185, 129, 0.1)';
            }
        }

        // Tooltip ile detaylı bilgi
        const capitalIndicator = document.querySelector('.capital-indicator');
        if (capitalIndicator) {
            const bonusInfo = regen !== baseRegen
                ? `\nBaz: ${baseRegen}, Güncel: ${regen} (paydaş memnuniyetine göre)`
                : '';
            capitalIndicator.title = `Her turda +${regen} sermaye kazanırsınız\nLeviathan: ${state.leviathanType || 'Bilinmiyor'}${bonusInfo}`;
        }
    }

    /**
     * Politika kartlarını göster (8 adet - 2x4 grid)
     * @param {Array} policies - Politika listesi
     */
    showPolicyCards(policies) {
        const grid = this.elements.policyGrid;
        if (!grid) return;

        // 8 politikayı göster (2x4 grid)
        const cards = policies.slice(0, 8);
        this.policyCards = cards;

        // Overlay'leri policy-section'a ekle (grid'in dışına)
        const policySection = grid.closest('.policy-section');
        if (policySection) {
            // Eski overlay'leri temizle
            const existingMemoryOverlay = policySection.querySelector('#memory-overlay');
            const existingDetailOverlay = policySection.querySelector('#policy-detail-overlay');
            const existingMemoryBtn = policySection.querySelector('#memory-toggle-btn');
            
            if (existingMemoryOverlay) existingMemoryOverlay.remove();
            if (existingDetailOverlay) existingDetailOverlay.remove();
            if (existingMemoryBtn) existingMemoryBtn.remove();

            // Hafıza toggle butonu - policy-section'a ekle
            const memoryBtn = document.createElement('button');
            memoryBtn.className = `memory-toggle-btn${this.memoryPolicies.length > 0 ? ' has-items' : ''}`;
            memoryBtn.id = 'memory-toggle-btn';
            memoryBtn.dataset.count = this.memoryPolicies.length;
            memoryBtn.title = 'Hafıza - Kayıtlı Politikalar';
            memoryBtn.innerHTML = '<span></span><span></span><span></span>';
            policySection.appendChild(memoryBtn);

            // Hafıza overlay'i - policy-section'a ekle
            const memoryOverlay = document.createElement('div');
            memoryOverlay.className = 'memory-overlay';
            memoryOverlay.id = 'memory-overlay';
            memoryOverlay.innerHTML = `
                <div class="memory-header">
                    <div class="memory-title"><span class="memory-badge">HAFIZA</span> Kayitli Politikalar</div>
                    <button class="memory-close-btn" id="memory-close-btn">X</button>
                </div>
                <div class="memory-list" id="memory-list">
                    ${this.renderMemoryList()}
                </div>
            `;
            policySection.appendChild(memoryOverlay);

            // Policy detail overlay - policy-section'a ekle
            const detailOverlay = document.createElement('div');
            detailOverlay.className = 'policy-detail-overlay';
            detailOverlay.id = 'policy-detail-overlay';
            policySection.appendChild(detailOverlay);
        }

        // Politika kartları (sadece kartlar)
        let html = cards.map((policy, index) => `
            <div class="policy-card${policy.isManual ? ' manual-card' : ''}" data-policy-index="${index}">
                <div class="policy-checkbox"></div>
                <button class="favorite-btn" data-fav-index="${index}" title="Hafızaya Ekle">+</button>
                <button class="policy-expand-btn" data-expand-index="${index}" title="Detaylı Görüntüle">...</button>
                <div class="policy-card-title">${policy.title || 'Politika'}</div>
                <div class="policy-card-desc">${policy.description || 'Açıklama yok'}</div>
                <div class="policy-card-cost">${policy.cost || 25} Sermaye</div>
            </div>
        `).join('');

        grid.innerHTML = html;

        // Hafıza toggle butonu event listener (policy-section'da)
        const memoryToggleBtn = document.getElementById('memory-toggle-btn');
        if (memoryToggleBtn) {
            memoryToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMemoryOverlay();
            });
        }

        // Hafıza kapatma butonu
        const memoryCloseBtn = document.getElementById('memory-close-btn');
        if (memoryCloseBtn) {
            memoryCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeMemoryOverlay();
            });
        }

        // Kart tıklama event'lerini ekle
        grid.querySelectorAll('.policy-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                // Favori veya expand butonuna tıklanmadıysa seçimi toggle et
                if (!e.target.classList.contains('favorite-btn') &&
                    !e.target.classList.contains('policy-expand-btn')) {
                    this.togglePolicySelection(this.policyCards[index], card, index);
                }
            });
        });

        // Hafızaya ekle butonları için event listener
        grid.querySelectorAll('.favorite-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const favIndex = parseInt(btn.dataset.favIndex);
                this.toggleMemoryPolicy(this.policyCards[favIndex], btn);
            });
        });

        // Büyütme butonları için event listener
        grid.querySelectorAll('.policy-expand-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const expandIndex = parseInt(btn.dataset.expandIndex);
                this.showPolicyDetail(this.policyCards[expandIndex]);
            });
        });

        // Eğer manuel politika varsa seçili olarak işaretle
        if (this.manualPolicyCard) {
            const manualIndex = this.policyCards.findIndex(p => p.isManual);
            if (manualIndex >= 0) {
                const manualCardEl = grid.querySelector(`[data-policy-index="${manualIndex}"]`);
                if (manualCardEl) {
                    manualCardEl.classList.add('selected');
                    this.selectedPolicies = [this.policyCards[manualIndex]];
                    this.updateMultiPreview();
                    if (this.elements.applyPolicyBtn) {
                        this.elements.applyPolicyBtn.disabled = false;
                    }
                }
            }
        }

        // Hafızadaki politikaları işaretle
        this.updateMemoryButtonStates();
    }

    /**
     * Hafıza listesini render et
     */
    renderMemoryList() {
        if (this.memoryPolicies.length === 0) {
            return `
                <div class="memory-empty">
                    <div class="memory-empty-icon" style="font-size: 24px; font-weight: 700; color: var(--accent-primary);">+</div>
                    <div>Henüz hafızaya eklenmiş politika yok.</div>
                    <div style="margin-top: 4px; font-size: 10px; color: var(--text-muted);">
                        Kartlardaki + butonuna tıklayarak politikaları hafızaya ekleyebilirsiniz.
                    </div>
                </div>
            `;
        }

        return this.memoryPolicies.map((policy, i) => `
            <div class="memory-item" data-memory-index="${i}">
                <div class="memory-item-content">
                    <div class="memory-item-title">${policy.title}</div>
                    <div class="memory-item-desc">${policy.description}</div>
                </div>
                <div class="memory-item-cost">${policy.cost} PS</div>
                <button class="memory-item-remove" data-memory-remove="${i}" title="Hafızadan Cikar">x</button>
            </div>
        `).join('');
    }

    /**
     * Hafıza overlay'ini aç/kapat
     */
    toggleMemoryOverlay() {
        const overlay = document.getElementById('memory-overlay');
        if (!overlay) return;

        this.isMemoryOpen = !this.isMemoryOpen;

        if (this.isMemoryOpen) {
            overlay.classList.add('active');
            this.setupMemoryListeners();
        } else {
            overlay.classList.remove('active');
        }
    }

    /**
     * Hafıza overlay'ini kapat
     */
    closeMemoryOverlay() {
        const overlay = document.getElementById('memory-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            this.isMemoryOpen = false;
        }
    }

    /**
     * Hafıza liste event listener'larını kur
     */
    setupMemoryListeners() {
        const memoryList = document.getElementById('memory-list');
        if (!memoryList) return;

        // Politika seçme
        memoryList.querySelectorAll('.memory-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('memory-item-remove')) {
                    const idx = parseInt(item.dataset.memoryIndex);
                    this.selectMemoryPolicy(idx);
                }
            });
        });

        // Silme butonları
        memoryList.querySelectorAll('.memory-item-remove').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.memoryRemove);
                this.removeFromMemory(idx);
            });
        });
    }

    /**
     * Politikayı hafızaya ekle/çıkar
     */
    toggleMemoryPolicy(policy, btnElement) {
        const existingIndex = this.memoryPolicies.findIndex(p => p.title === policy.title);

        if (existingIndex >= 0) {
            // Hafızadan çıkar
            this.memoryPolicies.splice(existingIndex, 1);
            btnElement.classList.remove('active');
            btnElement.title = 'Hafızaya Ekle';
        } else {
            // Hafızaya ekle (max 10)
            if (this.memoryPolicies.length >= 10) {
                alert('En fazla 10 politika hafızaya ekleyebilirsiniz!');
                return;
            }
            this.memoryPolicies.push({ ...policy });
            btnElement.classList.add('active');
            btnElement.title = 'Hafızadan Çıkar';
        }

        this.updateMemoryToggleButton();
        this.updateMemoryListContent();
    }

    /**
     * Hafızadan politika çıkar
     */
    removeFromMemory(index) {
        this.memoryPolicies.splice(index, 1);
        this.updateMemoryToggleButton();
        this.updateMemoryListContent();
        this.updateMemoryButtonStates();
    }

    /**
     * Hafıza toggle butonunu güncelle
     */
    updateMemoryToggleButton() {
        const btn = document.getElementById('memory-toggle-btn');
        if (!btn) return;

        if (this.memoryPolicies.length > 0) {
            btn.classList.add('has-items');
            btn.dataset.count = this.memoryPolicies.length;
        } else {
            btn.classList.remove('has-items');
        }
    }

    /**
     * Hafıza listesi içeriğini güncelle
     */
    updateMemoryListContent() {
        const memoryList = document.getElementById('memory-list');
        if (!memoryList) return;

        memoryList.innerHTML = this.renderMemoryList();
        this.setupMemoryListeners();
    }

    /**
     * Kartlardaki hafıza buton durumlarını güncelle
     */
    updateMemoryButtonStates() {
        const grid = this.elements.policyGrid;
        if (!grid) return;

        grid.querySelectorAll('.favorite-btn').forEach((btn) => {
            const index = parseInt(btn.dataset.favIndex);
            const policy = this.policyCards[index];
            if (policy) {
                const isInMemory = this.memoryPolicies.some(p => p.title === policy.title);
                if (isInMemory) {
                    btn.classList.add('active');
                    btn.title = 'Hafızadan Çıkar';
                } else {
                    btn.classList.remove('active');
                    btn.title = 'Hafızaya Ekle';
                }
            }
        });
    }

    /**
     * Hafızadan politika seç
     */
    selectMemoryPolicy(index) {
        const policy = this.memoryPolicies[index];
        if (!policy) return;

        // Politika mevcut kartlarda var mı kontrol et
        const cardIndex = this.policyCards.findIndex(p => p.title === policy.title);
        const isInCurrentCards = cardIndex >= 0;

        // Zaten seçili mi?
        const alreadySelected = this.selectedPolicies.find(p => p.title === policy.title);
        if (alreadySelected) {
            // Sadece mevcut kartlarda varsa "zaten seçili" uyarısı göster
            if (isInCurrentCards) {
                alert('Bu politika zaten seçili!');
            }
            return;
        }

        // Politikayı seçili listeye ekle
        this.selectedPolicies.push(policy);
        
        // Eğer bu politika mevcut kartlarda varsa, o kartı da selected olarak işaretle
        const grid = this.elements.policyGrid;
        if (grid && isInCurrentCards) {
            const cardElement = grid.querySelector(`[data-policy-index="${cardIndex}"]`);
            if (cardElement) {
                cardElement.classList.add('selected');
            }
        }
        
        this.updateMultiPreview();
        this.closeMemoryOverlay();

        if (this.elements.applyPolicyBtn) {
            this.elements.applyPolicyBtn.disabled = false;
        }
    }

    /**
     * Politika detay overlay'ini göster
     */
    showPolicyDetail(policy) {
        const overlay = document.getElementById('policy-detail-overlay');
        if (!overlay) return;

        this.currentDetailPolicy = policy;
        this.isPolicyDetailOpen = true;

        const isInMemory = this.memoryPolicies.some(p => p.title === policy.title);
        const isSelected = this.selectedPolicies.some(p => p.title === policy.title);

        overlay.innerHTML = `
            <div class="policy-detail-header">
                <div class="policy-detail-title">${policy.title}</div>
                <button class="policy-detail-close" id="policy-detail-close">X</button>
            </div>
            <div class="policy-detail-content">
                <div class="policy-detail-section">
                    <div class="policy-detail-label">Aciklama</div>
                    <div class="policy-detail-text">${policy.description}</div>
                </div>
                ${policy.category ? `
                    <div class="policy-detail-section">
                        <div class="policy-detail-label">Kategori</div>
                        <div class="policy-detail-text">${policy.category}</div>
                    </div>
                ` : ''}
                <div class="policy-detail-meta">
                    <div class="policy-detail-meta-item">
                        <div class="policy-detail-meta-label">Politik Sermaye Maliyeti</div>
                        <div class="policy-detail-meta-value">${policy.cost || 25} PS</div>
                    </div>
                    ${policy.isManual ? `
                        <div class="policy-detail-meta-item">
                            <div class="policy-detail-meta-label">Tip</div>
                            <div class="policy-detail-meta-value" style="color: var(--accent-secondary);">Ozel Politika</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="policy-detail-actions">
                <button class="btn btn-secondary" id="policy-detail-memory">
                    ${isInMemory ? 'Hafizadan Cikar' : 'Hafizaya Ekle'}
                </button>
                <button class="btn btn-primary" id="policy-detail-select" ${isSelected ? 'disabled' : ''}>
                    ${isSelected ? 'Secili' : 'Sec ve Uygula'}
                </button>
            </div>
        `;

        overlay.classList.add('active');

        // Event listener'lar
        document.getElementById('policy-detail-close')?.addEventListener('click', () => {
            this.closePolicyDetail();
        });

        document.getElementById('policy-detail-memory')?.addEventListener('click', () => {
            const btn = document.querySelector(`.favorite-btn[data-fav-index="${this.policyCards.indexOf(policy)}"]`);
            this.toggleMemoryPolicy(policy, btn || document.createElement('button'));
            this.showPolicyDetail(policy); // Refresh
        });

        document.getElementById('policy-detail-select')?.addEventListener('click', () => {
            if (!isSelected) {
                this.selectedPolicies.push(policy);
                this.updateMultiPreview();
                if (this.elements.applyPolicyBtn) {
                    this.elements.applyPolicyBtn.disabled = false;
                }
                // Kartı da işaretle
                const cardIndex = this.policyCards.indexOf(policy);
                if (cardIndex >= 0) {
                    const card = document.querySelector(`[data-policy-index="${cardIndex}"]`);
                    if (card) card.classList.add('selected');
                }
            }
            this.closePolicyDetail();
        });
    }

    /**
     * Politika detay overlay'ini kapat
     */
    closePolicyDetail() {
        const overlay = document.getElementById('policy-detail-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            this.isPolicyDetailOpen = false;
            this.currentDetailPolicy = null;
        }
    }

    /**
     * Politika seçimini toggle et (multi-select)
     */
    togglePolicySelection(policy, cardElement, index) {
        const isSelected = cardElement.classList.contains('selected');

        if (isSelected) {
            cardElement.classList.remove('selected');
            // Manuel kart ise, manual-card class'ını da kaldır
            if (policy.isManual) {
                cardElement.classList.remove('manual-card');
                this.manualPolicyCard = null;
            }
            this.selectedPolicies = this.selectedPolicies.filter(p => p.title !== policy.title);
        } else {
            cardElement.classList.add('selected');
            this.selectedPolicies.push(policy);
        }

        this.updateMultiPreview();

        if (this.elements.applyPolicyBtn) {
            this.elements.applyPolicyBtn.disabled = this.selectedPolicies.length === 0;
        }
    }

    /**
     * Multi-select önizleme (birden fazla politika)
     */
    updateMultiPreview() {
        const box = this.elements.previewBox;
        if (!box) return;

        if (this.selectedPolicies.length === 0) {
            box.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Bir veya daha fazla politika secin...</p>';
            return;
        }

        const totalCost = this.selectedPolicies.reduce((sum, p) => sum + (p.cost || 25), 0);

        const html = `
            <div class="preview-title">${this.selectedPolicies.length} Politika Secildi</div>
            <div style="font-size: 10px; margin-bottom: 8px;">
                ${this.selectedPolicies.map((p, i) => `
                    <div style="background: white; padding: 6px 8px; border-radius: 6px; margin-bottom: 4px; border-left: 3px solid ${p.isManual ? '#8b5cf6' : '#3b82f6'}; color: #1e293b;">
                        <strong>${i + 1}.</strong> ${p.title}${p.isManual ? ' <span style="color: #8b5cf6; font-size: 9px;">(Ozel)</span>' : ''}
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #10b981;">
                <strong>Toplam Maliyet:</strong> ${totalCost} Politik Sermaye
            </div>
        `;

        box.innerHTML = html;
    }

    /**
     * Manuel politika yazma formunu göster
     */
    showManualPolicyForm() {
        const box = this.elements.previewBox;
        if (!box) return;

        box.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="font-size: 12px; font-weight: 600; color: #8b5cf6; margin-bottom: 4px;">
                    Kendi Politikanizi Olusturun
                </div>
                <input type="text" id="manual-policy-title" placeholder="Politika basligi..."
                       style="padding: 10px; border: 2px solid #8b5cf6; border-radius: 8px; font-size: 12px;
                              background: white; color: #1e293b;">
                <textarea id="manual-policy-description" placeholder="Politikanizi buraya yazin..."
                          style="padding: 10px; border: 2px solid #8b5cf6; border-radius: 8px; font-size: 12px;
                                 min-height: 60px; resize: vertical; font-family: inherit;
                                 background: white; color: #1e293b;"></textarea>
                <div style="display: flex; gap: 8px;">
                    <button id="manual-submit-btn" class="btn btn-primary" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);">
                        Kart Olarak Ekle
                    </button>
                    <button id="manual-cancel-btn" class="btn btn-secondary" style="flex: 1; padding: 10px;">
                        Iptal
                    </button>
                </div>
            </div>
        `;

        // Event listener'ları ekle
        document.getElementById('manual-submit-btn')?.addEventListener('click', () => {
            const title = document.getElementById('manual-policy-title')?.value.trim();
            const description = document.getElementById('manual-policy-description')?.value.trim();

            if (title && description) {
                this.addManualPolicyAsCard(title, description);
            } else {
                alert('Lütfen başlık ve açıklama girin!');
            }
        });

        document.getElementById('manual-cancel-btn')?.addEventListener('click', () => {
            this.updateMultiPreview();
        });
    }

    /**
     * Manuel politikayı kart olarak ekle
     */
    addManualPolicyAsCard(title, description) {
        const manualPolicy = {
            title,
            description,
            cost: 30,
            isManual: true,
            category: 'Özel Politika'
        };

        // Mevcut kartlara ekle (ilk sıraya)
        this.manualPolicyCard = manualPolicy;

        // Eğer 8'den fazla kart varsa son kartı çıkar
        if (this.policyCards.length >= 8) {
            this.policyCards = [manualPolicy, ...this.policyCards.slice(0, 7)];
        } else {
            this.policyCards = [manualPolicy, ...this.policyCards];
        }

        // Kartları yeniden göster
        this.showPolicyCards(this.policyCards);

        // Seçili olarak işaretle
        this.selectedPolicies = [manualPolicy];
        this.updateMultiPreview();

        if (this.elements.applyPolicyBtn) {
            this.elements.applyPolicyBtn.disabled = false;
        }
    }

    /**
     * Daha fazla politika üret (8 kart için 2 yeni politika)
     */
    async generateMorePolicies() {
        if (!this.currentGameState) {
            console.warn('Oyun durumu yok, politika üretilemez');
            return;
        }

        const btn = this.elements.generateMoreBtn;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; margin: 0;"></div>';
        }

        try {
            const newPolicies = await this.generateDynamicPolicies(this.currentGameState, 2);

            if (newPolicies && newPolicies.length > 0) {
                // Yeni politikaları mevcut listeye ekle
                const existingNonManual = this.policyCards.filter(p => !p.isManual);
                const manualCard = this.policyCards.find(p => p.isManual);

                let updatedCards = [...existingNonManual, ...newPolicies];

                // Manuel kart varsa başa ekle (8 kart max)
                if (manualCard) {
                    updatedCards = [manualCard, ...updatedCards.slice(0, 7)];
                } else {
                    updatedCards = updatedCards.slice(0, 8);
                }

                this.showPolicyCards(updatedCards);
                console.log(`✅ ${newPolicies.length} yeni politika eklendi, toplam: ${updatedCards.length}`);
            }

        } catch (error) {
            console.error('Politika üretme hatası:', error);
            // Fallback: Varsayılan politikalar ekle
            const fallbackPolicies = this.getFallbackPolicies(2);
            const existingNonManual = this.policyCards.filter(p => !p.isManual);
            const manualCard = this.policyCards.find(p => p.isManual);

            let updatedCards = [...existingNonManual, ...fallbackPolicies];
            if (manualCard) {
                updatedCards = [manualCard, ...updatedCards.slice(0, 7)];
            } else {
                updatedCards = updatedCards.slice(0, 8);
            }

            this.showPolicyCards(updatedCards);
            console.log('⚠️ Fallback politikalar eklendi');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="plus-icon">+</span><span class="tooltip-text">Daha Fazla Politika Kartı Üret</span>';
            }
        }
    }

    /**
     * Fallback politikalar (AI başarısız olursa)
     */
    getFallbackPolicies(count = 2) {
        const allFallbacks = [
            { title: "Yerel Yönetim Reformu", description: "Belediyelere daha fazla özerklik ve kaynak aktarımı.", cost: 22, category: "Yerel Yönetim" },
            { title: "Sivil Toplum Güçlendirme", description: "STK'ların yasal statüsünü güçlendiren düzenlemeler.", cost: 18, category: "Sivil Toplum" },
            { title: "Şeffaflık Paketi", description: "Kamu kurumlarında şeffaflık ve hesap verebilirlik artışı.", cost: 25, category: "Yönetişim" },
            { title: "Yargı Reformu", description: "Yargı bağımsızlığını güçlendiren anayasal değişiklikler.", cost: 32, category: "Yargı" },
            { title: "Medya Özgürlüğü", description: "Basın özgürlüğünü koruyan yasal düzenlemeler.", cost: 20, category: "Medya" },
            { title: "Katılımcı Bütçeleme", description: "Vatandaşların bütçe süreçlerine katılımı.", cost: 15, category: "Demokrasi" },
            { title: "Seçim Güvenliği", description: "Seçim süreçlerinin güvenliğini artıran önlemler.", cost: 28, category: "Seçim" },
            { title: "İnsan Hakları Komisyonu", description: "Bağımsız insan hakları izleme mekanizması.", cost: 24, category: "İnsan Hakları" }
        ];

        // Rastgele seç
        const shuffled = allFallbacks.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * AI yardımcı mesaj gönder
     */
    async sendAIMessage() {
        const input = this.elements.aiInput;
        const container = this.elements.aiChatContainer;

        if (!input || !container) return;

        const message = input.value.trim();
        if (!message) return;

        // Kullanıcı mesajını ekle
        container.innerHTML += `
            <div class="ai-message user">${message}</div>
        `;
        input.value = '';

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

        // AI yanıtı al
        try {
            const response = await this.getAIPolicyAdvice(message);
            container.innerHTML += `
                <div class="ai-message assistant">${response}</div>
            `;
        } catch (error) {
            container.innerHTML += `
                <div class="ai-message assistant">Su anda yanit veremiyorum. Lutfen tekrar deneyin.</div>
            `;
        }

        container.scrollTop = container.scrollHeight;
    }

    /**
     * AI politika danışmanlığı
     */
    async getAIPolicyAdvice(userMessage) {
        if (!this.currentGameState) {
            return "Oyun henuz baslamadi. Lutfen bir ulke secip oyunu baslatin.";
        }

        const state = this.currentGameState;
        const prompt = `Sen bir siyaset danismanisin. ${state.country} icin ${state.currentYear} yilinda politika onerilerinde bulunuyorsun.

Ulkenin durumu:
- Devlet Gucu: ${state.statePower?.toFixed(2) || 0}
- Toplum Gucu: ${state.societyPower?.toFixed(2) || 0}
- Leviathan Tipi: ${state.leviathanType || 'Bilinmiyor'}
- Ozgurluk: ${Math.round((state.variables?.v2x_libdem || 0) * 100)}/100

Kullanici sorusu: ${userMessage}

Kisa ve oz (2-3 cumle) bir yanit ver. Eger kullanici politika onerisi istiyorsa, spesifik bir politika oner. Turkce yanit ver.`;

        try {
            const response = await fetch(getOllamaUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: API_CONFIG.ollama.model,
                    prompt: prompt,
                    stream: false,
                    options: { ...API_CONFIG.ollama.options, num_predict: 200 }
                })
            });

            if (!response.ok) throw new Error('AI yanıt vermedi');

            const data = await response.json();
            return data.response.trim();

        } catch (error) {
            console.error('AI hatası:', error);
            throw error;
        }
    }

    /**
     * Politika formu göster (8 kart sistemi için - 2x4 grid)
     */
    async showPolicyForm(gameState = null) {
        const grid = this.elements.policyGrid;
        if (!grid) return;

        this.currentGameState = gameState;

        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted);">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px;">Ülkeye özel politikalar üretiliyor...</p>
            </div>
        `;

        if (gameState && gameState.country && gameState.currentYear) {
            try {
                const dynamicPolicies = await this.generateDynamicPolicies(gameState, 8);
                this.showPolicyCards(dynamicPolicies);
                return;
            } catch (error) {
                console.warn('Dinamik politika üretimi başarısız:', error);
            }
        }

        // Fallback: Varsayılan politikalar (8 adet)
        const samplePolicies = [
            { title: "Basın Özgürlüğü Reformu", description: "Medya kuruluşlarının bağımsızlığını artıran yeni yasalar.", cost: 25, category: "Medya" },
            { title: "Yargı Bağımsızlığı", description: "Yargı organının siyasi baskıdan arındırılması.", cost: 30, category: "Yargı" },
            { title: "Seçim Reformu", description: "Daha adil ve şeffaf seçim sistemi.", cost: 20, category: "Seçim" },
            { title: "Sivil Toplum Destekleme", description: "STK'ların güçlendirilmesi ve desteklenmesi.", cost: 15, category: "Sivil Toplum" },
            { title: "Yerel Yönetim Güçlendirme", description: "Belediyelere daha fazla yetki ve bütçe.", cost: 22, category: "Yerel Yönetim" },
            { title: "Eğitim Reformu", description: "Eleştirel düşünme ve vatandaşlık eğitimi.", cost: 28, category: "Eğitim" },
            { title: "Şeffaflık Paketi", description: "Kamu kurumlarında şeffaflık ve hesap verebilirlik.", cost: 18, category: "Yönetişim" },
            { title: "Dijital Haklar Güvencesi", description: "İnternet özgürlüğü ve veri koruma yasaları.", cost: 24, category: "Teknoloji" }
        ];

        this.showPolicyCards(samplePolicies);
    }

    /**
     * Dinamik politika üret
     */
    async generateDynamicPolicies(gameState, count = 6) {
        const prompt = `Sen bir siyaset bilimci ve demokrasi uzmanisin. ${gameState.country} ulkesi icin ${gameState.currentYear} yilina uygun ${count} farkli politika onerisi uret.

Ulkenin mevcut durumu:
- Devlet Gucu: ${gameState.statePower?.toFixed(2) || 0}
- Toplum Gucu: ${gameState.societyPower?.toFixed(2) || 0}
- Leviathan Tipi: ${gameState.leviathanType || 'Bilinmiyor'}
- Ozgurluk Skoru: ${Math.round((gameState.variables?.v2x_libdem || 0) * 100)}/100

Lutfen her politika icin su formatta JSON dondur:
[
  {
    "title": "Kisa ve net politika adi",
    "description": "1-2 cumlelik aciklama",
    "cost": 15-35 arasi sayi,
    "category": "Kategori"
  }
]

Politikalar birbirinden farkli ve ulkenin durumuna uygun olsun.
Sadece JSON formatinda yanit ver.`;

        const response = await fetch(getOllamaUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: API_CONFIG.ollama.model,
                prompt: prompt,
                stream: false,
                options: { ...API_CONFIG.ollama.options, num_predict: 1000 }
            })
        });

        if (!response.ok) throw new Error('AI yanıt vermedi');

        const data = await response.json();
        const text = data.response.trim();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('JSON bulunamadı');

        const policies = JSON.parse(jsonMatch[0]);
        return policies.slice(0, count);
    }

    /**
     * Politika sonucunu göster
     */
    showPolicyResult(result, isSuccess = true) {
        const box = this.elements.previewBox;
        if (!box) return;

        const bgColor = isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const borderColor = isSuccess ? '#10b981' : '#ef4444';
        const textColor = isSuccess ? '#10b981' : '#ef4444';

        let html = `
            <div style="background: ${bgColor}; padding: 15px; border-radius: 8px;
                        border-left: 4px solid ${borderColor};">
                <div style="font-weight: 700; margin-bottom: 10px; color: ${textColor};">
                    ${isSuccess ? 'Politika Uygulandı!' : 'Hata!'}
                </div>
                ${isSuccess ? `
                    <div style="font-size: 12px; line-height: 1.8; color: #1e293b;">
                        <div><strong>Maliyet:</strong> ${result.cost || 0} politik sermaye</div>
                        <div><strong>Yeni Devlet Gücü:</strong> ${result.newFactors?.statePower?.toFixed(2) || 0}</div>
                        <div><strong>Yeni Toplum Gücü:</strong> ${result.newFactors?.societyPower?.toFixed(2) || 0}</div>
                        <div><strong>Yeni Tip:</strong> ${result.newFactors?.leviathanType || 'Unknown'}</div>
                        ${result.crisis ? `
                            <div style="color: #ef4444; font-weight: 700; margin-top: 10px; padding: 8px;
                                        background: rgba(239, 68, 68, 0.1); border-radius: 6px;">
                                <strong>KRIZ:</strong> ${result.crisis.message}
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div style="margin-top: 8px; font-size: 12px; color: #ef4444;">
                        ${result.error || 'Bir hata oluştu. Lütfen tekrar deneyin.'}
                    </div>
                `}
            </div>
        `;

        box.innerHTML = html;

        setTimeout(() => {
            this.clearSelection();
        }, 6000);
    }

    /**
     * Çoklu politika sonuçlarını göster - her politika ayrı ayrı listelenir
     */
    showMultiPolicyResult(allResults, selectedPolicies) {
        const box = this.elements.previewBox;
        if (!box) return;

        const totalCost = selectedPolicies.reduce((sum, p) => sum + (p.cost || 25), 0);
        const lastResult = allResults[allResults.length - 1]?.result;

        let policiesHtml = allResults.map(({ policy, result }, index) => {
            const isSuccess = result.success;
            return `
                <div style="background: ${isSuccess ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; 
                            padding: 10px 12px; border-radius: 6px; margin-bottom: 8px;
                            border-left: 3px solid ${isSuccess ? '#10b981' : '#ef4444'};">
                    <div style="font-weight: 600; font-size: 12px; color: #1e293b; margin-bottom: 4px;">
                        ${index + 1}. ${policy.title}
                    </div>
                    <div style="font-size: 10px; color: #64748b;">
                        Maliyet: ${policy.cost || 25} sermaye
                        ${policy.category ? ` | Kategori: ${policy.category}` : ''}
                    </div>
                </div>
            `;
        }).join('');

        let html = `
            <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px;
                        border-left: 4px solid #10b981;">
                <div style="font-weight: 700; margin-bottom: 12px; color: #10b981; font-size: 14px;">
                    ${allResults.length} Politika Basariyla Uygulandi!
                </div>
                
                <div style="max-height: 150px; overflow-y: auto; margin-bottom: 12px;">
                    ${policiesHtml}
                </div>
                
                <div style="background: white; padding: 10px; border-radius: 6px; font-size: 11px; color: #1e293b;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div><strong>Toplam Maliyet:</strong> ${totalCost}</div>
                        <div><strong>Yeni Tip:</strong> ${lastResult?.newFactors?.leviathanType || '-'}</div>
                        <div><strong>Devlet Gucu:</strong> ${lastResult?.newFactors?.statePower?.toFixed(2) || '-'}</div>
                        <div><strong>Toplum Gucu:</strong> ${lastResult?.newFactors?.societyPower?.toFixed(2) || '-'}</div>
                    </div>
                </div>
                
                ${lastResult?.crisis ? `
                    <div style="color: #ef4444; font-weight: 700; margin-top: 10px; padding: 8px;
                                background: rgba(239, 68, 68, 0.1); border-radius: 6px; font-size: 11px;">
                        <strong>KRIZ:</strong> ${lastResult.crisis.message}
                    </div>
                ` : ''}
            </div>
        `;

        box.innerHTML = html;

        setTimeout(() => {
            this.updateMultiPreview();
        }, 8000);
    }

    /**
     * Oyun sonu ekranını göster
     */
    showGameOver(scores) {
        document.body.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center;
                        background: #f0f4f8; padding: 20px;">
                <div style="background: white; border-radius: 20px; padding: 50px; max-width: 700px; width: 100%;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.15); text-align: center;">
                    <h1 style="font-size: 48px; margin-bottom: 30px; color: #1e293b;">OYUN BITTI!</h1>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div style="padding: 25px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Ozgurluk</div>
                            <div style="font-size: 42px; font-weight: 700; color: #10b981;">${scores.freedom}/100</div>
                        </div>
                        <div style="padding: 25px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Denge</div>
                            <div style="font-size: 42px; font-weight: 700; color: #3b82f6;">${scores.balance}/100</div>
                        </div>
                        <div style="padding: 25px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Demokrasi</div>
                            <div style="font-size: 42px; font-weight: 700; color: #8b5cf6;">${scores.democracy}/100</div>
                        </div>
                        <div style="padding: 25px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Stabilite</div>
                            <div style="font-size: 42px; font-weight: 700; color: #f59e0b;">${scores.stability}/100</div>
                        </div>
                    </div>

                    <div style="padding: 30px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                                border-radius: 16px; color: white; margin-bottom: 30px;">
                        <div style="font-size: 18px; opacity: 0.9; margin-bottom: 10px;">TOPLAM SKOR</div>
                        <div style="font-size: 64px; font-weight: 700;">${scores.total}/100</div>
                    </div>

                    <button id="new-game-btn"
                            style="width: 100%; padding: 20px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                                   color: white; border: none; border-radius: 12px; font-size: 20px; font-weight: 700;
                                   cursor: pointer; transition: all 0.3s ease;">
                        Yeni Oyun Baslat
                    </button>
                </div>
            </div>
        `;

        document.getElementById('new-game-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    /**
     * Seçili politikayı al
     */
    getSelectedPolicy() {
        return this.selectedPolicies.length > 0 ? this.selectedPolicies[0] : null;
    }

    /**
     * Tüm seçili politikaları al
     */
    getSelectedPolicies() {
        return this.selectedPolicies;
    }

    /**
     * Toplam maliyeti hesapla
     */
    getTotalCost() {
        return this.selectedPolicies.reduce((sum, p) => sum + (p.cost || 25), 0);
    }

    /**
     * Politika seçimini temizle
     */
    clearSelection() {
        this.selectedPolicies = [];
        this.manualPolicyCard = null;
        document.querySelectorAll('.policy-card').forEach(c => {
            c.classList.remove('selected');
        });
        this.updateMultiPreview();

        if (this.elements.applyPolicyBtn) {
            this.elements.applyPolicyBtn.disabled = true;
        }
    }
}
