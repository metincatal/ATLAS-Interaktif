/**
 * Game UI Manager - PRD'ye uygun tam implementasyon
 * Sol Panel: Dar Koridor + Dashboard + Baskı Grupları + Olaylar
 * Sağ Panel: Politik Sermaye + 4 Politika Kartı + Önizleme + Butonlar
 */

export class GameUI {
    constructor() {
        // DOM elementlerini al
        this.elements = {
            // Sol Panel - Dar Koridor
            countryDot: document.getElementById('country-dot'),
            corridorTooltip: document.getElementById('corridor-tooltip'),

            // Sol Panel - Dashboard
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
            previewBox: document.getElementById('preview-box'),
            applyPolicyBtn: document.getElementById('apply-policy-btn'),
            writePolicyBtn: document.getElementById('write-policy-btn')
        };

        // Seçili politikalar (multi-select için array)
        this.selectedPolicies = [];
        this.policyCards = []; // Politika verilerini tutmak için

        // Event listener'ları kur
        this.setupEventListeners();
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
                'Shackled': { text: '🟢 Shackled', class: 'shackled' },
                'Despotic': { text: '🔴 Despotic', class: 'despotic' },
                'Paper': { text: '🟠 Paper', class: 'paper' },
                'Absent': { text: '🟣 Absent', class: 'absent' }
            };

            const levType = state.leviathanType || 'Absent';
            const badgeData = typeMap[levType] || { text: levType, class: 'absent' };

            this.elements.leviathanBadge.textContent = badgeData.text;
            this.elements.leviathanBadge.className = 'leviathan-badge ' + badgeData.class;
        }
    }

    /**
     * Dar koridor noktasını güncelle (Ana sayfadaki geometri ile AYNI)
     */
    updateCorridorDot(state) {
        const dot = this.elements.countryDot;
        const tooltip = this.elements.corridorTooltip;

        if (!dot) return;

        const container = dot.parentElement;
        const img = container.querySelector('img');

        if (!img) return;

        // Resim yüklenmişse hemen konumlandır, değilse load event'ini bekle
        const positionDot = () => {
            const statePower = state.statePower || 0;
            const societyPower = state.societyPower || 0;

            console.log(`🎯 Nokta konumlandırılıyor: State=${statePower.toFixed(2)}, Society=${societyPower.toFixed(2)}`);

            // Ana sayfadaki calculateCorridorPosition fonksiyonu
            // X ekseni: SocietyPower (Toplum Gücü) - soldan sağa
            // Y ekseni: StatePower (Devlet Gücü) - yukarıdan aşağıya (ters)
            let x = ((societyPower + 3) / 6) * 100;
            let y = 100 - ((statePower + 3) / 6) * 100;

            // Ana sayfadaki clampAlongDiagonal fonksiyonu
            const clamp = (x, y, margin = 3) => {
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
            };

            // Clamp uygula
            const clamped = clamp(x, y);
            x = clamped.x;
            y = clamped.y;

            const imgWidth = img.offsetWidth;
            const imgHeight = img.offsetHeight;

            // Pixel pozisyonları
            const dotLeft = (imgWidth * x / 100);
            const dotTop = (imgHeight * y / 100);

            console.log(`📍 Hesaplanan pozisyon: x=${x.toFixed(1)}%, y=${y.toFixed(1)}% => ${dotLeft.toFixed(0)}px, ${dotTop.toFixed(0)}px`);

            dot.style.left = `${dotLeft}px`;
            dot.style.top = `${dotTop}px`;
            dot.style.display = 'block';

            // Leviathan tipine göre renk
            const levType = (state.leviathanType || 'Absent').toLowerCase();
            dot.className = 'country-dot ' + levType;

            // Tooltip event'leri
            this.setupCorridorTooltip(dot, tooltip, state);
        };

        if (img.complete) {
            positionDot();
        } else {
            img.addEventListener('load', positionDot);
        }
    }

    /**
     * Koridor tooltip'ini kur
     */
    setupCorridorTooltip(dot, tooltip, state) {
        if (!dot || !tooltip) return;

        dot.addEventListener('mouseenter', (e) => {
            tooltip.innerHTML = `
                <strong>${state.country || 'Ülke'}</strong><br>
                Devlet Gücü: ${(state.statePower || 0).toFixed(2)}<br>
                Toplum Gücü: ${(state.societyPower || 0).toFixed(2)}<br>
                Tip: ${state.leviathanType || 'Unknown'}
            `;
            tooltip.style.display = 'block';
            this.updateTooltipPosition(e, tooltip);
        });

        dot.addEventListener('mousemove', (e) => {
            this.updateTooltipPosition(e, tooltip);
        });

        dot.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    }

    /**
     * Tooltip pozisyonunu güncelle
     */
    updateTooltipPosition(e, tooltip) {
        const container = tooltip.parentElement;
        const rect = container.getBoundingClientRect();

        let left = e.clientX - rect.left + 15;
        let top = e.clientY - rect.top - 10;

        // Taşma kontrolü
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
     * Baskı gruplarını güncelle
     */
    updateStakeholders(state) {
        const container = this.elements.stakeholdersList;
        if (!container) return;

        const stakeholders = state.stakeholders || {};

        // Emoji ve isim eşleştirmesi
        const stakeholderData = {
            military: { emoji: '🎖️', name: 'Ordu' },
            elite: { emoji: '💼', name: 'Ekonomik Seçkinler' },
            civil_society: { emoji: '👥', name: 'Sivil Toplum' },
            religious: { emoji: '🕌', name: 'Dini Kurumlar' },
            international: { emoji: '🌍', name: 'Uluslararası Toplum' }
        };

        let html = '';
        for (const [key, data] of Object.entries(stakeholders)) {
            const info = stakeholderData[key] || { emoji: '📊', name: key };
            const influence = (data.influence || 0.5) * 100;
            const satisfaction = (data.satisfaction || 0.5) * 100;

            // Memnuniyet emoji'si
            const satisfactionEmoji = satisfaction > 75 ? '😍' :
                                     satisfaction > 60 ? '😊' :
                                     satisfaction > 40 ? '😐' :
                                     satisfaction > 25 ? '😠' : '😡';

            // Kriz kontrolü (satisfaction < 20 ve influence > 60)
            const hasCrisis = satisfaction < 20 && influence > 60;

            html += `
                <div class="stakeholder-item">
                    <div class="stakeholder-header">
                        ${info.emoji} <strong>${info.name}</strong> <span class="mood-emoji">${satisfactionEmoji}</span>
                    </div>
                    <div class="stakeholder-bar">
                        <div class="bar-row">
                            <span class="bar-label">Etki:</span>
                            <div class="progress-bar">
                                <div class="progress-fill influence" style="width: ${influence}%;"></div>
                            </div>
                            <span class="bar-value">${influence.toFixed(0)}%</span>
                        </div>
                        <div class="bar-row">
                            <span class="bar-label">Memnuniyet:</span>
                            <div class="progress-bar">
                                <div class="progress-fill satisfaction" style="width: ${satisfaction}%;"></div>
                            </div>
                            <span class="bar-value">${satisfaction.toFixed(0)}%</span>
                        </div>
                    </div>
                    ${hasCrisis ? `<div class="crisis-warning">⚠️ UYARI: ${info.name === 'Ordu' ? 'Darbe' : 'Kriz'} riski!</div>` : ''}
                </div>
            `;
        }

        container.innerHTML = html || '<p style="text-align: center; color: var(--text-muted, #64748b);">Veri yok</p>';
    }

    /**
     * Olayları güncelle
     */
    updateEvents(state) {
        const container = this.elements.eventsList;
        if (!container) return;

        const events = state.history?.events || [];

        if (events.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted, #64748b);">Henüz olay yok.</p>';
            return;
        }

        // Son 5 olayı al ve ters çevir (en yeni üstte)
        const recentEvents = events.slice(-5).reverse();

        const html = recentEvents.map(event => `
            <div class="event-item">
                ${event.message || 'Bir olay gerçekleşti'}
                <div class="event-turn">(Tur ${event.turn || 0})</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Politik sermayeyi güncelle
     */
    updatePoliticalCapital(state) {
        const current = state.politicalCapital?.current || 100;
        const max = state.politicalCapital?.max || 100;
        const percentage = (current / max) * 100;

        if (this.elements.capitalCurrent) {
            this.elements.capitalCurrent.textContent = current;
        }
        if (this.elements.capitalMax) {
            this.elements.capitalMax.textContent = max;
        }
        if (this.elements.capitalFill) {
            this.elements.capitalFill.style.width = `${percentage}%`;
        }
    }

    /**
     * Politika kartlarını göster (4 adet - 2x2 grid)
     * @param {Array} policies - Politika listesi
     */
    showPolicyCards(policies) {
        const grid = this.elements.policyGrid;
        if (!grid) return;

        // İlk 4 politikayı göster
        const cards = policies.slice(0, 4);
        this.policyCards = cards; // Kaydet

        const html = cards.map((policy, index) => `
            <div class="policy-card" data-policy-index="${index}">
                <div class="policy-checkbox"></div>
                <div class="policy-card-title">${policy.title || 'Politika'}</div>
                <div class="policy-card-desc">${policy.description || 'Açıklama yok'}</div>
                <div class="policy-card-cost">💎 ${policy.cost || 25} Sermaye</div>
            </div>
        `).join('');

        grid.innerHTML = html;

        // Kart tıklama event'lerini ekle
        grid.querySelectorAll('.policy-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.togglePolicySelection(cards[index], card, index);
            });
        });
    }

    /**
     * Politika seçimini toggle et (multi-select)
     */
    togglePolicySelection(policy, cardElement, index) {
        const isSelected = cardElement.classList.contains('selected');

        if (isSelected) {
            // Seçimi kaldır
            cardElement.classList.remove('selected');
            this.selectedPolicies = this.selectedPolicies.filter(p => p.title !== policy.title);
        } else {
            // Seç
            cardElement.classList.add('selected');
            this.selectedPolicies.push(policy);
        }

        // Önizleme kutusunu güncelle
        this.updateMultiPreview();

        // Uygula butonunu kontrol et
        if (this.elements.applyPolicyBtn) {
            this.elements.applyPolicyBtn.disabled = this.selectedPolicies.length === 0;
        }
    }

    /**
     * Önizleme kutusunu güncelle (single policy - eski sistem)
     */
    updatePreview(policy) {
        const box = this.elements.previewBox;
        if (!box) return;

        if (!policy) {
            box.innerHTML = '<p style="text-align: center; color: #718096;">Bir politika seçin...</p>';
            return;
        }

        box.innerHTML = `
            <div class="preview-title">${policy.title}</div>
            <p>${policy.description}</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                <strong>Maliyet:</strong> 💎 ${policy.cost || 25} Politik Sermaye<br>
                ${policy.risk ? `<strong>Risk:</strong> ${policy.risk}<br>` : ''}
                ${policy.category ? `<strong>Kategori:</strong> ${policy.category}` : ''}
            </div>
        `;
    }

    /**
     * Multi-select önizleme (birden fazla politika)
     */
    updateMultiPreview() {
        const box = this.elements.previewBox;
        if (!box) return;

        if (this.selectedPolicies.length === 0) {
            box.innerHTML = '<p style="text-align: center; color: var(--text-muted, #64748b);">Bir veya daha fazla politika seçin...</p>';
            return;
        }

        const totalCost = this.selectedPolicies.reduce((sum, p) => sum + (p.cost || 25), 0);

        const html = `
            <div class="preview-title">${this.selectedPolicies.length} Politika Seçildi</div>
            <div style="font-size: 10px; margin-bottom: 8px;">
                ${this.selectedPolicies.map((p, i) => `
                    <div style="background: #0f172a; padding: 6px 8px; border-radius: 6px; margin-bottom: 4px; border-left: 3px solid #3b82f6; color: #f8fafc;">
                        <strong>${i + 1}.</strong> ${p.title}
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #475569; font-size: 11px; color: #10b981;">
                <strong>Toplam Maliyet:</strong> 💎 ${totalCost} Politik Sermaye
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
                <input type="text" id="manual-policy-title" placeholder="Politika başlığı..."
                       style="padding: 10px; border: 2px solid #3b82f6; border-radius: 8px; font-size: 12px;
                              background: #0f172a; color: #f8fafc;">
                <textarea id="manual-policy-description" placeholder="Politikanızı buraya yazın..."
                          style="padding: 10px; border: 2px solid #3b82f6; border-radius: 8px; font-size: 12px;
                                 min-height: 80px; resize: vertical; font-family: inherit;
                                 background: #0f172a; color: #f8fafc;"></textarea>
                <div style="display: flex; gap: 8px;">
                    <button id="manual-submit-btn" class="btn btn-primary" style="flex: 1; padding: 10px;">
                        ✓ Gönder
                    </button>
                    <button id="manual-cancel-btn" class="btn btn-secondary" style="flex: 1; padding: 10px;">
                        × İptal
                    </button>
                </div>
            </div>
        `;

        // Event listener'ları ekle
        document.getElementById('manual-submit-btn')?.addEventListener('click', () => {
            const title = document.getElementById('manual-policy-title')?.value.trim();
            const description = document.getElementById('manual-policy-description')?.value.trim();

            if (title && description) {
                const manualPolicy = {
                    title,
                    description,
                    cost: 30,
                    isManual: true
                };

                // Manuel politikayı seçililer listesine ekle
                this.selectedPolicies = [manualPolicy];

                this.updateMultiPreview();

                if (this.elements.applyPolicyBtn) {
                    this.elements.applyPolicyBtn.disabled = false;
                }
            } else {
                alert('Lütfen başlık ve açıklama girin!');
            }
        });

        document.getElementById('manual-cancel-btn')?.addEventListener('click', () => {
            this.updateMultiPreview();
        });
    }

    /**
     * Politika formu göster (4 kart sistemi için - dinamik AI üretimi)
     * @param {Object} gameState - Oyun durumu (ülke, yıl, faktörler vb)
     */
    async showPolicyForm(gameState = null) {
        const grid = this.elements.policyGrid;
        if (!grid) return;

        // Yükleme göster
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted, #64748b);">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px;">Ülkeye özel politikalar üretiliyor...</p>
            </div>
        `;

        // Eğer gameState varsa ve AI kullanılabilirse, dinamik politika üret
        if (gameState && gameState.country && gameState.currentYear) {
            try {
                const dynamicPolicies = await this.generateDynamicPolicies(gameState);
                this.showPolicyCards(dynamicPolicies);
                return;
            } catch (error) {
                console.warn('Dinamik politika üretimi başarısız, varsayılan politikalar kullanılıyor:', error);
            }
        }

        // Fallback: Varsayılan politikalar
        const samplePolicies = [
            {
                title: "Basın Özgürlüğü Reformu",
                description: "Medya kuruluşlarının bağımsızlığını artıran yeni yasalar.",
                cost: 25,
                category: "Medya",
                risk: "Orta"
            },
            {
                title: "Yargı Bağımsızlığı",
                description: "Yargı organının siyasi baskıdan arındırılması.",
                cost: 30,
                category: "Yargı",
                risk: "Yüksek"
            },
            {
                title: "Seçim Reformu",
                description: "Daha adil ve şeffaf seçim sistemi.",
                cost: 20,
                category: "Seçim",
                risk: "Düşük"
            },
            {
                title: "Sivil Toplum Destekleme",
                description: "STK'ların güçlendirilmesi ve desteklenmesi.",
                cost: 15,
                category: "Sivil Toplum",
                risk: "Düşük"
            }
        ];

        this.showPolicyCards(samplePolicies);
    }

    /**
     * Ülke ve yıla özel dinamik politikalar üret (AI ile)
     */
    async generateDynamicPolicies(gameState) {
        const prompt = `Sen bir siyaset bilimci ve demokrasi uzmanısın. ${gameState.country} ülkesi için ${gameState.currentYear} yılına uygun 4 farklı politika önerisi üret.

Ülkenin mevcut durumu:
- Devlet Gücü: ${gameState.statePower.toFixed(2)}
- Toplum Gücü: ${gameState.societyPower.toFixed(2)}
- Leviathan Tipi: ${gameState.leviathanType}
- Özgürlük Skoru: ${Math.round(gameState.variables.v2x_libdem * 100)}/100

Lütfen her politika için şu formatta JSON döndür:
[
  {
    "title": "Kısa ve net politika adı",
    "description": "1-2 cümlelik açıklama",
    "cost": 15-30 arası sayı,
    "category": "Kategori",
    "risk": "Düşük/Orta/Yüksek"
  }
]

Politikalar şunlar gibi olabilir:
- Yargı reformu
- Medya özgürlüğü
- Seçim sistemi
- Yerel yönetim
- Sivil toplum
- Eğitim reformu
- Ekonomik özgürlükler

Sadece JSON formatında yanıt ver, başka açıklama ekleme.`;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:latest',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.8,
                    num_predict: 800
                }
            })
        });

        if (!response.ok) {
            throw new Error('AI yanıt vermedi');
        }

        const data = await response.json();
        const text = data.response.trim();

        // JSON parse et
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('JSON bulunamadı');
        }

        const policies = JSON.parse(jsonMatch[0]);

        // 4 politika döndür
        return policies.slice(0, 4);
    }

    /**
     * Politika sonucunu göster
     */
    showPolicyResult(result, isSuccess = true) {
        const box = this.elements.previewBox;
        if (!box) return;

        const bgColor = isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        const borderColor = isSuccess ? '#10b981' : '#ef4444';
        const textColor = isSuccess ? '#10b981' : '#ef4444';
        const icon = isSuccess ? '✅' : '❌';

        let html = `
            <div style="background: ${bgColor}; padding: 15px; border-radius: 8px;
                        border-left: 4px solid ${borderColor};">
                <div style="font-weight: 700; margin-bottom: 10px; color: ${textColor};">
                    ${icon} ${isSuccess ? 'Politika Uygulandı!' : 'Hata!'}
                </div>
                ${isSuccess ? `
                    <div style="font-size: 12px; line-height: 1.8; color: #f8fafc;">
                        <div>💰 <strong>Maliyet:</strong> ${result.cost || 0} politik sermaye</div>
                        <div>📊 <strong>Yeni Devlet Gücü:</strong> ${result.newFactors?.statePower?.toFixed(2) || 0}</div>
                        <div>📊 <strong>Yeni Toplum Gücü:</strong> ${result.newFactors?.societyPower?.toFixed(2) || 0}</div>
                        <div>🏛️ <strong>Yeni Tip:</strong> ${result.newFactors?.leviathanType || 'Unknown'}</div>
                        ${result.crisis ? `
                            <div style="color: #ef4444; font-weight: 700; margin-top: 10px; padding: 8px;
                                        background: rgba(239, 68, 68, 0.2); border-radius: 6px;">
                                ⚠️ <strong>KRİZ:</strong> ${result.crisis.message}
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

        // 6 saniye sonra temizle
        setTimeout(() => {
            this.clearSelection();
        }, 6000);
    }

    /**
     * Oyun sonu ekranını göster
     */
    showGameOver(scores) {
        document.body.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center;
                        background: #0f172a; padding: 20px;">
                <div style="background: #1e293b; border-radius: 20px; padding: 50px; max-width: 700px; width: 100%;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.5); text-align: center;">
                    <h1 style="font-size: 48px; margin-bottom: 30px; color: #f8fafc;">🏁 OYUN BİTTİ!</h1>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div style="padding: 25px; background: #334155; border-radius: 16px;">
                            <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Özgürlük</div>
                            <div style="font-size: 42px; font-weight: 700; color: #10b981;">${scores.freedom}/100</div>
                        </div>
                        <div style="padding: 25px; background: #334155; border-radius: 16px;">
                            <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Denge</div>
                            <div style="font-size: 42px; font-weight: 700; color: #3b82f6;">${scores.balance}/100</div>
                        </div>
                        <div style="padding: 25px; background: #334155; border-radius: 16px;">
                            <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Demokrasi</div>
                            <div style="font-size: 42px; font-weight: 700; color: #8b5cf6;">${scores.democracy}/100</div>
                        </div>
                        <div style="padding: 25px; background: #334155; border-radius: 16px;">
                            <div style="font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Stabilite</div>
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
                        🔄 Yeni Oyun Başlat
                    </button>
                </div>
            </div>
        `;

        document.getElementById('new-game-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    /**
     * Seçili politikayı al (backward compatibility)
     */
    getSelectedPolicy() {
        // İlk seçili politikayı döndür (eski kod ile uyumluluk için)
        return this.selectedPolicies.length > 0 ? this.selectedPolicies[0] : null;
    }

    /**
     * Tüm seçili politikaları al
     */
    getSelectedPolicies() {
        return this.selectedPolicies;
    }

    /**
     * Politika seçimini temizle
     */
    clearSelection() {
        this.selectedPolicies = [];
        document.querySelectorAll('.policy-card').forEach(c => {
            c.classList.remove('selected');
        });
        this.updateMultiPreview();

        if (this.elements.applyPolicyBtn) {
            this.elements.applyPolicyBtn.disabled = true;
        }
    }
}
