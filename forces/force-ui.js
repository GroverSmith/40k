// filename: force-ui.js
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

    displayArmyLists(armyLists, forceName, forceKey) {
        const container = document.getElementById('army-lists-sheet');

        if (!armyLists || armyLists.length === 0) {
            this.showNoData('army-lists-sheet', `No army lists found for ${forceName}.`);
            this.showSection('army-lists-section');
            return;
        }

        // Create table
        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="army-lists-table">
                    <thead>
                        <tr>
                            <th>Army Name</th>
                            <th>Detachment</th>
                            <th>MFM Version</th>
                            <th>Points</th>
                            <th>Date Added</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        armyLists.forEach(armyList => {
            const armyListKey = armyList.Key || armyList.key || armyList.id;
            const armyName = armyList['Army Name'] || 'Unnamed List';
            const viewUrl = `../army-lists/view-army-list.html?key=${encodeURIComponent(armyListKey)}`;

            html += `
                <tr>
                    <td><a href="${viewUrl}">${armyName}</a></td>
                    <td>${armyList.Detachment || '-'}</td>
                    <td>${armyList['MFM Version'] || '-'}</td>
                    <td>${armyList['Points Value'] || '-'}</td>
                    <td>${UIHelpers.formatDate(armyList.Timestamp)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
        this.showSection('army-lists-section');

        // Make table sortable
        UIHelpers.makeSortable('army-lists-table');
    },

    displayBattles(battles, container, forceKey) {
        // Ensure container is an element
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!battles || battles.length === 0) {
            const containerId = container?.id || 'battle-history-sheet';
            this.showNoData(containerId, 'No battles recorded yet.');
            this.showSection('battle-history-section');
            return;
        }

        // Create table
        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="battles-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Battle Name</th>
                            <th>Opponent</th>
                            <th>Result</th>
                            <th>Score</th>
                            <th>Battle Size</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        battles.forEach(battle => {
            const date = UIHelpers.formatDate(battle['Date Played']);
            const battleName = battle['Battle Name'] || 'Unnamed Battle';
            const isForce1 = battle['Force 1 Key'] === forceKey;
            const opponent = isForce1 ?
                (battle['Force 2'] || battle['Player 2']) :
                (battle['Force 1'] || battle['Player 1']);

            // Determine result
            const victorForceKey = battle['Victor Force Key'];
            let result = '';
            let resultClass = '';

            if (victorForceKey === 'Draw') {
                result = 'Draw';
                resultClass = 'text-warning';
            } else if (victorForceKey === forceKey) {
                result = 'Victory';
                resultClass = 'text-success';
            } else {
                result = 'Defeat';
                resultClass = 'text-error';
            }

            const score = isForce1 ?
                `${battle['Player 1 Score'] || 0} - ${battle['Player 2 Score'] || 0}` :
                `${battle['Player 2 Score'] || 0} - ${battle['Player 1 Score'] || 0}`;

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${battleName}</td>
                    <td>${opponent}</td>
                    <td class="${resultClass}">${result}</td>
                    <td class="text-center">${score}</td>
                    <td class="text-center">${battle['Battle Size'] || '-'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        if (container) {
            container.innerHTML = html;
        }

        this.showSection('battle-history-section');

        // Make table sortable
        UIHelpers.makeSortable('battles-table');
    },

    displayUnits(units, container) {
        // Ensure container is an element
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!units || units.length === 0) {
            const containerId = container?.id || 'units-sheet';
            this.showNoData(containerId, 'No units added yet.');
            this.showSection('units-section');
            return;
        }

        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="units-table">
                    <thead>
                        <tr>
                            <th>Unit Name</th>
                            <th>Type</th>
                            <th>Role</th>
                            <th>Power Level</th>
                            <th>Points</th>
                            <th>Experience</th>
                            <th>Rank</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        units.forEach(unit => {
            const unitName = unit['Unit Name'] || 'Unnamed Unit';
            const unitType = unit['Unit Type'] || '-';
            const role = unit['Battlefield Role'] || '-';
            const powerLevel = unit['Power Level'] || '-';
            const points = unit['Points Cost'] || '-';
            const xp = unit['Experience Points'] || 0;
            const rank = unit['Rank'] || 'Battle-ready';

            html += `
                <tr>
                    <td>${unitName}</td>
                    <td>${unitType}</td>
                    <td>${role}</td>
                    <td class="text-center">${powerLevel}</td>
                    <td class="text-center">${points}</td>
                    <td class="text-center">${xp}</td>
                    <td class="rank-${rank.toLowerCase()}">${rank}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        if (container) {
            container.innerHTML = html;
        }

        this.showSection('units-section');

        // Make table sortable
        UIHelpers.makeSortable('units-table');
    },

    displayStories(stories, container) {
        // Ensure container is an element
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!stories || stories.length === 0) {
            const containerId = container?.id || 'stories-sheet';
            this.showNoData(containerId, 'No stories written yet.');
            this.showSection('stories-section');
            return;
        }

        let html = '<div class="stories-list">';

        stories.forEach(story => {
            const storyKey = story.Key || story.key;
            const title = story['Story Title'] || 'Untitled Story';
            const author = story['Author Name'] || 'Unknown Author';
            const date = UIHelpers.formatDate(story.Timestamp);
            const content = story['Story Content'] || '';
            const preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');

            const viewUrl = `../stories/view-story.html?key=${encodeURIComponent(storyKey)}`;

            html += `
                <div class="story-card">
                    <h3><a href="${viewUrl}">${title}</a></h3>
                    <div class="story-meta">By ${author} • ${date}</div>
                    <div class="story-preview">${preview}</div>
                    <a href="${viewUrl}" class="btn btn-small btn-primary">Read More</a>
                </div>
            `;
        });

        html += '</div>';

        if (container) {
            container.innerHTML = html;
        }

        this.showSection('stories-section');
    },

    displayForceLogs(logs, container) {
        // Ensure container is an element
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!logs || logs.length === 0) {
            const containerId = container?.id || 'force-logs-sheet';
            this.showNoData(containerId, 'No force logs recorded yet.');
            this.showSection('force-logs-section');
            return;
        }

        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="logs-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Event Type</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        logs.forEach(log => {
            const date = UIHelpers.formatDate(log.Timestamp || log.Date);
            const eventType = log['Event Type'] || 'Update';
            const description = log.Description || log.Notes || '-';

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${eventType}</td>
                    <td>${description}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        if (container) {
            container.innerHTML = html;
        }

        this.showSection('force-logs-section');

        // Make table sortable
        UIHelpers.makeSortable('logs-table');
    }
};

// Make globally available
window.ForceUI = ForceUI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceUI;
}