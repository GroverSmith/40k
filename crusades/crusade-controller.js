// filename: crusades/crusade-controller.js
// Complete Crusade Details Controller with all sections working
// 40k Crusade Campaign Tracker

class CrusadeDetailsController {
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
            const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
            if (!crusadesUrl) {
                throw new Error('Crusades sheet URL not configured');
            }

            // Try fetching with the get action first
            let fetchUrl = `${crusadesUrl}?action=get&key=${encodeURIComponent(this.crusadeKey)}`;
            let response = await fetch(fetchUrl);
            let data = await response.json();

            // If that doesn't work, try the raw data approach
            if (!data.success || !data.data) {
                // Fetch the full sheet and find our crusade
                const allCrusades = await CacheManager.fetchWithCache(crusadesUrl, 'crusades');
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
            }

            this.crusadeData = data.data;
            this.displayCrusadeDetails();

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
        console.log('loadParticipatingForces called');
        const section = document.getElementById('participating-forces-section');
        const container = document.getElementById('participating-forces-content');

        console.log('Forces section found:', !!section);
        console.log('Forces container found:', !!container);

        if (!section || !container) {
            console.error('Participating forces section/container not found');
            return;
        }

        try {
            container.innerHTML = '<div class="loading-spinner"></div><span>Loading forces...</span>';
            section.style.display = 'block';

            const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
            console.log('Participants URL:', participantsUrl);

            if (!participantsUrl) {
                container.innerHTML = '<p class="no-data-message">Participants tracking not configured.</p>';
                return;
            }

            const fetchUrl = `${participantsUrl}?action=forces-for-crusade&crusade=${encodeURIComponent(this.crusadeKey)}`;
            console.log('Fetching:', fetchUrl);

            const response = await fetch(fetchUrl);
            const data = await response.json();
            console.log('Forces response:', data);

            if (data.success && data.forces && data.forces.length > 0) {
                this.displayParticipatingForces(data.forces, container);
            } else {
                container.innerHTML = '<p class="no-data-message">No forces registered for this crusade yet.</p>';
            }
        } catch (error) {
            console.error('Error loading participating forces:', error);
            container.innerHTML = '<p class="error-message">Failed to load participating forces.</p>';
        }
    }

    displayParticipatingForces(forces, container) {
        if (window.ForceDisplay) {
            ForceDisplay.displayCrusadeForces(forces, container);
        } else {
            console.error('ForceDisplay module not loaded');
            container.innerHTML = '<p class="error-message">Failed to display forces.</p>';
        }
    }

    async loadBattleHistory() {
        const container = document.getElementById('battle-history-content');
        const section = document.getElementById('battle-history-section');
        if (!container || !section) return;

        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Loading crusade battles...</span>
            `;
            section.style.display = 'block';

            const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
            if (!battleUrl) {
                container.innerHTML = '<p class="no-data">Battle history not configured.</p>';
                return;
            }

            // Fetch all battles for this crusade
            const fetchUrl = `${battleUrl}?action=crusade-battles&crusadeKey=${encodeURIComponent(this.crusadeKey)}`;
            const response = await fetch(fetchUrl);
            const result = await response.json();

            if (result.success && result.battles && result.battles.length > 0) {
                const battles = result.battles;

                // Sort by date (most recent first)
                battles.sort((a, b) => {
                    const dateA = new Date(a['Date Played'] || 0);
                    const dateB = new Date(b['Date Played'] || 0);
                    return dateB - dateA;
                });

                // Display battles using BattleDisplay module
                if (window.BattleDisplay) {
                    BattleDisplay.displayBattlesForCrusade(battles, container);
                } else {
                    console.error('BattleDisplay module not loaded');
                    container.innerHTML = '<p class="error-message">Failed to display battles.</p>';
                }
            } else {
                container.innerHTML = '<p class="no-data">No battles recorded yet for this crusade.</p>';
            }

        } catch (error) {
            console.error('Error loading battle history:', error);
            container.innerHTML = '<p class="error-message">Error loading battle history.</p>';
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


    async loadCampaignStories() {
        console.log('loadCampaignStories called');
        const section = document.getElementById('campaign-stories-section');
        const container = document.getElementById('campaign-stories-content');

        console.log('Stories section found:', !!section);
        console.log('Stories container found:', !!container);

        if (!section || !container) {
            console.error('Campaign stories section/container not found');
            return;
        }

        try {
            container.innerHTML = '<div class="loading-spinner"></div><span>Loading stories...</span>';
            section.style.display = 'block';

            const storiesUrl = CrusadeConfig.getSheetUrl('stories');
            console.log('Stories URL:', storiesUrl);

            if (!storiesUrl) {
                container.innerHTML = '<p class="no-data-message">Stories not configured.</p>';
                return;
            }

            const fetchUrl = `${storiesUrl}?action=crusade-stories&crusadeKey=${encodeURIComponent(this.crusadeKey)}`;
            console.log('Fetching stories:', fetchUrl);

            const response = await fetch(fetchUrl);
            const result = await response.json();
            console.log('Stories response:', result);

            if (result.success && result.stories && result.stories.length > 0) {
                this.displayCampaignStories(result.stories, container);
            } else {
                container.innerHTML = '<p class="no-data-message">No stories written for this crusade yet.</p>';
            }
        } catch (error) {
            console.error('Error loading campaign stories:', error);
            container.innerHTML = '<p class="error-message">Failed to load campaign stories.</p>';
        }
    }

    displayCampaignStories(stories, container) {
        if (window.StoryDisplay) {
            StoryDisplay.displayCrusadeStories(stories, container);
        } else {
            console.error('StoryDisplay module not loaded');
            container.innerHTML = '<p class="error-message">Failed to display stories.</p>';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.crusadeController = new CrusadeDetailsController();
});