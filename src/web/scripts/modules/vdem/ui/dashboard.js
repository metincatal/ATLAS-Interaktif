import { state, setState } from '../../../core/state.js';
import { VdemNavigation } from './navigation.js';
import { VdemVisualization } from './visualization.js';
import { VdemMetadata } from './metadata.js';

export class VdemDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.init();
    }

    async init() {
        this.renderLayout();

        // Initialize sub-components
        this.navigation = new VdemNavigation('vdem-sidebar');
        this.visualization = new VdemVisualization('vdem-main-content');
        this.metadata = new VdemMetadata('vdem-right-panel');

        // Load initial data structure
        await this.navigation.loadHierarchy();

        // Initialize event listeners (after data is potentially loaded)
        this.setupEventListeners();

        // Update year slider once data is loaded
        this.updateYearSlider();
    }

    updateYearSlider() {
        const yearSlider = document.getElementById('vdem-year-slider');
        const yearLabel = document.getElementById('year-current-label');
        const yearStartLabel = document.getElementById('year-start-label');

        if (!yearSlider) return;

        // Wait for data to be loaded
        const checkData = () => {
            if (state.vdemYears && state.vdemYears.length > 0) {
                const minYear = state.vdemYears[0];
                const maxYear = state.vdemYears[state.vdemYears.length - 1];
                yearSlider.min = minYear;
                yearSlider.max = maxYear;
                yearSlider.value = maxYear;

                if (yearStartLabel) yearStartLabel.textContent = minYear;
                if (yearLabel) yearLabel.textContent = maxYear;

                setState('currentVdemYear', maxYear);
            } else {
                // Try again after 500ms
                setTimeout(checkData, 500);
            }
        };

        checkData();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="vdem-dashboard-container">
                <!-- Top Bar: Global Filters -->
                <div class="vdem-top-bar">
                    <div class="vdem-search-container">
                        <input type="text" id="vdem-country-search" placeholder="Ülke Ara (Örn: Turkey, Ottoman Empire)...">
                    </div>
                    <div class="vdem-year-slider-container">
                        <span class="year-label" id="year-start-label">1789</span>
                        <div class="range-slider">
                            <input type="range" id="vdem-year-slider" min="1789" max="2024" value="2024">
                        </div>
                        <span class="year-label" id="year-current-label">2024</span>
                    </div>
                    <div class="vdem-mode-switch">
                        <button class="mode-btn active" data-mode="modern">Modern (1900+)</button>
                        <button class="mode-btn" data-mode="historical">Tarihsel (1789+)</button>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="vdem-content-area">
                    <!-- Left Sidebar: Navigation -->
                    <div id="vdem-sidebar" class="vdem-sidebar">
                        <!-- Navigation content will be injected here -->
                    </div>

                    <!-- Center: Visualization -->
                    <div id="vdem-main-content" class="vdem-visualization-area">
                        <!-- Charts and Maps will be injected here -->
                    </div>

                    <!-- Right Sidebar: Metadata -->
                    <div id="vdem-right-panel" class="vdem-metadata-panel">
                        <!-- Metadata content will be injected here -->
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Year Slider
        const yearSlider = document.getElementById('vdem-year-slider');
        const yearLabel = document.getElementById('year-current-label');

        if (yearSlider && yearLabel) {
            yearSlider.addEventListener('input', (e) => {
                const year = parseInt(e.target.value);
                yearLabel.textContent = year;
                setState('currentVdemYear', year);
                // Trigger update on visualization if it exists
                if (this.visualization && this.visualization.highlightYear) {
                    this.visualization.highlightYear(year);
                }
            });
        }

        // Mode Switch
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modeBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const mode = e.target.dataset.mode;
                // TODO: Filter navigation based on mode
            });
        });

        // Listen for variable selection events from Navigation
        document.addEventListener('vdem:variable-selected', (e) => {
            const variable = e.detail;
            this.visualization.renderVariable(variable);
            this.metadata.showMetadata(variable);
        });
    }
}
