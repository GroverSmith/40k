// filename: js/battle-history-home.js
// Battle History display for index.html - Shows battles from last 60 days
// 40k Crusade Campaign Tracker

const BattleHistoryHome = {
    /**
     * Initialize battle history on home page
     */
    async init() {
        console.log('Initializing battle history for home page');
        await this.loadRecentBattles();
    },

    /**
     * Load battles from the last 60 days
     */
    async loadRecentBattles() {
        const container = document.getElementById('recent-battles-container');
        if (!container) return;

        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Loading recent battles...</span>
            `;

            // Get battle history URL
            const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
            if (!battleUrl) {
                container.innerHTML = '<p class="no-data">Battle history not configured.</p>';
                return;
            }

            // Fetch battle data using CacheManager
            const response = await CacheManager.fetchWithCache(battleUrl, 'battleHistory');
            
            if (!response || response.length <= 1) {
                container.innerHTML = '<p class="no-data">No battles recorded yet.</p>';
                return;
            }

            // Filter battles to last 60 days
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            // Skip header row and filter by date
            const recentBattles = response.slice(1).filter(row => {
                const datePlayed = row[5]; // Date Played column
                if (!datePlayed) return false;
                
                const battleDate = new Date(datePlayed);
                return battleDate >= sixtyDaysAgo;
            });

            // Sort by date (most recent first)
            recentBattles.sort((a, b) => {
                const dateA = new Date(a[5] || 0);
                const dateB = new Date(b[5] || 0);
                return dateB - dateA;
            });

            // Display the battles
            this.displayBattles(recentBattles, container);

        } catch (error) {
            console.error('Error loading recent battles:', error);
            container.innerHTML = '<p class="error-message">Error loading battle history.</p>';
        }
    },

    /**
     * Display battles in table format
     */
    displayBattles(battles, container) {
        if (!battles || battles.length === 0) {
            container.innerHTML = '<p class="no-data">No battles in the last 60 days.</p>';
            return;
        }

        // Create table HTML
        let html = `
            <div class="sheets-table-wrapper" style="max-height: 400px; overflow-y: auto;">
                <table class="sheets-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Battle Name</th>
                            <th>Outcome</th>
                            <th>Score</th>
                            <th>Battle Size</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Add rows for each battle
        battles.forEach(battle => {
            // Extract data from columns based on battle-gas-script.js structure
            const datePlayed = this.formatDate(battle[5]); // Date Played
            const battleName = battle[15] || 'Unnamed Battle'; // Battle Name
            const battleSize = battle[2] || '-'; // Battle Size
            const player1Score = battle[13] || 0; // Player 1 Score
            const player2Score = battle[14] || 0; // Player 2 Score
            const victor = battle[12] || ''; // Victor
            const force1Name = battle[7] || battle[6] || 'Force 1'; // Force 1 name or Player 1
            const force2Name = battle[10] || battle[9] || 'Force 2'; // Force 2 name or Player 2
            const force1Key = battle[3]; // Force 1 Key
            const force2Key = battle[4]; // Force 2 Key
            
            // Create force links if keys are available
            const force1Link = force1Key ? 
                `<a href="forces/force-details.html?key=${encodeURIComponent(force1Key)}" style="color: #4ecdc4; text-decoration: none;">${this.escapeHtml(force1Name)}</a>` : 
                this.escapeHtml(force1Name);
            const force2Link = force2Key ? 
                `<a href="forces/force-details.html?key=${encodeURIComponent(force2Key)}" style="color: #4ecdc4; text-decoration: none;">${this.escapeHtml(force2Name)}</a>` : 
                this.escapeHtml(force2Name);
            
            // Format outcome string with linked force names
            let outcome = '';
            if (victor === 'Draw') {
                outcome = `${force1Link} draws with ${force2Link}`;
            } else if (victor === battle[6]) { // Player 1 won
                outcome = `${force1Link} defeats ${force2Link}`;
            } else if (victor === battle[9]) { // Player 2 won
                outcome = `${force2Link} defeats ${force1Link}`;
            } else {
                outcome = 'Outcome unclear';
            }

            // Format score - larger number first
            const p1Score = parseInt(player1Score) || 0;
            const p2Score = parseInt(player2Score) || 0;
            const score = p1Score >= p2Score ? `${p1Score} - ${p2Score}` : `${p2Score} - ${p1Score}`;

            html += `
                <tr>
                    <td>${datePlayed}</td>
                    <td>${this.escapeHtml(battleName)}</td>
                    <td>${outcome}</td>
                    <td class="text-center">${score}</td>
                    <td class="text-center">${this.escapeHtml(battleSize)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // Add summary stats
        const totalBattles = battles.length;
        html += `
            <div class="battle-summary">
                <small>📊 ${totalBattles} battle${totalBattles !== 1 ? 's' : ''} in the last 60 days</small>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Format date for display
     */
    formatDate(dateValue) {
        if (!dateValue) return '-';
        
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return dateValue;
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateValue;
        }
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other modules to load
    setTimeout(() => {
        BattleHistoryHome.init();
    }, 500);
});

// Make globally available
window.BattleHistoryHome = BattleHistoryHome;