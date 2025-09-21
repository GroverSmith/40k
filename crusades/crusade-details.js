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

            // Initialize force registration with crusade data
            if (window.ForceRegistration && this.crusadeData) {
                window.ForceRegistration.init(this.crusadeData);
            }

            // Then load related data in parallel
            await Promise.all([
                this.loadParticipatingForces(),
                this.loadLeaderboard(),
                this.loadBattleHistory(),
                this.loadCampaignStories(),
                this.loadPhasesAndPoints()
            ]);
        } catch (error) {
            console.error('Error initializing crusade details:', error);
            this.showError('Failed to load crusade details');
        }
    }

    async loadCrusadeData() {
        try {
            // Use UnifiedCache to get the specific crusade
            const crusade = await UnifiedCache.getRowByKey('crusades', this.crusadeKey);
            
            if (crusade) {
                this.crusadeData = crusade;
                this.displayCrusade();
                return;
            }

            // If not found, get all crusades to show available options
            const allCrusades = await UnifiedCache.getAllRows('crusades');
            const availableKeys = allCrusades.map(c => c.crusade_key).join(', ');
            
            throw new Error(`Crusade "${this.crusadeKey}" not found. Available crusades: ${availableKeys}`);

        } catch (error) {
            console.error('Error loading crusade:', error);
            throw error;
        }
    }

    displayCrusade() {
        // Debug: Log the crusade data to see what we have
        console.log('Crusade data loaded:', this.crusadeData);
        console.log('Available fields:', Object.keys(this.crusadeData));
        
        // Update page title
        const crusadeName = this.crusadeData['crusade_name'] || this.crusadeData['Crusade Name'] || 'Unnamed Crusade';
        console.log('Crusade name found:', crusadeName);
        document.title = `${crusadeName} - Crusade Details`;

        // Update header
        const header = CoreUtils.dom.getElement('crusade-header');
        if (header) {
            const crusadeType = this.crusadeData['crusade_type'] || this.crusadeData['Crusade Type'] || '';
            const state = this.crusadeData['state'] || this.crusadeData['State'] || 'Active';
            const startDate = this.crusadeData['start_date'] || this.crusadeData['Start Date'];
            const endDate = this.crusadeData['end_date'] || this.crusadeData['End Date'];

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
        const intro = this.crusadeData['introduction'] || this.crusadeData['Introduction'];
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
                const rules = this.crusadeData[`rules_block_${i}`] || this.crusadeData[`Rules Block ${i}`];
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
                const narrative = this.crusadeData[`narrative_block_${i}`] || this.crusadeData[`Narrative Block ${i}`];
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

    async loadLeaderboard() {
        const section = CoreUtils.dom.getElement('leaderboard-section');
        if (section) {
            CoreUtils.dom.show(section);
            
            // Set the points log button href with crusade key
            const viewPointsLogBtn = CoreUtils.dom.getElement('view-points-log-btn');
            if (viewPointsLogBtn) {
                viewPointsLogBtn.href = `points-log.html?key=${this.crusadeKey}`;
            }
            
            // Set the record battle button href with crusade key
            const recordBattleBtn = CoreUtils.dom.getElement('record-battle-btn');
            if (recordBattleBtn) {
                recordBattleBtn.href = `../battles/battle-add.html?crusadeKey=${this.crusadeKey}`;
            }
            
            // Use shared leaderboard logic
            await LeaderboardShared.loadLeaderboard(this.crusadeKey, 'leaderboard-content');
        }
    }

    async loadBattleHistory() {
        const section = CoreUtils.dom.getElement('battle-history-section');
        if (section) {
            CoreUtils.dom.show(section);
            if (window.BattleTable) {
                console.log('Loading battle history for crusade:', this.crusadeKey);
                await BattleTable.loadForCrusade(this.crusadeKey, 'battle-history-content');
            } else {
                console.error('BattleTable module not loaded');
            }
        }
    }

    async loadCampaignStories() {
        const section = CoreUtils.dom.getElement('campaign-stories-section');
        if (section) {
            CoreUtils.dom.show(section);
            
            // Set the write story button href with crusade key
            const addStoryBtn = CoreUtils.dom.getElement('add-story-btn');
            if (addStoryBtn) {
                addStoryBtn.href = `../stories/story-add.html?crusadeKey=${this.crusadeKey}`;
            }
            
            if (window.StoryTable) {
                console.log('Loading campaign stories for crusade:', this.crusadeKey);
                await StoryTable.loadForCrusade(this.crusadeKey, 'campaign-stories-content');
            } else {
                console.error('StoryTable module not loaded');
            }
        }
    }

    async loadPhasesAndPoints() {
        try {
            console.log('Loading phases and points for crusade:', this.crusadeKey);
            
            // Always use UnifiedCache - handle data mapping issues in the cache layer
            let crusadePhases = [];
            let crusadeCategories = [];
            let crusadeScheme = [];

            // Load phases through cache with error handling
            try {
                const phases = await UnifiedCache.getAllRows('crusade_phases');
                
                // Filter for this crusade and handle different field name formats
                crusadePhases = phases.filter(phase => {
                    const phaseCrusadeKey = phase.crusade_key || phase['Crusade Key'] || phase['crusade_key'];
                    const isDeleted = phase.deleted_timestamp || phase['Deleted Timestamp'] || phase['deleted_timestamp'];
                    return phaseCrusadeKey === this.crusadeKey && !isDeleted;
                });
            } catch (error) {
                console.warn('Error loading phases from cache:', error);
            }

            // Load points categories through cache
            try {
                const categories = await UnifiedCache.getAllRows('crusade_points_categories');
                
                crusadeCategories = categories.filter(cat => {
                    const catCrusadeKey = cat.crusade_key || cat['Crusade Key'] || cat['crusade_key'];
                    const isDeleted = cat.deleted_timestamp || cat['Deleted Timestamp'] || cat['deleted_timestamp'];
                    return catCrusadeKey === this.crusadeKey && !isDeleted;
                });
            } catch (error) {
                console.warn('Error loading points categories from cache:', error);
            }

            // Load points scheme through cache
            try {
                const scheme = await UnifiedCache.getAllRows('crusade_points_scheme');
                
                crusadeScheme = scheme.filter(s => {
                    const schemeCrusadeKey = s.crusade_key || s['Crusade Key'] || s['crusade_key'];
                    const isDeleted = s.deleted_timestamp || s['Deleted Timestamp'] || s['deleted_timestamp'];
                    return schemeCrusadeKey === this.crusadeKey && !isDeleted;
                });
            } catch (error) {
                console.warn('Error loading points scheme from cache:', error);
            }

            if (crusadePhases.length === 0) {
                console.log('No phases found for crusade:', this.crusadeKey);
                return;
            }

            // Sort phases by phase_number
            crusadePhases.sort((a, b) => {
                const aNum = a.phase_number || a['Phase Number'] || a['phase_number'] || 0;
                const bNum = b.phase_number || b['Phase Number'] || b['phase_number'] || 0;
                return aNum - bNum;
            });

            // Build the phases summary HTML
            const phasesSummaryHTML = this.buildPhasesSummaryHTML(crusadePhases, crusadeCategories, crusadeScheme);
            
            // Insert the summary into the rules content
            const rulesContent = CoreUtils.dom.getElement('rules-content');
            if (rulesContent && phasesSummaryHTML) {
                // Add the summary at the end of the rules content
                rulesContent.insertAdjacentHTML('beforeend', phasesSummaryHTML);
            }

        } catch (error) {
            console.error('Error loading phases and points data:', error);
        }
    }

    buildPhasesSummaryHTML(phases, categories, scheme) {
        if (phases.length === 0) return '';

        let html = `
            <div class="phases-summary-block">
                <h4>🎯 Campaign Phases & Scoring</h4>
                <div class="phases-overview">
        `;

        phases.forEach(phase => {
            // Handle different possible field names
            const phaseKey = phase.phase_key || phase['Phase Key'] || phase['phase_key'];
            const phaseNumber = phase.phase_number || phase['Phase Number'] || phase['phase_number'] || 'Unknown';
            const phaseName = phase.phase_name || phase['Phase Name'] || phase['phase_name'] || 'Unnamed Phase';
            const startDate = phase.start_date ? new Date(phase.start_date).toLocaleDateString() : 'TBD';
            const endDate = phase.end_date ? new Date(phase.end_date).toLocaleDateString() : 'Ongoing';
            
            // Get categories for this phase
            const phaseCategories = categories.filter(cat => 
                (cat.phase_key === phaseKey) || (cat['Phase Key'] === phaseKey)
            );
            
            // Get points scheme for this phase
            const phaseScheme = scheme.filter(s => 
                (s.phase_key === phaseKey) || (s['Phase Key'] === phaseKey)
            );

            html += `
                <div class="phase-block">
                    <div class="phase-header">
                        <h5>Phase ${phaseNumber}: ${phaseName}</h5>
                        <div class="phase-dates">${startDate} - ${endDate}</div>
                    </div>
            `;

            // Handle different possible field names for introduction
            const introduction = phase.introduction || phase['Introduction'] || phase['introduction'];
            if (introduction && introduction.trim()) {
                html += `<div class="phase-intro">${this.formatText(introduction)}</div>`;
            }

            // Add points categories summary
            if (phaseCategories.length > 0) {
                html += `
                    <div class="points-categories">
                        <h6>Points Categories:</h6>
                        <ul class="category-list">
                `;
                
                phaseCategories.forEach(cat => {
                    const category = cat.category || cat['Category'] || cat['category'];
                    const maxPoints = cat.max_popints_for_phase || cat.max_points_for_phase || 
                                     cat['Max Points For Phase'] || cat['max_points_for_phase'] || 'Unlimited';
                    html += `<li><strong>${category}</strong>: ${maxPoints} points max</li>`;
                });
                
                html += `</ul></div>`;
            }

            // Add points scheme details
            if (phaseScheme.length > 0) {
                html += `
                    <div class="points-scheme">
                        <h6>Scoring Events:</h6>
                        <div class="compact-scheme-table">
                `;
                
                // Sort events using sort_order column, fallback to event_type and category
                const sortedPhaseScheme = phaseScheme.sort((a, b) => {
                    const aSortOrder = a.sort_order || a['Sort Order'] || a['sort_order'];
                    const bSortOrder = b.sort_order || b['Sort Order'] || b['sort_order'];
                    
                    // If both have sort_order, use that for primary sorting
                    if (aSortOrder !== undefined && bSortOrder !== undefined) {
                        const sortOrderDiff = Number(aSortOrder) - Number(bSortOrder);
                        if (sortOrderDiff !== 0) {
                            return sortOrderDiff;
                        }
                    }
                    
                    // Fallback to event_type and category sorting
                    const aEventType = a.event_type || a['Event Type'] || a['event_type'] || '';
                    const bEventType = b.event_type || b['Event Type'] || b['event_type'] || '';
                    const aCategory = a.point_category || a['Point Category'] || a['point_category'] || '';
                    const bCategory = b.point_category || b['Point Category'] || b['point_category'] || '';
                    
                    // Sort by event type first, then by category
                    if (aEventType !== bEventType) {
                        return aEventType.localeCompare(bEventType);
                    }
                    return aCategory.localeCompare(bCategory);
                });
                
                // Display all events in a compact format without grouping
                sortedPhaseScheme.forEach(event => {
                    const points = event.points || event['Points'] || event['points'] || 0;
                    const pointCategory = event.point_category || event['Point Category'] || event['point_category'] || 'Unknown';
                    const eventType = event.event_type || event['Event Type'] || event['event_type'] || '';
                    const notes = event.notes || event['Notes'] || event['notes'];
                    
                    // Create compact display with event type and category
                    const eventDisplay = eventType ? `${eventType}: ${pointCategory}` : pointCategory;
                    const notesDisplay = notes ? ` (${notes})` : '';
                    
                    html += `
                        <div class="compact-event-item">
                            <span class="compact-event-text">${eventDisplay}</span>
                            <span class="compact-event-points">${points} pts</span>
                            ${notesDisplay ? `<span class="compact-event-notes">${notesDisplay}</span>` : ''}
                        </div>
                    `;
                });
                
                html += `</div></div>`;
            }

            html += `</div>`;
        });

        html += `</div></div>`;
        return html;
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

// Toggle collapsible sections
function toggleCollapsible(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const header = section.querySelector('.collapsible-header');
    const content = section.querySelector('.collapsible-content');
    
    if (!header || !content) return;

    const isCollapsed = header.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expand
        header.classList.remove('collapsed');
        content.classList.remove('collapsed');
    } else {
        // Collapse
        header.classList.add('collapsed');
        content.classList.add('collapsed');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.crusadeDetails = new CrusadeDetails();
});