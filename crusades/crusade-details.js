// filename: crusades/crusade-details.js
// Complete Crusade Details Controller with all sections working
// 40k Crusade Campaign Tracker

class CrusadeDetails {
    constructor() {
        this.crusadeKey = null;
        this.crusadeData = null;
        this.init();
    }

    async init() {
        // Get crusade key from URL using utility
        this.crusadeKey = getUrlKey('key');

        if (!this.crusadeKey) {
            this.showError('No crusade specified');
            return;
        }

        try {
            // Load crusade details first
            await this.loadCrusadeData();

            // Then load related data in parallel
            await Promise.all([
                this.loadParticipatingForces(),
                this.loadBattleHistory(),
                this.loadCampaignStories()
            ]);
        } catch (error) {
            console.error('Error initializing crusade details:', error);
            this.showError('Failed to load crusade details');
        }
    }

    async loadCrusadeData() {
        try {
            // First try to get the specific crusade via API
            const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
            const fetchUrl = `${crusadesUrl}?action=get&key=${encodeURIComponent(this.crusadeKey)}`;

            // USE CACHE MANAGER for the API call
            const data = await CacheManager.fetchWithCache(fetchUrl, 'crusades');

            if (data.success && data.data) {
                this.crusadeData = data.data;
                this.displayCrusade();
                return;
            }

            // If API doesn't work, fetch all crusades and find ours
            const allCrusades = await CacheManager.fetchSheetData('crusades');

            if (allCrusades && allCrusades.length > 1) {
                const headers = allCrusades[0];
                const crusadeRow = allCrusades.find((row, index) => {
                    if (index === 0) return false;
                    return row[0] === this.crusadeKey; // crusade_key is in column 0
                });

                if (crusadeRow) {
                    // Convert to object
                    this.crusadeData = {};
                    headers.forEach((header, index) => {
                        this.crusadeData[header] = crusadeRow[index];
                    });
                    this.displayCrusade();
                    return;
                }
            }

            // Extract available keys from error message if present
            let errorMessage = 'Crusade not found';
            if (allCrusades && allCrusades.error && allCrusades.error.includes('Available keys:')) {
                const availableKeys = allCrusades.error.split('Available keys:')[1]?.trim();
                errorMessage = `Crusade "${this.crusadeKey}" not found. Available crusades: ${availableKeys}`;
            }
            throw new Error(errorMessage);

        } catch (error) {
            console.error('Error loading crusade:', error);
            throw error;
        }
    }

    displayCrusade() {
        // Update page title
        const crusadeName = this.crusadeData['Crusade Name'] || 'Unnamed Crusade';
        document.title = `${crusadeName} - Crusade Details`;

        // Update header
        const header = CoreUtils.dom.getElement('crusade-header');
        if (header) {
            const crusadeType = this.crusadeData['Crusade Type'] || '';
            const state = this.crusadeData.State || 'Active';
            const startDate = this.crusadeData['Start Date'];
            const endDate = this.crusadeData['End Date'];

            let dateText = '';
            if (startDate && endDate) {
                dateText = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
            } else if (startDate) {
                dateText = `Started ${new Date(startDate).toLocaleDateString()}`;
            }

            let statusClass = 'status-active';
            if (state.toLowerCase() === 'past') statusClass = 'status-past';
            else if (state.toLowerCase() === 'upcoming') statusClass = 'status-upcoming';

            header.innerHTML = `
                <h1>${crusadeName}</h1>
                ${crusadeType ? `<div class="crusade-subtitle">${crusadeType}</div>` : ''}
                ${dateText ? `<div class="crusade-dates">${dateText}</div>` : ''}
                <div class="crusade-status ${statusClass}">${state}</div>
            `;
        }

        // Display all content blocks
        this.displayContentBlocks();
    }

    displayContentBlocks() {
        // Introduction
        const intro = this.crusadeData.Introduction;
        if (intro && intro.trim()) {
            const section = CoreUtils.dom.getElement('introduction-section');
            const content = CoreUtils.dom.getElement('introduction-content');
            if (section && content) {
                CoreUtils.dom.show(section);
                content.innerHTML = `<div class="content-block">${this.formatText(intro)}</div>`;
            }
        }

        // Rules Section - combine all rules blocks without headers
        const rulesSection = CoreUtils.dom.getElement('rules-section');
        const rulesContent = CoreUtils.dom.getElement('rules-content');
        if (rulesSection && rulesContent) {
            let rulesHTML = '';

            for (let i = 1; i <= 3; i++) {
                const rules = this.crusadeData[`Rules Block ${i}`];
                if (rules && rules.trim()) {
                    rulesHTML += `<div class="content-block">${this.formatText(rules)}</div>`;
                }
            }

            if (rulesHTML) {
                CoreUtils.dom.show(rulesSection);
                rulesContent.innerHTML = rulesHTML;
            }
        }

        // Narrative Section - combine all narrative blocks without headers
        const narrativeSection = CoreUtils.dom.getElement('narrative-section');
        const narrativeContent = CoreUtils.dom.getElement('narrative-content');
        if (narrativeSection && narrativeContent) {
            let narrativeHTML = '';

            for (let i = 1; i <= 2; i++) {
                const narrative = this.crusadeData[`Narrative Block ${i}`];
                if (narrative && narrative.trim()) {
                    narrativeHTML += `<div class="content-block">${this.formatText(narrative)}</div>`;
                }
            }

            if (narrativeHTML) {
                CoreUtils.dom.show(narrativeSection);
                narrativeContent.innerHTML = narrativeHTML;
            }
        }
    }

    async loadParticipatingForces() {
        const section = CoreUtils.dom.getElement('participating-forces-section');
        if (section) {
            CoreUtils.dom.show(section);
            if (window.CrusadeParticipantsTable) {
                await CrusadeParticipantsTable.displayCrusadeParticipants('participating-forces-content', this.crusadeKey);
            } else {
                console.error('CrusadeParticipantsTable module not loaded');
                CoreUtils.dom.setLoading('participating-forces-content', 'Failed to display participants.');
            }
        }
    }

    async loadBattleHistory() {
        const section = CoreUtils.dom.getElement('battle-history-section');
        if (section) {
            CoreUtils.dom.show(section);
            if (window.BattleTable) {
                await BattleTable.loadForCrusade(this.crusadeKey, 'battle-history-content');
            }
        }
    }

    async loadCampaignStories() {
        const section = CoreUtils.dom.getElement('campaign-stories-section');
        if (section) {
            CoreUtils.dom.show(section);
            if (window.StoryTable) {
                await StoryTable.loadForCrusade(this.crusadeKey, 'campaign-stories-content');
            }
        }
    }



    formatText(text) {
        if (!text) return '';
        // Use utility for HTML escaping
        return CoreUtils.strings.escapeHtml(text).replace(/\n/g, '<br>');
    }

    showError(message) {
        // Show error in header
        const header = CoreUtils.dom.getElement('crusade-header');
        if (header) {
            // Check if message contains available crusades
            let additionalInfo = '';
            if (message.includes('Available crusades:')) {
                const availableCrusades = message.split('Available crusades:')[1]?.trim();
                if (availableCrusades) {
                    additionalInfo = `
                        <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                            <strong>Available Crusades:</strong><br>
                            ${availableCrusades.split(',').map(key => 
                                `<a href="?key=${key.trim()}" style="color: #ffcc99; text-decoration: underline; margin-right: 10px;">${key.trim()}</a>`
                            ).join('')}
                        </div>
                    `;
                }
            }
            
            header.innerHTML = `
                <div class="error-state" style="background: #4a1e1e; border: 2px solid #cc6666; padding: 20px; border-radius: 8px;">
                    <h3 style="color: #ff9999;">⚠️ Error</h3>
                    <p style="color: #ff9999;">${message}</p>
                    ${additionalInfo}
                    <a href="../index.html" class="btn btn-primary" style="margin-top: 15px;">Return to Campaign Tracker</a>
                </div>
            `;
        }

        // Hide all sections using utility
        const sections = document.querySelectorAll('.data-section');
        sections.forEach(section => CoreUtils.dom.hide(section));
    }

}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.crusadeDetails = new CrusadeDetails();
});