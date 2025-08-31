// filename: battles/battle-table.js
// Unified battle display module with integrated data fetching
// 40k Crusade Campaign Tracker

const BattleDisplay = {
    /**
     * Create a hyperlinked battle name
     */
    createBattleLink(battleName, battleKey) {
        if (!battleKey) return battleName || 'Unnamed Battle';

        // Determine the correct path based on current location
        let path = '';
        if (window.location.pathname.includes('/battles/')) {
            path = ''; // Same directory
        } else if (window.location.pathname.includes('/forces/')) {
            path = '../battles/';
        } else if (window.location.pathname.includes('/crusades/')) {
            path = '../battles/';
        } else {
            path = 'battles/'; // From root/index
        }

        return `<a href="${path}battle-details.html?key=${encodeURIComponent(battleKey)}">${battleName}</a>`;
    },

    /**
     * Create a hyperlinked force name
     */
    createForceLink(forceName, forceKey) {
        if (!forceKey) return forceName || 'Unknown Force';

        // Determine the correct path based on current location
        let path = '';
        if (window.location.pathname.includes('/forces/')) {
            path = ''; // Same directory
        } else if (window.location.pathname.includes('/battles/')) {
            path = '../forces/';
        } else if (window.location.pathname.includes('/crusades/')) {
            path = '../forces/';
        } else {
            path = 'forces/'; // From root/index
        }

        return `<a href="${path}force-details.html?key=${encodeURIComponent(forceKey)}">${forceName}</a>`;
    },

    /**
     * Display battles for a specific force
     */
    displayBattlesForForce(battles, container, forceKey) {
        if (!battles || battles.length === 0) {
            UIHelpers.showNoData(container, 'No battles recorded yet.');
            return;
        }

        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="force-battles-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Battle</th>
                            <th>Opponent</th>
                            <th>Result</th>
                            <th>Score</th>
                            <th>Size</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        battles.forEach(battle => {
            // Determine if this force was Force 1 or Force 2
            const isForce1 = battle['Force 1 Key'] === forceKey;
            const opponentName = isForce1 ? battle['Force 2'] : battle['Force 1'];
            const opponentKey = isForce1 ? battle['Force 2 Key'] : battle['Force 1 Key'];
            const playerScore = isForce1 ? battle['Player 1 Score'] : battle['Player 2 Score'];
            const opponentScore = isForce1 ? battle['Player 2 Score'] : battle['Player 1 Score'];

            // Determine result
            let result = 'Draw';
            let resultClass = 'draw';
            if (battle['Victor Force Key'] === forceKey) {
                result = 'Victory';
                resultClass = 'victory';
            } else if (battle['Victor Force Key'] && battle['Victor Force Key'] !== 'Draw') {
                result = 'Defeat';
                resultClass = 'defeat';
            }

            const date = UIHelpers.formatDate(battle['Date Played']);
            const battleName = battle['Battle Name'] || 'Unnamed Battle';
            const battleLink = this.createBattleLink(battleName, battle.Key);
            const opponentLink = this.createForceLink(opponentName, opponentKey);
            const score = `${playerScore || 0}-${opponentScore || 0}`;
            const size = battle['Battle Size'] ? `${battle['Battle Size']}pts` : '-';

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${battleLink}</td>
                    <td>${opponentLink}</td>
                    <td class="${resultClass}">${result}</td>
                    <td>${score}</td>
                    <td>${size}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Make table sortable
        if (window.UIHelpers && UIHelpers.makeSortable) {
            UIHelpers.makeSortable('force-battles-table');
        }
    },

    /**
     * Display battles for a crusade
     */
    displayBattlesForCrusade(battles, container) {
        if (!battles || battles.length === 0) {
            UIHelpers.showNoData(container, 'No battles recorded yet for this crusade.');
            return;
        }

        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="crusade-battles-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Battle</th>
                            <th>Force 1</th>
                            <th>Force 2</th>
                            <th>Result</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        battles.forEach(battle => {
            const date = UIHelpers.formatDate(battle['Date Played']);
            const battleName = battle['Battle Name'] || 'Unnamed Battle';
            const battleLink = this.createBattleLink(battleName, battle.Key);
            const force1Link = this.createForceLink(battle['Force 1'], battle['Force 1 Key']);
            const force2Link = this.createForceLink(battle['Force 2'], battle['Force 2 Key']);

            let resultText = 'Draw';
            if (battle['Victor'] && battle['Victor'] !== 'Draw') {
                resultText = `${battle['Victor']} Victory`;
            }

            const score = `${battle['Player 1 Score'] || 0}-${battle['Player 2 Score'] || 0}`;

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${battleLink}</td>
                    <td>${force1Link}</td>
                    <td>${force2Link}</td>
                    <td>${resultText}</td>
                    <td>${score}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Make table sortable
        if (window.UIHelpers && UIHelpers.makeSortable) {
            UIHelpers.makeSortable('crusade-battles-table');
        }
    },

    /**
     * Fetch battles with caching
     */
    async fetchBattles(action, key) {
        const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
        if (!battleUrl) {
            throw new Error('Battle history not configured');
        }

        let fetchUrl, cacheKey;

        switch(action) {
            case 'force':
                fetchUrl = `${battleUrl}?action=force-battles&forceKey=${encodeURIComponent(key)}`;
                cacheKey = `force_${key}`;
                break;
            case 'crusade':
                fetchUrl = `${battleUrl}?action=crusade-battles&crusadeKey=${encodeURIComponent(key)}`;
                cacheKey = `crusade_${key}`;
                break;
            case 'recent':
                fetchUrl = battleUrl;
                cacheKey = 'recent';
                break;
            default:
                fetchUrl = battleUrl;
                cacheKey = 'all';
        }

        return await CacheManager.fetchWithCache(fetchUrl, 'battleHistory', cacheKey);
    },

    /**
     * Load and display battles for a force
     */
    async loadAndDisplayForForce(forceKey, containerId) {
        const container = typeof containerId === 'string' ?
            document.getElementById(containerId) : containerId;

        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading battle history...');

            const result = await this.fetchBattles('force', forceKey);

            if (result.success && result.battles && result.battles.length > 0) {
                const battles = result.battles.sort((a, b) =>
                    new Date(b['Date Played'] || 0) - new Date(a['Date Played'] || 0)
                );
                this.displayBattlesForForce(battles, container, forceKey);
            } else {
                UIHelpers.showNoData(container, 'No battles recorded yet for this force.');
            }
        } catch (error) {
            console.error('Error loading battles:', error);
            UIHelpers.showError(container, 'Failed to load battle history.');
        }
    },

    /**
     * Load and display battles for a crusade
     */
    async loadForCrusade(crusadeKey, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        try {
            UIHelpers.showLoading(container, 'Loading battles...');

            const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
            const fetchUrl = `${battleUrl}?action=crusade-battles&crusadeKey=${encodeURIComponent(crusadeKey)}`;

            const result = await CacheManager.fetchWithCache(
                fetchUrl,
                'battleHistory',
                `crusade_${crusadeKey}`
            );

            if (result.success && result.battles && result.battles.length > 0) {
                this.displayBattlesForCrusade(result.battles, container);
            } else {
                UIHelpers.showNoData(container, 'No battles recorded yet for this crusade.');
            }
        } catch (error) {
            console.error('Error in loadForCrusade:', error);
            UIHelpers.showError(container, 'Failed to load battles.');
        }
    },

    /**
     * Load and display recent battles (homepage)
     */
    async loadRecentBattles() {
        const container = document.getElementById('recent-battles-container');
        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading recent battles...');

            const response = await this.fetchBattles('recent');

            if (!response || response.length <= 1) {
                UIHelpers.showNoData(container, 'No battles recorded yet.');
                return;
            }

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

// Initialize when DOM is ready - but check if the container exists first
document.addEventListener('DOMContentLoaded', () => {
    // Only try to load recent battles if we're on a page that has the container
    if (document.getElementById('recent-battles-container')) {
        // Use a small delay to ensure all other modules are loaded
        setTimeout(() => {
            BattleDisplay.loadRecentBattles();
        }, 100);
    }
});

// Make globally available
window.BattleDisplay = BattleDisplay;