// filename: battle-loader.js
// Battle loader module for displaying recent battles on main page
// 40k Crusade Campaign Tracker

const BattleLoader = {
    async loadRecentBattles() {
        const container = document.getElementById('recent-battles-container');
        if (!container) return;

        try {
            // Show loading state
            UIHelpers.showLoading(container, 'Loading recent battles...');

            const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
            if (!battleUrl) {
                UIHelpers.showNoData(container, 'Battle history not configured.');
                return;
            }

            // Fetch battle data
            const response = await CacheManager.fetchWithCache(battleUrl, 'battleHistory');

            if (!response || response.length <= 1) {
                UIHelpers.showNoData(container, 'No battles recorded yet.');
                return;
            }

            // Sort by date (most recent first) and take top 10
            const recentBattles = response.slice(1)
                .sort((a, b) => new Date(b[5] || 0) - new Date(a[5] || 0))
                .slice(0, 10);

            // Display the battles
            this.displayRecentBattles(recentBattles, container);

        } catch (error) {
            console.error('Error loading recent battles:', error);
            UIHelpers.showError(container, 'Failed to load recent battles.');
        }
    },

    displayRecentBattles(battles, container) {
        if (!battles || battles.length === 0) {
            UIHelpers.showNoData(container, 'No battles recorded yet.');
            return;
        }

        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Forces</th>
                        <th>Result</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
        `;

        battles.forEach(battle => {
            const date = UIHelpers.formatDate(battle[5]); // Date Played
            const force1 = battle[7] || battle[6]; // Force 1 name or Player 1
            const force2 = battle[10] || battle[9]; // Force 2 name or Player 2
            const score = `${battle[13] || 0}-${battle[14] || 0}`; // Scores
            const size = battle[2] || '-'; // Battle Size

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${force1} vs ${force2}</td>
                    <td>${score}</td>
                    <td>${size}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Load recent battles after a short delay to ensure all modules are ready
    setTimeout(() => {
        BattleLoader.loadRecentBattles();
    }, 100);
});

// Make globally available
window.BattleLoader = BattleLoader;