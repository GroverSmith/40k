// filename: battle-display.js (renamed from battle-loader.js)
// Unified battle display module for all battle-related UI
// 40k Crusade Campaign Tracker

const BattleDisplay = {
    /**
     * Create a hyperlinked force name
     */
    createForceLink(forceName, forceKey, baseUrl = '') {
        if (!forceKey) return forceName || 'Unknown Force';

        const path = baseUrl || (window.location.pathname.includes('/battle-reports/') ?
            '../forces/' : 'forces/');

        return `<a href="${path}force-details.html?key=${encodeURIComponent(forceKey)}">${forceName}</a>`;
    },

    /**
     * Create a hyperlinked battle name
     */
    createBattleLink(battleName, battleKey, baseUrl = '') {
        if (!battleKey) return battleName || 'Unnamed Battle';

        const path = baseUrl || (window.location.pathname.includes('/forces/') ?
            '../battle-reports/' : 'battle-reports/');

        return `<a href="${path}battle-details.html?key=${encodeURIComponent(battleKey)}">${battleName}</a>`;
    },

    // In battle-display.js, add:
    displayBattlesForCrusade(battles, container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!battles || battles.length === 0) {
            container.innerHTML = '<p class="no-data">No battles recorded yet for this crusade.</p>';
            return;
        }

        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="crusade-battles-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Battle Name</th>
                            <th>Force 1</th>
                            <th>Force 2</th>
                            <th>Victor</th>
                            <th>Score</th>
                            <th>Size</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        battles.forEach(battle => {
            const date = UIHelpers.formatDate(battle['Date Played']);
            const battleLink = this.createBattleLink(battle['Battle Name'] || 'Unnamed Battle', battle['Key'], '../battle-reports/');
            const force1Link = this.createForceLink(battle['Force 1'] || battle['Player 1'], battle['Force 1 Key'], '../forces/');
            const force2Link = this.createForceLink(battle['Force 2'] || battle['Player 2'], battle['Force 2 Key'], '../forces/');

            let victor = 'Draw';
            let victorClass = 'text-warning';

            if (battle['Victor'] && battle['Victor'] !== 'Draw') {
                const victorForceKey = battle['Victor Force Key'];
                if (victorForceKey === battle['Force 1 Key']) {
                    victor = battle['Force 1'] || battle['Player 1'];
                    victorClass = 'text-success';
                } else if (victorForceKey === battle['Force 2 Key']) {
                    victor = battle['Force 2'] || battle['Player 2'];
                    victorClass = 'text-success';
                }
            }

            const score = `${battle['Player 1 Score'] || 0}-${battle['Player 2 Score'] || 0}`;
            const size = battle['Battle Size'] ? `${battle['Battle Size']}pts` : '-';

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${battleLink}</td>
                    <td>${force1Link}</td>
                    <td>${force2Link}</td>
                    <td class="${victorClass}">${victor}</td>
                    <td class="text-center">${score}</td>
                    <td class="text-center">${size}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        if (window.UIHelpers && UIHelpers.makeSortable) {
            UIHelpers.makeSortable('crusade-battles-table');
        }
    },

    /**
     * Display battles in a table format - used by force details page
     */
    displayBattlesForForce(battles, container, forceKey) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!battles || battles.length === 0) {
            container.innerHTML = '<p class="no-data">No battles recorded yet for this force.</p>';
            return;
        }

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

            // Get opponent details
            const opponentForce = isForce1 ? battle['Force 2'] : battle['Force 1'];
            const opponentForceKey = isForce1 ? battle['Force 2 Key'] : battle['Force 1 Key'];
            const opponent = opponentForce || (isForce1 ? battle['Player 2'] : battle['Player 1']);

            // Create links
            const battleLink = this.createBattleLink(battleName, battle['Key'], '../battle-reports/');
            const opponentLink = this.createForceLink(opponent, opponentForceKey, '');

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
                    <td>${battleLink}</td>
                    <td>${opponentLink}</td>
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

        container.innerHTML = html;

        // Make table sortable if UIHelpers is available
        if (window.UIHelpers && UIHelpers.makeSortable) {
            UIHelpers.makeSortable('battles-table');
        }
    },

    /**
     * Display recent battles on homepage
     */
    async loadRecentBattles() {
        const container = document.getElementById('recent-battles-container');
        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading recent battles...');

            const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
            if (!battleUrl) {
                UIHelpers.showNoData(container, 'Battle history not configured.');
                return;
            }

            const response = await CacheManager.fetchWithCache(battleUrl, 'battleHistory');

            if (!response || response.length <= 1) {
                UIHelpers.showNoData(container, 'No battles recorded yet.');
                return;
            }

            // Sort by date (most recent first) and take top 10
            const recentBattles = response.slice(1)
                .sort((a, b) => new Date(b[5] || 0) - new Date(a[5] || 0))
                .slice(0, 10);

            this.displayRecentBattles(recentBattles, container);

        } catch (error) {
            console.error('Error loading recent battles:', error);
            UIHelpers.showError(container, 'Failed to load recent battles.');
        }
    },

    /**
     * Display recent battles table
     */
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
                        <th>Battle Name</th>
                        <th>Forces</th>
                        <th>Result</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
        `;

        battles.forEach(battle => {
            const date = UIHelpers.formatDate(battle[5]); // Date Played
            const battleName = battle[15] || 'Unnamed Battle';
            const force1 = battle[7] || battle[6]; // Force 1 name or Player 1
            const force2 = battle[10] || battle[9]; // Force 2 name or Player 2
            const score = `${battle[13] || 0}-${battle[14] || 0}`; // Scores
            const size = battle[2] ? `${battle[2]}pts` : '-';

            // Create links
            const battleLink = this.createBattleLink(battleName, battle[0]);
            const force1Link = this.createForceLink(force1, battle[3]);
            const force2Link = this.createForceLink(force2, battle[4]);

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${battleLink}</td>
                    <td>${force1Link} vs ${force2Link}</td>
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
    },

    /**
     * Calculate battle statistics for a force
     */
    calculateBattleStats(battles, forceKey) {
        const stats = {
            totalBattles: battles.length,
            victories: 0,
            defeats: 0,
            draws: 0,
            winRate: 0,
            totalPointsScored: 0,
            totalPointsConceded: 0,
            averagePointsScored: 0,
            averagePointsConceded: 0
        };

        battles.forEach(battle => {
            const victorForceKey = battle['Victor Force Key'];
            const isForce1 = battle['Force 1 Key'] === forceKey;

            if (victorForceKey === 'Draw') {
                stats.draws++;
            } else if (victorForceKey === forceKey) {
                stats.victories++;
            } else {
                stats.defeats++;
            }

            // Calculate points
            const forceScore = parseInt(isForce1 ? battle['Player 1 Score'] : battle['Player 2 Score']) || 0;
            const opponentScore = parseInt(isForce1 ? battle['Player 2 Score'] : battle['Player 1 Score']) || 0;

            stats.totalPointsScored += forceScore;
            stats.totalPointsConceded += opponentScore;
        });

        // Calculate averages and win rate
        if (stats.totalBattles > 0) {
            stats.winRate = Math.round((stats.victories / stats.totalBattles) * 100);
            stats.averagePointsScored = Math.round(stats.totalPointsScored / stats.totalBattles);
            stats.averagePointsConceded = Math.round(stats.totalPointsConceded / stats.totalBattles);
        }

        return stats;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        BattleDisplay.loadRecentBattles();
    }, 100);
});

// Make globally available
window.BattleDisplay = BattleDisplay;