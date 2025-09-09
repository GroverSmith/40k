// filename: battles/battle-table.js
// Battle display module using TableBase utility
// 40k Crusade Campaign Tracker

const BattleTable = {    

    getDisplayConfig(type, key) {
        const configs = {
            'force': {
                columns: ['date', 'battle', 'opponent', 'result', 'score', 'size'],
                headers: ['Date', 'Battle', 'Opponent', 'Result', 'Score', 'Size'],
                tableId: 'force-battles-table',
                context: { forceKey: key },
                buildRow: this.buildBattleRow.bind(this),
                sortBy: TableBase.sortByDateDesc('date_played'),
                noDataMessage: 'No battles recorded yet for this force.',
                errorMessage: 'Failed to load battles.',
                responsiveColumns: this.getResponsiveColumns()
            },
            'crusade': {
                columns: ['date', 'battle', 'outcome', 'score'],
                headers: ['Date', 'Battle', 'Outcome', 'Score'],
                tableId: 'crusade-battles-table',
                buildRow: this.buildBattleRow.bind(this),
                sortBy: TableBase.sortByDateDesc('date_played'),
                noDataMessage: 'No battles recorded yet for this crusade.',
                errorMessage: 'Failed to load battles.',
                responsiveColumns: this.getResponsiveColumns()
            },
            'recent': {
                columns: ['date', 'battle', 'outcome', 'score', 'size'],
                headers: ['Date', 'Battle Name', 'Outcome', 'Score', 'Size'],
                tableId: 'recent-battles-table',
                buildRow: this.buildBattleRow.bind(this),
                sortBy: TableBase.sortByDateDesc('date_played'),
                limit: 30,
                noDataMessage: 'No battles recorded yet.',
                errorMessage: 'Failed to load recent battles.',
                responsiveColumns: this.getResponsiveColumns()
            }
        };
        return configs[type] || configs['recent'];
    },

    // Shared responsive column configuration
    getResponsiveColumns() {
        return {
            mobile: {
                columns: ['outcome', 'score'],
                headers: ['Outcome', 'Score']
            },
            tablet: {
                columns: ['date', 'outcome', 'score'],
                headers: ['Date', 'Outcome', 'Score']
            }
            // desktop uses default columns
        };
    },

    buildBattleRow(battle, columns, context = {}) {
        const columnData = {
            date: TableBase.formatters.date(battle.date_played),
            battle: this.createBattleLink(battle.battle_name, battle.battle_key),
            outcome: this.formatOutcome(battle),
            score: this.formatScore(battle, context.forceKey),
            size: TableBase.formatters.points(battle.battle_size)
        };

        // Add force-specific columns if needed
        if (context.forceKey) {
            const isForce1 = battle.force_key_1 === context.forceKey;
            columnData.opponent = this.createForceLink(
                isForce1 ? battle.force_2 : battle.force_1,
                isForce1 ? battle.force_key_2 : battle.force_key_1
            );

            const result = this.getBattleResult(battle, context.forceKey);
            columnData.result = `<span style="${TableBase.styles[result.toLowerCase()] || ''}">${result}</span>`;
        }

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },
    

    
    async loadBattles(type, key, containerId) {
        const displayConfig = this.getDisplayConfig(type, key);
        await TableBase.loadAndDisplay('battle_history', displayConfig, containerId);
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        const displayConfig = this.getDisplayConfig('force', forceKey);
        
        // Filter battles to only show those involving this force
        const filterFn = (battle) => {
            const force1Key = battle.force_key_1 || '';
            const force2Key = battle.force_key_2 || '';
            return force1Key === forceKey || force2Key === forceKey;
        };
        
        await TableBase.loadAndDisplay('battle_history', displayConfig, containerId, filterFn);
    },

    async loadForCrusade(crusadeKey, containerId) {
        const displayConfig = this.getDisplayConfig('crusade', crusadeKey);
        
        // Filter battles to only show those for this crusade
        const filterFn = (battle) => {
            const battleCrusadeKey = battle.crusade_key || '';
            return battleCrusadeKey === crusadeKey;
        };
        
        await TableBase.loadAndDisplay('battle_history', displayConfig, containerId, filterFn);
    },

    async loadRecentBattles() {
        const container = document.getElementById('recent-battles-container');
        if (container) return this.loadBattles('recent', null, container);
    },

    /**
     * Fetch battles (for external use, like calculating stats)
     */
    async fetchBattles(action, key) {
        const battles = await UnifiedCache.getAllRows('battle_history');
        
        // Apply filtering based on action and key
        if (action === 'force' && key) {
            return battles.filter(battle => {
                const force1Key = battle.force_key_1 || '';
                const force2Key = battle.force_key_2 || '';
                return force1Key === key || force2Key === key;
            });
        } else if (action === 'crusade' && key) {
            return battles.filter(battle => battle.crusade_key === key);
        }
        
        return battles;
    },

    createBattleLink(name, key) {
        return TableBase.createEntityLink('battle', name || 'Unnamed Battle', key);
    },
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },
    createCrusadeLink(name, key) {
        return TableBase.createEntityLink('crusade', name || 'Unknown Crusade', key);
    },

    
    getScores(battle) {
        return {
            player1: parseInt(battle.player_1_score) || 0,
            player2: parseInt(battle.player_2_score) || 0
        };
    },

    formatScore(battle, forceKey = null) {
        const scores = this.getScores(battle);
        if (!forceKey) return TableBase.formatters.score(scores.player1, scores.player2);

        const isForce1 = battle.force_key_1 === forceKey;
        return isForce1 ?
            TableBase.formatters.score(scores.player1, scores.player2) :
            TableBase.formatters.score(scores.player2, scores.player1);
    },

    getBattleResult(battle, forceKey) {
        const victorKey = battle.victor_force_key;
        if (victorKey === 'Draw') return 'Draw';
        return victorKey === forceKey ? 'Victory' : 'Defeat';
    },

    formatOutcome(battle) {
        const force1Link = this.createForceLink(
            battle.force_1 || battle.player_1, 
            battle.force_key_1
        );
        const force2Link = this.createForceLink(
            battle.force_2 || battle.player_2, 
            battle.force_key_2
        );
        const victorKey = battle.victor_force_key;

        if (victorKey === 'Draw') return `${force1Link} draws ${force2Link}`;
        if (victorKey === battle.force_key_1) return `${force1Link} defeats ${force2Link}`;
        if (victorKey === battle.force_key_2) return `${force2Link} defeats ${force1Link}`;
        return `${force1Link} vs ${force2Link}`;
    },
    
    calculateBattleStats(battles, forceKey) {
        const stats = {
            totalBattles: battles.length,
            victories: 0, defeats: 0, draws: 0,
            winRate: 0,
            totalPointsScored: 0, totalPointsConceded: 0,
            averagePointsScored: 0, averagePointsConceded: 0
        };

        battles.forEach(battle => {
            const victorKey = battle['victor_force_key'];
            const isForce1 = battle['force_key_1'] === forceKey;
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

// Make globally available
window.BattleTable = BattleTable;