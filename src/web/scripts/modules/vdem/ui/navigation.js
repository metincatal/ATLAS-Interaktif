import { DATA_PATHS } from '../../../config/constants.js';

export class VdemNavigation {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    async loadHierarchy() {
        try {
            const response = await fetch(DATA_PATHS.vdemMindmap);
            const data = await response.json();
            this.renderMenu(data);
        } catch (error) {
            console.error('Failed to load V-Dem hierarchy:', error);
            this.container.innerHTML = '<div class="error">Menü yüklenemedi.</div>';
        }
    }

    renderMenu(data) {
        const html = this.buildMenuHtml(data.children);
        this.container.innerHTML = `
            <div class="vdem-nav-header">Değişken Seçici</div>
            <div class="vdem-accordion">
                ${html}
            </div>
        `;

        this.attachClickHandlers();
    }

    buildMenuHtml(items, level = 0) {
        return items.map(item => {
            const hasChildren = item.children && item.children.length > 0;
            const indent = level * 12;

            if (hasChildren) {
                return `
                    <div class="vdem-nav-item level-${level}">
                        <div class="vdem-nav-header-row" data-id="${item.id}" style="padding-left: ${indent + 15}px">
                            <span class="toggle-icon">▶</span>
                            <span class="nav-title">${item.label}</span>
                        </div>
                        <div class="vdem-nav-children" style="display: none;">
                            ${this.buildMenuHtml(item.children, level + 1)}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="vdem-nav-item leaf level-${level}" data-id="${item.id}" data-variable='${JSON.stringify(item)}' style="padding-left: ${indent + 35}px">
                        <span class="nav-title">${item.label}</span>
                        <span class="var-code">${item.id}</span>
                    </div>
                `;
            }
        }).join('');
    }

    attachClickHandlers() {
        // Toggle submenus
        this.container.querySelectorAll('.vdem-nav-header-row').forEach(header => {
            header.addEventListener('click', (e) => {
                const parent = header.parentElement;
                const childrenContainer = parent.querySelector('.vdem-nav-children');
                const icon = header.querySelector('.toggle-icon');

                if (childrenContainer.style.display === 'none') {
                    childrenContainer.style.display = 'block';
                    icon.textContent = '▼';
                    icon.classList.add('open');
                } else {
                    childrenContainer.style.display = 'none';
                    icon.textContent = '▶';
                    icon.classList.remove('open');
                }
            });
        });

        // Select variable
        this.container.querySelectorAll('.vdem-nav-item.leaf').forEach(item => {
            item.addEventListener('click', (e) => {
                // Remove active class from all
                this.container.querySelectorAll('.vdem-nav-item.leaf').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const variableData = JSON.parse(item.dataset.variable);

                // Dispatch event
                const event = new CustomEvent('vdem:variable-selected', {
                    detail: variableData
                });
                document.dispatchEvent(event);
            });
        });
    }
}
