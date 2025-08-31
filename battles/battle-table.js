// filename: battles/battle-table.js
// Unified battle display module with integrated data fetching
// 40k Crusade Campaign Tracker

const BattleDisplay = {
    /**
     * Get scores from battle data - now always object format
     */
    getScores(battle) {
        // All responses now return objects with normalized headers
        const player1Score = battle['Player 1 Score'];
        const player2Score = battle['Player 2 Score'];

        return {
            player1: parseInt(player1Score) || 0,
            player2: parseInt(player2Score) || 0
        };
    },

    /**
     * Format score display consistently
     */
    formatScore(battle, forceKey = null) {
        const scores = this.getScores(battle);

        // If we have a forceKey, determine which score belongs to this force
        if (forceKey) {
            const isForce1 = battle['Force 1 Key'] === forceKey;

            if (isForce1) {
                return `${scores.player1}-${scores.player2}`;
            } else {
                return `${scores.player2}-${scores.player1}`;
            }
        }

        // Default format (no specific force perspective)
        return `${scores.player1}-${scores.player2}`;
    },

    /**
     * Get battle result for a specific force
     */
    getBattleResult(battle, forceKey) {
        const victorForceKey = battle['Victor Force Key'];

        if (victorForceKey === 'Draw') {
            return { result: 'Draw', class: 'draw' };
        } else if (victorForceKey === forceKey) {
            return { result: 'Victory', class: 'victory' };
        } else {
            return { result: 'Defeat', class: 'defeat' };
        }
    },

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
     * Display battles for a specific force (with colored results)
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
            const isForce1 = battle['Force 1 Key'] === forceKey;
            const opponentName = isForce1 ? battle['Force 2'] : battle['Force 1'];
            const opponentKey = isForce1 ? battle['Force 2 Key'] : battle['Force 1 Key'];

            const resultInfo = this.getBattleResult(battle, forceKey);
            const score = this.formatScore(battle, forceKey);

            const date = UIHelpers.formatDate(battle['Date Played']);
            const battleName = battle['Battle Name'] || 'Unnamed Battle';
            const battleLink = this.createBattleLink(battleName, battle.Key || battle['Key']);
            const opponentLink = this.createForceLink(opponentName, opponentKey);
            const size = battle['Battle Size'] ? `${battle['Battle Size']}pts` : '-';

            // Set color styles for result
            let resultStyle = '';
            if (resultInfo.result === 'Victory') {
                resultStyle = 'style="color: #069101; font-weight: bold;"'; // Green
            } else if (resultInfo.result === 'Defeat') {
                resultStyle = 'style="color: #cc6666; font-weight: bold;"'; // Red
            } else {
                resultStyle = 'style="color: #999999;"'; // Gray for draw
            }

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${battleLink}</td>
                    <td>${opponentLink}</td>
                    <td ${resultStyle}>${resultInfo.result}</td>
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
                            <th>Outcome</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        battles.forEach(battle => {
            const date = UIHelpers.formatDate(battle['Date Played']);
            const battleName = battle['Battle Name'] || 'Unnamed Battle';
            const battleLink = this.createBattleLink(battleName, battle.Key || battle['Key']);
            const score = this.formatScore(battle);
            const outcome = this.formatOutcome(battle);

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${battleLink}</td>
                    <td>${outcome}</td>
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
            console.log('Force battles API response:', result);

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

            console.log('Crusade battles API response:', result);

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

            // Now expecting JSON response with battles array
            if (!response || !response.success || !response.battles || response.battles.length === 0) {
                UIHelpers.showNoData(container, 'No battles recorded yet.');
                return;
            }

            // Sort by date and limit to 10 most recent
            const recentBattles = response.battles
                .sort((a, b) => new Date(b['Date Played'] || 0) - new Date(a['Date Played'] || 0))
                .slice(0, 10);

            this.displayRecentBattles(recentBattles, container);

        } catch (error) {
            console.error('Error loading recent battles:', error);
            UIHelpers.showError(container, 'Failed to load recent battles.');
        }
    },

    /**
     * Format outcome text for battle display
     */
    formatOutcome(battle) {
        const force1 = battle['Force 1'] || battle['Player 1'];
        const force2 = battle['Force 2'] || battle['Player 2'];
        const force1Key = battle['Force 1 Key'];
        const force2Key = battle['Force 2 Key'];
        const victorKey = battle['Victor Force Key'];

        if (victorKey === 'Draw') {
            const force1Link = this.createForceLink(force1, force1Key);
            const force2Link = this.createForceLink(force2, force2Key);
            return `${force1Link} draws ${force2Link}`;
        } else if (victorKey === force1Key) {
            const winnerLink = this.createForceLink(force1, force1Key);
            const loserLink = this.createForceLink(force2, force2Key);
            return `${winnerLink} defeats ${loserLink}`;
        } else if (victorKey === force2Key) {
            const winnerLink = this.createForceLink(force2, force2Key);
            const loserLink = this.createForceLink(force1, force1Key);
            return `${winnerLink} defeats ${loserLink}`;
        } else {
            // Fallback if no victor determined
            const force1Link = this.createForceLink(force1, force1Key);
            const force2Link = this.createForceLink(force2, force2Key);
            return `${force1Link} vs ${force2Link}`;
        }
    },

    /**
     * Display recent battles table (homepage)
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
                        <th>Outcome</th>
                        <th>Score</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
        `;

        battles.forEach(battle => {
            const date = UIHelpers.formatDate(battle['Date Played']);
            const battleName = battle['Battle Name'] || 'Unnamed Battle';
            const size = battle['Battle Size'] ? `${battle['Battle Size']}pts` : '-';
            const score = this.formatScore(battle);
            const outcome = this.formatOutcome(battle);
            const battleLink = this.createBattleLink(battleName, battle.Key);

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${battleLink}</td>
                    <td>${outcome}</td>
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

            // Handle both lowercase and uppercase 'score'/'Score'
            const player1Score = battle['Player 1 score'] || battle['Player 1 Score'];
            const player2Score = battle['Player 2 score'] || battle['Player 2 Score'];

            const forceScore = parseInt(isForce1 ? player1Score : player2Score) || 0;
            const opponentScore = parseInt(isForce1 ? player2Score : player1Score) || 0;

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