// filename: battles/battle-table.js
// Unified battle display module with integrated data fetching
// 40k Crusade Campaign Tracker

const BattleTable = {
    /**
     * Resolve relative path based on current location
     */
    getRelativePath(targetDir) {
        const currentPath = window.location.pathname;
        const pathMap = {
            'battles': { battles: '', forces: '../forces/', crusades: '../crusades/' },
            'forces': { battles: '../battles/', forces: '', crusades: '../crusades/' },
            'crusades': { battles: '../battles/', forces: '../forces/', crusades: '' },
            'default': { battles: 'battles/', forces: 'forces/', crusades: 'crusades/' }
        };

        let currentDir = 'default';
        if (currentPath.includes('/battles/')) currentDir = 'battles';
        else if (currentPath.includes('/forces/')) currentDir = 'forces';
        else if (currentPath.includes('/crusades/')) currentDir = 'crusades';

        return pathMap[currentDir][targetDir];
    },

    /**
     * Create hyperlinks for various entities
     */
    createLink(type, name, key) {
        if (!key) return name || `Unknown ${type}`;
        const paths = { battle: 'battles', force: 'forces', crusade: 'crusades' };
        const path = this.getRelativePath(paths[type]);
        return `<a href="${path}${type}-details.html?key=${encodeURIComponent(key)}">${name}</a>`;
    },

    createBattleLink(name, key) { return this.createLink('battle', name || 'Unnamed Battle', key); },
    createForceLink(name, key) { return this.createLink('force', name || 'Unknown Force', key); },
    createCrusadeLink(name, key) { return this.createLink('crusade', name || 'Unknown Crusade', key); },

    /**
     * Get scores from battle data
     */
    getScores(battle) {
        return {
            player1: parseInt(battle['Player 1 Score']) || 0,
            player2: parseInt(battle['Player 2 Score']) || 0
        };
    },

    /**
     * Format score display
     */
    formatScore(battle, forceKey = null) {
        const scores = this.getScores(battle);
        if (!forceKey) return `${scores.player1}-${scores.player2}`;

        const isForce1 = battle['Force 1 Key'] === forceKey;
        return isForce1 ? `${scores.player1}-${scores.player2}` : `${scores.player2}-${scores.player1}`;
    },

    /**
     * Get battle result for a specific force
     */
    getBattleResult(battle, forceKey) {
        const victorKey = battle['Victor Force Key'];
        if (victorKey === 'Draw') return 'Draw';
        return victorKey === forceKey ? 'Victory' : 'Defeat';
    },

    /**
     * Format outcome text for battle display
     */
    formatOutcome(battle) {
        const force1Link = this.createForceLink(battle['Force 1'] || battle['Player 1'], battle['Force 1 Key']);
        const force2Link = this.createForceLink(battle['Force 2'] || battle['Player 2'], battle['Force 2 Key']);
        const victorKey = battle['Victor Force Key'];

        if (victorKey === 'Draw') return `${force1Link} draws ${force2Link}`;
        if (victorKey === battle['Force 1 Key']) return `${force1Link} defeats ${force2Link}`;
        if (victorKey === battle['Force 2 Key']) return `${force2Link} defeats ${force1Link}`;
        return `${force1Link} vs ${force2Link}`;
    },

    /**
     * Build a battle row with specified columns
     */
    buildBattleRow(battle, columns, forceKey = null) {
        const date = UIHelpers.formatDate(battle['Date Played']);
        const battleLink = this.createBattleLink(battle['Battle Name'], battle.Key);
        const size = battle['Battle Size'] ? `${battle['Battle Size']}pts` : '-';

        // Build column data map
        const columnData = {
            date,
            battle: battleLink,
            outcome: this.formatOutcome(battle),
            score: this.formatScore(battle, forceKey),
            size
        };

        // Add force-specific columns if needed
        if (forceKey) {
            const isForce1 = battle['Force 1 Key'] === forceKey;
            columnData.opponent = this.createForceLink(
                isForce1 ? battle['Force 2'] : battle['Force 1'],
                isForce1 ? battle['Force 2 Key'] : battle['Force 1 Key']
            );

            const result = this.getBattleResult(battle, forceKey);
            const styles = {
                'Victory': 'color: #069101; font-weight: bold;',
                'Defeat': 'color: #cc6666; font-weight: bold;',
                'Draw': 'color: #999999;'
            };
            columnData.result = `<span style="${styles[result] || ''}">${result}</span>`;
        }

        const cells = columns.map(col => `<td>${columnData[col] || '-'}</td>`).join('');
        return `<tr>${cells}</tr>`;
    },

    /**
     * Fetch battles with caching
     */
    async fetchBattles(action, key) {
        const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
        if (!battleUrl) throw new Error('Battle history not configured');

        const configs = {
            'force': { url: `${battleUrl}?action=force-battles&forceKey=${encodeURIComponent(key)}`, cacheKey: `force_${key}` },
            'crusade': { url: `${battleUrl}?action=crusade-battles&crusadeKey=${encodeURIComponent(key)}`, cacheKey: `crusade_${key}` },
            'recent': { url: battleUrl, cacheKey: 'recent' }
        };

        const config = configs[action] || configs['recent'];
        return await CacheManager.fetchWithCache(config.url, 'battleHistory', config.cacheKey);
    },

    /**
     * Generic loader for battles
     */
    async loadBattles(type, key, containerId) {
        const container = typeof containerId === 'string' ?
            document.getElementById(containerId) : containerId;
        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading battles...');
            const result = await this.fetchBattles(type, key);

            if (result.success && result.battles?.length > 0) {
                const battles = result.battles.sort((a, b) =>
                    new Date(b['Date Played'] || 0) - new Date(a['Date Played'] || 0)
                );

                // Display configuration for each type
                const configs = {
                    'force': {
                        columns: ['date', 'battle', 'opponent', 'result', 'score', 'size'],
                        headers: ['Date', 'Battle', 'Opponent', 'Result', 'Score', 'Size'],
                        tableId: 'force-battles-table',
                        forceKey: key
                    },
                    'crusade': {
                        columns: ['date', 'battle', 'outcome', 'score'],
                        headers: ['Date', 'Battle', 'Outcome', 'Score'],
                        tableId: 'crusade-battles-table'
                    },
                    'recent': {
                        columns: ['date', 'battle', 'outcome', 'score', 'size'],
                        headers: ['Date', 'Battle Name', 'Outcome', 'Score', 'Size'],
                        tableId: 'recent-battles-table',
                        limit: 10
                    }
                };

                const config = configs[type] || configs['recent'];
                const displayBattles = config.limit ? battles.slice(0, config.limit) : battles;

                this.displayBattles(displayBattles, container, config);
            } else {
                const messages = {
                    'force': 'No battles recorded yet for this force.',
                    'crusade': 'No battles recorded yet for this crusade.',
                    'recent': 'No battles recorded yet.'
                };
                UIHelpers.showNoData(container, messages[type] || 'No battles found.');
            }
        } catch (error) {
            console.error(`Error loading ${type} battles:`, error);
            UIHelpers.showError(container, 'Failed to load battles.');
        }
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        return this.loadBattles('force', forceKey, containerId);
    },

    async loadForCrusade(crusadeKey, containerId) {
        return this.loadBattles('crusade', crusadeKey, containerId);
    },

    async loadRecentBattles() {
        const container = document.getElementById('recent-battles-container');
        if (container) return this.loadBattles('recent', null, container);
    },

    /**
     * Display battles in a table
     */
    displayBattles(battles, container, config) {
        if (!battles?.length) {
            UIHelpers.showNoData(container, 'No battles recorded yet.');
            return;
        }

        const rows = battles.map(battle =>
            this.buildBattleRow(battle, config.columns, config.forceKey)
        ).join('');

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table" ${config.tableId ? `id="${config.tableId}"` : ''}>
                    <thead>
                        <tr>${config.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        if (config.tableId && window.UIHelpers?.makeSortable) {
            UIHelpers.makeSortable(config.tableId);
        }
    },

    /**
     * Calculate battle statistics for a force
     */
    calculateBattleStats(battles, forceKey) {
        const stats = {
            totalBattles: battles.length,
            victories: 0, defeats: 0, draws: 0,
            winRate: 0,
            totalPointsScored: 0, totalPointsConceded: 0,
            averagePointsScored: 0, averagePointsConceded: 0
        };

        battles.forEach(battle => {
            const victorKey = battle['Victor Force Key'];
            const isForce1 = battle['Force 1 Key'] === forceKey;
            const scores = this.getScores(battle);

            if (victorKey === 'Draw') stats.draws++;
            else if (victorKey === forceKey) stats.victories++;
            else stats.defeats++;

            stats.totalPointsScored += isForce1 ? scores.player1 : scores.player2;
            stats.totalPointsConceded += isForce1 ? scores.player2 : scores.player1;
        });

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
    if (document.getElementById('recent-battles-container')) {
        setTimeout(() => BattleTable.loadRecentBattles(), 100);
    }
});

// Make globally available
window.BattleTable = BattleTable;