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
        const urlParams = new URLSearchParams(window.location.search);
        this.crusadeKey = urlParams.get('key');

        if (!this.crusadeKey) {
            this.showError('No crusade specified');
            return;
        }

        try {
            // Load crusade details first
            await this.loadCrusadeDetails();

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

    async loadCrusadeDetails() {
        try {
            // First try to get the specific crusade via API
            const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
            const fetchUrl = `${crusadesUrl}?action=get&key=${encodeURIComponent(this.crusadeKey)}`;

            // USE CACHE MANAGER for the API call
            const data = await CacheManager.fetchWithCache(fetchUrl, 'crusades');

            if (data.success && data.data) {
                this.crusadeData = data.data;
                this.displayCrusadeDetails();
                return;
            }

            // If API doesn't work, fetch all crusades and find ours
            const allCrusades = await CacheManager.fetchSheetData('crusades');

            if (allCrusades && allCrusades.length > 1) {
                const headers = allCrusades[0];
                const crusadeRow = allCrusades.find((row, index) => {
                    if (index === 0) return false;
                    return row[0] === this.crusadeKey; // Key is in column 0
                });

                if (crusadeRow) {
                    // Convert to object
                    this.crusadeData = {};
                    headers.forEach((header, index) => {
                        this.crusadeData[header] = crusadeRow[index];
                    });
                    this.displayCrusadeDetails();
                    return;
                }
            }

            throw new Error('Crusade not found');

        } catch (error) {
            console.error('Error loading crusade:', error);
            throw error;
        }
    }

    displayCrusadeDetails() {
        // Update page title
        const crusadeName = this.crusadeData['Crusade Name'] || 'Unnamed Crusade';
        document.title = `${crusadeName} - Crusade Details`;

        // Update header
        const header = document.getElementById('crusade-header');
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
            const section = document.getElementById('introduction-section');
            const content = document.getElementById('introduction-content');
            if (section && content) {
                section.style.display = 'block';
                content.innerHTML = `<div class="content-block">${this.formatText(intro)}</div>`;
            }
        }

        // Rules Section - combine all rules blocks without headers
        const rulesSection = document.getElementById('rules-section');
        const rulesContent = document.getElementById('rules-content');
        if (rulesSection && rulesContent) {
            let rulesHTML = '';

            for (let i = 1; i <= 3; i++) {
                const rules = this.crusadeData[`Rules Block ${i}`];
                if (rules && rules.trim()) {
                    rulesHTML += `<div class="content-block">${this.formatText(rules)}</div>`;
                }
            }

            if (rulesHTML) {
                rulesSection.style.display = 'block';
                rulesContent.innerHTML = rulesHTML;
            }
        }

        // Narrative Section - combine all narrative blocks without headers
        const narrativeSection = document.getElementById('narrative-section');
        const narrativeContent = document.getElementById('narrative-content');
        if (narrativeSection && narrativeContent) {
            let narrativeHTML = '';

            for (let i = 1; i <= 2; i++) {
                const narrative = this.crusadeData[`Narrative Block ${i}`];
                if (narrative && narrative.trim()) {
                    narrativeHTML += `<div class="content-block">${this.formatText(narrative)}</div>`;
                }
            }

            if (narrativeHTML) {
                narrativeSection.style.display = 'block';
                narrativeContent.innerHTML = narrativeHTML;
            }
        }
    }

    async loadParticipatingForces() {
        const section = document.getElementById('participating-forces-section');
        if (section) {
            section.style.display = 'block';
            if (window.CrusadeParticipantsTable) {
                await CrusadeParticipantsTable.displayCrusadeParticipants('participating-forces-content', this.crusadeKey);
            } else {
                console.error('CrusadeParticipantsTable module not loaded');
                const container = document.getElementById('participating-forces-content');
                if (container) {
                    container.innerHTML = '<p class="error-message">Failed to display participants.</p>';
                }
            }
        }
    }

    async loadBattleHistory() {
        const section = document.getElementById('battle-history-section');
        if (section) {
            section.style.display = 'block';
            if (window.BattleTable) {
                await BattleTable.loadForCrusade(this.crusadeKey, 'battle-history-content');
            }
        }
    }

    async loadCampaignStories() {
        const section = document.getElementById('campaign-stories-section');
        if (section) {
            section.style.display = 'block';
            if (window.StoryTable) {
                await StoryTable.loadForCrusade(this.crusadeKey, 'campaign-stories-content');
            }
        }
    }



    formatText(text) {
        if (!text) return '';
        // Convert line breaks to HTML breaks and escape HTML
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        return escaped.replace(/\n/g, '<br>');
    }

    showError(message) {
        // Show error in header
        const header = document.getElementById('crusade-header');
        if (header) {
            header.innerHTML = `
                <div class="error-state" style="background: #4a1e1e; border: 2px solid #cc6666; padding: 20px; border-radius: 8px;">
                    <h3 style="color: #ff9999;">⚠️ Error</h3>
                    <p style="color: #ff9999;">${message}</p>
                    <a href="../index.html" class="btn btn-primary" style="margin-top: 15px;">Return to Campaign Tracker</a>
                </div>
            `;
        }

        // Hide all sections
        const sections = document.querySelectorAll('.data-section');
        sections.forEach(section => section.style.display = 'none');
    }

}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.crusadeDetails = new CrusadeDetails();
});