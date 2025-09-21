// filename: crusades/leaderboard-shared.js
// Shared Leaderboard Logic for 40k Crusade Campaign Tracker

class LeaderboardShared {
    /**
     * Load and display leaderboard for a given crusade
     * @param {string} crusadeKey - The crusade key to load leaderboard for
     * @param {string} containerId - The DOM element ID to display the leaderboard in
     * @returns {Promise<void>}
     */
    static async loadLeaderboard(crusadeKey, containerId) {
        const container = CoreUtils.dom.getElement(containerId);
        if (!container) {
            console.error('Leaderboard container not found:', containerId);
            return;
        }

        try {
            console.log('Loading leaderboard for crusade:', crusadeKey);
            
            // Get all points log entries for this crusade
            const pointsLogEntries = await UnifiedCache.getAllRows('crusade_points_log');
            
            // Filter for this crusade and active entries
            const crusadePoints = pointsLogEntries.filter(entry => {
                const entryCrusadeKey = entry.crusade_key || entry['Crusade Key'] || entry['crusade_key'];
                const isDeleted = entry.deleted_timestamp || entry['Deleted Timestamp'] || entry['deleted_timestamp'];
                return entryCrusadeKey === crusadeKey && !isDeleted;
            });

            // Get all forces to get force names
            const allForces = await UnifiedCache.getAllRows('forces');
            
            // Sum points by force
            const forcePoints = {};
            crusadePoints.forEach(entry => {
                const forceKey = entry.force_key || entry['Force Key'] || entry['force_key'];
                const points = Number(entry.points || entry['Points'] || entry['points'] || 0);
                
                if (forceKey) {
                    if (!forcePoints[forceKey]) {
                        forcePoints[forceKey] = {
                            forceKey: forceKey,
                            totalPoints: 0,
                            entries: []
                        };
                    }
                    forcePoints[forceKey].totalPoints += points;
                    forcePoints[forceKey].entries.push(entry);
                }
            });

            // Convert to array and sort by total points (descending)
            const leaderboardData = Object.values(forcePoints).sort((a, b) => b.totalPoints - a.totalPoints);

            // Build leaderboard HTML
            const leaderboardHTML = LeaderboardShared.buildLeaderboardHTML(leaderboardData, allForces);
            
            container.innerHTML = leaderboardHTML;

        } catch (error) {
            console.error('Error loading leaderboard:', error);
            container.innerHTML = '<div class="error-message">Failed to load leaderboard data.</div>';
        }
    }

    /**
     * Build HTML for the leaderboard display
     * @param {Array} leaderboardData - Array of force data with points
     * @param {Array} allForces - Array of all forces for name resolution
     * @returns {string} HTML string for the leaderboard
     */
    static buildLeaderboardHTML(leaderboardData, allForces) {
        if (leaderboardData.length === 0) {
            return `
                <div class="leaderboard-empty">
                    <p>No points have been recorded yet for this crusade.</p>
                    <p>Points will appear here once battles and events are logged.</p>
                </div>
            `;
        }

        let html = `
            <div class="leaderboard-container">
                <div class="leaderboard-table">
        `;

        leaderboardData.forEach((forceData, index) => {
            const rank = index + 1;
            const forceKey = forceData.forceKey;
            
            // Find the force name from allForces
            const force = allForces.find(f => {
                const fKey = f.force_key || f['Force Key'] || f['force_key'];
                return fKey === forceKey;
            });
            
            const forceName = force ? (force.force_name || force['Force Name'] || force['force_name'] || 'Unknown Force') : 'Unknown Force';
            const totalPoints = forceData.totalPoints;
            const entryCount = forceData.entries.length;

            // Add ranking emoji
            let rankEmoji = '';
            if (rank === 1) rankEmoji = '🥇';
            else if (rank === 2) rankEmoji = '🥈';
            else if (rank === 3) rankEmoji = '🥉';
            else rankEmoji = `#${rank}`;

            html += `
                <div class="leaderboard-row ${rank <= 3 ? 'top-three' : ''}">
                    <div class="leaderboard-rank">
                        <span class="rank-emoji">${rankEmoji}</span>
                    </div>
                    <div class="leaderboard-force">
                        <div class="force-name">${CoreUtils.strings.escapeHtml(forceName)}</div>
                        <div class="force-details">
                            <span class="entry-count">${entryCount} event${entryCount !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div class="leaderboard-points">
                        <span class="total-points">${totalPoints}</span>
                        <span class="points-label">points</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }
}
