export class VdemMetadata {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    showMetadata(variable) {
        if (!variable) {
            this.container.innerHTML = '<div class="empty-state">Bir değişken seçin</div>';
            return;
        }

        this.container.innerHTML = `
            <div class="metadata-card">
                <h3>Değişken Detayları</h3>
                
                <div class="meta-item">
                    <label>Kod:</label>
                    <span>${variable.id}</span>
                </div>

                <div class="meta-item">
                    <label>Tip:</label>
                    <span class="badge type-${variable.var_type}">${this.getTypeLabel(variable.var_type)}</span>
                </div>

                ${variable.question ? `
                <div class="meta-item">
                    <label>Soru:</label>
                    <p class="question-text">${variable.question}</p>
                </div>
                ` : ''}

                ${variable.description ? `
                <div class="meta-item">
                    <label>Açıklama:</label>
                    <p class="desc-text">${variable.description}</p>
                </div>
                ` : ''}

                ${variable.responses ? `
                <div class="meta-item">
                    <label>Cevap Kategorileri:</label>
                    <ul class="responses-list">
                        ${variable.responses.map(r => `<li><strong>${r.value}:</strong> ${r.label}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                ${variable.formula ? `
                <div class="meta-item">
                    <label>Hesaplama:</label>
                    <code class="formula">${variable.formula}</code>
                </div>
                ` : ''}
            </div>
        `;
    }

    getTypeLabel(type) {
        const types = {
            'A': 'Olgusal (A)',
            'C': 'Uzman Kodlaması (C)',
            'D': 'İndeks (D)',
            'E': 'Arka Plan (E)'
        };
        return types[type] || type;
    }
}
