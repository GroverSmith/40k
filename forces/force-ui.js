// filename: forces/force-ui.js
// Complete Force UI with all required methods
// 40k Crusade Campaign Tracker

const ForceUI = {
    updateHeader(forceData) {
        const header = document.getElementById('force-header');
        const launchDate = UIHelpers.formatDate(forceData.timestamp);

        header.innerHTML = `
            <h1>${forceData.forceName}</h1>
            <div class="force-subtitle">
                ${forceData.faction}${forceData.detachment ? ` - ${forceData.detachment}` : ''} • Commanded by ${forceData.playerName}
            </div>
            ${launchDate ? `<div class="force-launch-date">Crusade Force Launched on ${launchDate}</div>` : ''}
            <div class="force-key-display">
                Force Key: <code>${forceData.key}</code>
            </div>
        `;

        document.title = `${forceData.forceName} - Crusade Force`;
    },

    /**
     * Show a section by ID
     */
    showSection(sectionId, displayType = 'block') {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = displayType;
        }
    },

    /**
     * Hide a section by ID
     */
    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    },

    /**
     * Show loading state in a section
     */
    showLoading(containerId, message = 'Loading...') {
        UIHelpers.showLoading(containerId, message);
    },

    /**
     * Show no data message in a section
     */
    showNoData(containerId, message) {
        UIHelpers.showNoData(containerId, message);
    },

    /**
     * Show error in a section
     */
    showError(containerId, message) {
        UIHelpers.showError(containerId, message);
    },

    /**
     * Display placeholder content (for sections without data yet)
     */
    displayPlaceholder(containerId, message = 'Coming soon...') {
        const container = typeof containerId === 'string' ?
            document.getElementById(containerId) : containerId;

        if (container) {
            container.innerHTML = `
                <div class="placeholder-message">
                    <p class="text-muted">${message}</p>
                </div>
            `;
        }
    },

    updateStatsFromBattles(battles, forceKey) {
        const stats = {
            battlesFought: battles.length,
            victories: 0,
            defeats: 0,
            draws: 0
        };

        battles.forEach(battle => {
            const victorForceKey = battle['Victor Force Key'] || '';

            if (victorForceKey === 'Draw') {
                stats.draws++;
            } else if (victorForceKey === forceKey) {
                stats.victories++;
            } else {
                stats.defeats++;
            }
        });

        // Update DOM
        const elements = {
            'battles-fought': stats.battlesFought,
            'victories': stats.victories,
            'battle-losses': stats.defeats,
            'battle-ties': stats.draws
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        // Use the original CoreUtils.dom.show with 'grid' display type
        if (typeof CoreUtils !== 'undefined' && CoreUtils.dom) {
            CoreUtils.dom.show('force-stats', 'grid');
        } else {
            // Fallback - set display to grid instead of block
            const statsEl = document.getElementById('force-stats');
            if (statsEl) {
                statsEl.style.display = 'grid';
            }
        }
    },



    displayBattles(battles, container, forceKey) {
        // Delegate to BattleTable module
        if (window.BattleTable) {
            BattleTable.displayBattlesForForce(battles, container, forceKey);
            this.showSection('battle-history-section');
        } else {
            console.error('BattleTable module not loaded');
            this.showError(container, 'Failed to display battles');
        }
    },




};

// Make globally available
window.ForceUI = ForceUI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceUI;
}