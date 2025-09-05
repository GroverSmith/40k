// filename: battles/battle-table.js
// Battle display module using TableBase utility
// 40k Crusade Campaign Tracker

const BattleTable = {


    // Simplified link creators using base
    createBattleLink(name, key) {
        return TableBase.createEntityLink('battle', name || 'Unnamed Battle', key);
    },
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },
    createCrusadeLink(name, key) {
        return TableBase.createEntityLink('crusade', name || 'Unknown Crusade', key);
    },

    /**
     * Battle-specific methods
     */
    getScores(battle) {
        return {
            player1: parseInt(battle['Player 1 Score']) || 0,
            player2: parseInt(battle['Player 2 Score']) || 0
        };
    },

    formatScore(battle, forceKey = null) {
        const scores = this.getScores(battle);
        if (!forceKey) return TableBase.formatters.score(scores.player1, scores.player2);

        const isForce1 = battle['Force 1 Key'] === forceKey;
        return isForce1 ?
            TableBase.formatters.score(scores.player1, scores.player2) :
            TableBase.formatters.score(scores.player2, scores.player1);
    },

    getBattleResult(battle, forceKey) {
        const victorKey = battle['Victor Force Key'];
        if (victorKey === 'Draw') return 'Draw';
        return victorKey === forceKey ? 'Victory' : 'Defeat';
    },

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
     * Build battle row
     */
    buildBattleRow(battle, columns, context = {}) {
        const columnData = {
            date: TableBase.formatters.date(battle['Date Played']),
            battle: this.createBattleLink(battle['Battle Name'], battle.Key),
            outcome: this.formatOutcome(battle),
            score: this.formatScore(battle, context.forceKey),
            size: TableBase.formatters.points(battle['Battle Size'])
        };

        // Add force-specific columns if needed
        if (context.forceKey) {
            const isForce1 = battle['Force 1 Key'] === context.forceKey;
            columnData.opponent = this.createForceLink(
                isForce1 ? battle['Force 2'] : battle['Force 1'],
                isForce1 ? battle['Force 2 Key'] : battle['Force 1 Key']
            );

            const result = this.getBattleResult(battle, context.forceKey);
            columnData.result = `<span style="${TableBase.styles[result.toLowerCase()] || ''}">${result}</span>`;
        }

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    /**
     * Fetch battles configuration
     */
    getFetchConfig(type, key) {
        const battleUrl = CrusadeConfig.getSheetUrl('battles');
        const configs = {
            'force': {
                url: `${battleUrl}?action=force-battles&forceKey=${encodeURIComponent(key)}`,
                cacheType: 'battles',
                cacheKey: `force_${key}`,
                dataKey: 'battles',
                loadingMessage: 'Loading battles...'
            },
            'crusade': {
                url: `${battleUrl}?action=crusade-battles&crusadeKey=${encodeURIComponent(key)}`,
                cacheType: 'battles',
                cacheKey: `crusade_${key}`,
                dataKey: 'battles',
                loadingMessage: 'Loading battles...'
            },
            'recent': {
                url: battleUrl,
                cacheType: 'battles',
                cacheKey: 'recent',
                dataKey: 'battles',
                loadingMessage: 'Loading recent battles...'
            }
        };
        return configs[type] || configs['recent'];
    },

    /**
     * Get display configuration
     */
    getDisplayConfig(type, key) {
        const configs = {
            'force': {
                columns: ['date', 'battle', 'opponent', 'result', 'score', 'size'],
                headers: ['Date', 'Battle', 'Opponent', 'Result', 'Score', 'Size'],
                tableId: 'force-battles-table',
                context: { forceKey: key },
                buildRow: this.buildBattleRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Date Played'),
                noDataMessage: 'No battles recorded yet for this force.',
                errorMessage: 'Failed to load battles.'
            },
            'crusade': {
                columns: ['date', 'battle', 'outcome', 'score'],
                headers: ['Date', 'Battle', 'Outcome', 'Score'],
                tableId: 'crusade-battles-table',
                buildRow: this.buildBattleRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Date Played'),
                noDataMessage: 'No battles recorded yet for this crusade.',
                errorMessage: 'Failed to load battles.'
            },
            'recent': {
                columns: ['date', 'battle', 'outcome', 'score', 'size'],
                headers: ['Date', 'Battle Name', 'Outcome', 'Score', 'Size'],
                tableId: 'recent-battles-table',
                buildRow: this.buildBattleRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Date Played'),
                limit: 10,
                noDataMessage: 'No battles recorded yet.',
                errorMessage: 'Failed to load recent battles.'
            }
        };
        return configs[type] || configs['recent'];
    },

    /**
     * Generic loader using base utility
     */
    async loadBattles(type, key, containerId) {
        const fetchConfig = this.getFetchConfig(type, key);
        const displayConfig = this.getDisplayConfig(type, key);

        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId);
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
     * Fetch battles (for external use, like calculating stats)
     */
    async fetchBattles(action, key) {
        const config = this.getFetchConfig(action, key);
        return await TableBase.fetchWithCache(config.url, config.cacheType, config.cacheKey);
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

// Initialize auto-loading
TableBase.initAutoLoad('recent-battles-container', () => BattleTable.loadRecentBattles());

// Make globally available
window.BattleTable = BattleTable;