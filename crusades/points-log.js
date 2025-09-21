// filename: crusades/points-log.js
// Points Log Controller for 40k Crusade Campaign Tracker

class PointsLog {
    constructor() {
        this.crusadeKey = null;
        this.crusadeData = null;
        this.pointsLogData = [];
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
            
            // Set back button href
            const backButton = CoreUtils.dom.getElement('back-to-crusade');
            if (backButton) {
                backButton.href = `crusade-details.html?key=${this.crusadeKey}`;
            }

            // Load data in parallel
            await Promise.all([
                this.loadLeaderboard(),
                this.loadPointsLogData()
            ]);

        } catch (error) {
            console.error('Error initializing points log:', error);
            this.showError('Failed to load points log data');
        }
    }

    async loadCrusadeData() {
        try {
            // Use UnifiedCache to get the specific crusade
            const crusade = await UnifiedCache.getRowByKey('crusades', this.crusadeKey);
            
            if (crusade) {
                this.crusadeData = crusade;
                this.displayCrusadeHeader();
                return;
            }

            throw new Error(`Crusade "${this.crusadeKey}" not found`);

        } catch (error) {
            console.error('Error loading crusade:', error);
            throw error;
        }
    }

    displayCrusadeHeader() {
        const crusadeName = this.crusadeData['crusade_name'] || this.crusadeData['Crusade Name'] || 'Unnamed Crusade';
        document.title = `${crusadeName} - Points Log`;

        const header = CoreUtils.dom.getElement('points-log-header');
        if (header) {
            header.innerHTML = `
                <h1>Points Log</h1>
                <div class="crusade-subtitle">${crusadeName}</div>
            `;
        }
    }

    async loadLeaderboard() {
        const section = CoreUtils.dom.getElement('leaderboard-section');
        if (section) {
            CoreUtils.dom.show(section);
            
            // Use shared leaderboard logic
            await LeaderboardShared.loadLeaderboard(this.crusadeKey, 'leaderboard-content');
        }
    }

    async loadPointsLogData() {
        try {
            console.log('Loading points log for crusade:', this.crusadeKey);
            
            // Get all points log entries
            const allPointsLogEntries = await UnifiedCache.getAllRows('crusade_points_log');
            
            // Filter for this crusade and active entries
            this.pointsLogData = allPointsLogEntries.filter(entry => {
                const entryCrusadeKey = entry.crusade_key || entry['Crusade Key'] || entry['crusade_key'];
                const isDeleted = entry.deleted_timestamp || entry['Deleted Timestamp'] || entry['deleted_timestamp'];
                return entryCrusadeKey === this.crusadeKey && !isDeleted;
            });

            // Sort by timestamp (newest first)
            this.pointsLogData.sort((a, b) => {
                const timestampA = new Date(a.timestamp || a['Timestamp'] || a['timestamp'] || 0);
                const timestampB = new Date(b.timestamp || b['Timestamp'] || b['timestamp'] || 0);
                return timestampB - timestampA;
            });

            // Get additional data for display
            const [allForces, allPhases] = await Promise.all([
                UnifiedCache.getAllRows('forces'),
                UnifiedCache.getAllRows('crusade_phases')
            ]);

            // Display the data
            this.displayPointsLogTable(allForces, allPhases);
            this.displayPointsSummary(allForces);

            // Show sections
            CoreUtils.dom.show('points-log-section');
            CoreUtils.dom.show('points-summary-section');

        } catch (error) {
            console.error('Error loading points log data:', error);
            this.showError('Failed to load points log data');
        }
    }

    displayPointsLogTable(allForces, allPhases) {
        const content = CoreUtils.dom.getElement('points-log-content');
        if (!content) return;

        if (this.pointsLogData.length === 0) {
            content.innerHTML = `
                <div class="no-data-message">
                    <p>No points have been recorded yet for this crusade.</p>
                    <p>Points will appear here once battles and events are logged.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="points-log-table-container">
                <table class="sheets-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Force</th>
                            <th>Phase</th>
                            <th>Event</th>
                            <th>Points</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.pointsLogData.forEach(entry => {
            const timestamp = entry.timestamp || entry['Timestamp'] || entry['timestamp'];
            const forceKey = entry.force_key || entry['Force Key'] || entry['force_key'];
            const phaseKey = entry.phase_key || entry['Phase Key'] || entry['phase_key'];
            const event = entry.event || entry['Event'] || entry['event'] || '';
            const points = entry.points || entry['Points'] || entry['points'] || 0;
            const notes = entry.notes || entry['Notes'] || entry['notes'] || '';

            // Find force name
            const force = allForces.find(f => {
                const fKey = f.force_key || f['Force Key'] || f['force_key'];
                return fKey === forceKey;
            });
            const forceName = force ? (force.force_name || force['Force Name'] || force['force_name'] || 'Unknown Force') : 'Unknown Force';

            // Find phase name
            const phase = allPhases.find(p => {
                const pKey = p.phase_key || p['Phase Key'] || p['phase_key'];
                return pKey === phaseKey;
            });
            const phaseName = phase ? (phase.phase_name || phase['Phase Name'] || phase['phase_name'] || 'Unknown Phase') : 'Unknown Phase';

            // Format date
            const dateStr = timestamp ? new Date(timestamp).toLocaleDateString() : 'Unknown';
            const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : '';

            html += `
                <tr>
                    <td>
                        <div class="date-cell">
                            <div class="date">${dateStr}</div>
                            ${timeStr ? `<div class="time">${timeStr}</div>` : ''}
                        </div>
                    </td>
                    <td>${CoreUtils.strings.escapeHtml(forceName)}</td>
                    <td>${CoreUtils.strings.escapeHtml(phaseName)}</td>
                    <td>${CoreUtils.strings.escapeHtml(event)}</td>
                    <td class="points-cell">
                        <span class="points-value ${points > 0 ? 'positive' : points < 0 ? 'negative' : ''}">${points}</span>
                    </td>
                    <td>${CoreUtils.strings.escapeHtml(notes)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        content.innerHTML = html;
    }

    displayPointsSummary(allForces) {
        const content = CoreUtils.dom.getElement('points-summary-content');
        if (!content) return;

        // Calculate summary statistics
        const summary = this.calculatePointsSummary(allForces);
        
        let html = `
            <div class="points-summary-container">
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-value">${summary.totalEvents}</div>
                        <div class="stat-label">Total Events</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${summary.totalPoints}</div>
                        <div class="stat-label">Total Points</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${summary.participatingForces}</div>
                        <div class="stat-label">Participating Forces</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${summary.averagePointsPerEvent.toFixed(1)}</div>
                        <div class="stat-label">Avg Points/Event</div>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = html;
    }

    calculatePointsSummary(allForces) {
        let totalEvents = this.pointsLogData.length;
        let totalPoints = 0;
        let participatingForces = new Set();

        this.pointsLogData.forEach(entry => {
            const points = Number(entry.points || entry['Points'] || entry['points'] || 0);
            const forceKey = entry.force_key || entry['Force Key'] || entry['force_key'];
            
            totalPoints += points;
            if (forceKey) {
                participatingForces.add(forceKey);
            }
        });

        return {
            totalEvents,
            totalPoints,
            participatingForces: participatingForces.size,
            averagePointsPerEvent: totalEvents > 0 ? totalPoints / totalEvents : 0
        };
    }


    showError(message) {
        // Show error in header
        const header = CoreUtils.dom.getElement('points-log-header');
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
        sections.forEach(section => CoreUtils.dom.hide(section));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pointsLog = new PointsLog();
});
