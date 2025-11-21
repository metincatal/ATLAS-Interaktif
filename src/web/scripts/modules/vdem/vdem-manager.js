import { state, setState } from '../../core/state.js';
import { loadVdemData } from './vdem-data.js';
import { VdemDashboard } from './ui/dashboard.js';
import { toggleFlatMap } from '../../core/flatmap.js';
import { ANIMATION_DURATIONS } from '../../config/constants.js';

const overlaySelectors = {
    overlay: 'vdem-overlay',
    openBtn: 'vdem-button',
    closeBtn: 'vdem-overlay-close'
};

let dashboardInstance = null;

export function setupVdemExperience() {
    const vdemBtn = document.getElementById(overlaySelectors.openBtn);
    const overlay = document.getElementById(overlaySelectors.overlay);
    const closeBtn = document.getElementById(overlaySelectors.closeBtn);

    if (!vdemBtn || !overlay) {
        console.warn('V-Dem UI elemanları bulunamadı');
        return;
    }

    // Initialize Dashboard when overlay is opened
    const ensureDashboard = () => {
        if (!dashboardInstance) {
            // Clear existing content in overlay content area
            const contentArea = overlay.querySelector('.vdem-content');
            if (contentArea) {
                // Create a container for the dashboard if it doesn't exist
                let dashboardContainer = document.getElementById('vdem-dashboard-root');
                if (!dashboardContainer) {
                    dashboardContainer = document.createElement('div');
                    dashboardContainer.id = 'vdem-dashboard-root';
                    dashboardContainer.style.height = '100%';
                    contentArea.innerHTML = ''; // Clear previous content
                    contentArea.appendChild(dashboardContainer);
                }

                dashboardInstance = new VdemDashboard('vdem-dashboard-root');
            }
        }
    };

    vdemBtn.addEventListener('click', () => {
        if (state.vdemOverlayOpen) {
            closeOverlay();
            return;
        }
        openOverlay();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeOverlay();
        });
    }

    function openOverlay() {
        if (!overlay) return;
        overlay.classList.add('active');
        setState('vdemOverlayOpen', true);
        vdemBtn.classList.add('active');
        ensureDashboard();

        // Load data in background
        loadVdemData().catch(console.error);
    }

    function closeOverlay() {
        if (!overlay) return;
        overlay.classList.remove('active');
        setState('vdemOverlayOpen', false);
        vdemBtn.classList.remove('active');
    }

    // Expose functions for other modules if needed
    window.vdemControls = {
        disable: () => closeOverlay(),
        open: () => openOverlay()
    };
}

