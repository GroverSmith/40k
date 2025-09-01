// filename: battles/battle-table.js
// Unified battle display module with integrated data fetching
// 40k Crusade Campaign Tracker

const BattleTable = {
    /**
     * Resolve relative path based on current location
     */
    getRelativePath(targetDir) {
        const currentPath = window.location.pathname;

        // Map of current directory to target paths
        const pathMap = {
            'battles': { battles: '', forces: '../forces/', crusades: '../crusades/' },
            'forces': { battles: '../battles/', forces: '', crusades: '../crusades/' },
            'crusades': { battles: '../battles/', forces: '../forces/', crusades: '' },
            'default': { battles: 'battles/', forces: 'forces/', crusades: 'crusades/' }
        };

        // Determine current directory
        let currentDir = 'default';
        if (currentPath.includes('/battles/')) currentDir = 'battles';
        else if (currentPath.includes('/forces/')) currentDir = 'forces';
        else if (currentPath.includes('/crusades/')) currentDir = 'crusades';

        return pathMap[currentDir][targetDir];
    },

    /**
     * Create a hyperlinked battle name
     */
    createBattleLink(battleName, battleKey) {
        if (!battleKey) return battleName || 'Unnamed Battle';
        const path = this.getRelativePath('battles');
        return `<a href="${path}battle-details.html?key=${encodeURIComponent(battleKey)}">${battleName}</a>`;
    },

    /**
     * Create a hyperlinked force name
     */
    createForceLink(forceName, forceKey) {
        if (!forceKey) return forceName || 'Unknown Force';
        const path = this.getRelativePath('forces');
        return `<a href="${path}force-details.html?key=${encodeURIComponent(forceKey)}">${forceName}</a>`;
    },

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

        if (forceKey) {
            const isForce1 = battle['Force 1 Key'] === forceKey;
            return isForce1 ?
                `${scores.player1}-${scores.player2}` :
                `${scores.player2}-${scores.player1}`;
        }

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
     * Format outcome text for battle display
     */
    formatOutcome(battle) {
        const force1 = battle['Force 1'] || battle['Player 1'];
        const force2 = battle['Force 2'] || battle['Player 2'];
        const force1Key = battle['Force 1 Key'];
        const force2Key = battle['Force 2 Key'];
        const victorKey = battle['Victor Force Key'];

        const force1Link = this.createForceLink(force1, force1Key);
        const force2Link = this.createForceLink(force2, force2Key);

        if (victorKey === 'Draw') {
            return `${force1Link} draws ${force2Link}`;
        } else if (victorKey === force1Key) {
            return `${force1Link} defeats ${force2Link}`;
        } else if (victorKey === force2Key) {
            return `${force2Link} defeats ${force1Link}`;
        } else {
            return `${force1Link} vs ${force2Link}`;
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

        const fetchConfigs = {
            'force': {
                url: `${battleUrl}?action=force-battles&forceKey=${encodeURIComponent(key)}`,
                cacheKey: `force_${key}`
            },
            'crusade': {
                url: `${battleUrl}?action=crusade-battles&crusadeKey=${encodeURIComponent(key)}`,
                cacheKey: `crusade_${key}`
            },
            'recent': {
                url: battleUrl,
                cacheKey: 'recent'
            }
        };

        const config = fetchConfigs[action] || fetchConfigs['recent'];
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

            if (result.success && result.battles && result.battles.length > 0) {
                const sortedBattles = result.battles.sort((a, b) =>
                    new Date(b['Date Played'] || 0) - new Date(a['Date Played'] || 0)
                );

                // Call appropriate display method
                switch(type) {
                    case 'force':
                        this.displayBattlesForForce(sortedBattles, container, key);
                        break;
                    case 'crusade':
                        this.displayBattlesForCrusade(sortedBattles, container);
                        break;
                    case 'recent':
                        this.displayRecentBattles(sortedBattles.slice(0, 10), container);
                        break;
                }
            } else {
                const messages = {
                    'force': 'No battles recorded yet for this force.',
                    'crusade': 'No battles recorded yet for this crusade.',
                    'recent': 'No battles recorded yet.'
                };
                UIHelpers.showNoData(container, messages[type]);
            }
        } catch (error) {
            console.error(`Error loading ${type} battles:`, error);
            UIHelpers.showError(container, 'Failed to load battles.');
        }
    },

    /**
     * Load battles for a force
     */
    async loadForForce(forceKey, containerId) {
        return this.loadBattles('force', forceKey, containerId);
    },

    /**
     * Load battles for a crusade
     */
    async loadForCrusade(crusadeKey, containerId) {
        return this.loadBattles('crusade', crusadeKey, containerId);
    },

    /**
     * Load recent battles (homepage)
     */
    async loadRecentBattles() {
        const container = document.getElementById('recent-battles-container');
        if (container) {
            return this.loadBattles('recent', null, container);
        }
    },

    /**
     * Display battles for a specific force
     */
    displayBattlesForForce(battles, container, forceKey) {
        if (!battles || battles.length === 0) {
            UIHelpers.showNoData(container, 'No battles recorded yet.');
            return;
        }

        const rows = battles.map(battle => {
            const isForce1 = battle['Force 1 Key'] === forceKey;
            const opponentName = isForce1 ? battle['Force 2'] : battle['Force 1'];
            const opponentKey = isForce1 ? battle['Force 2 Key'] : battle['Force 1 Key'];

            const resultInfo = this.getBattleResult(battle, forceKey);
            const resultStyle = this.getResultStyle(resultInfo.result);

            return `
                <tr>
                    <td>${UIHelpers.formatDate(battle['Date Played'])}</td>
                    <td>${this.createBattleLink(battle['Battle Name'] || 'Unnamed Battle', battle.Key)}</td>
                    <td>${this.createForceLink(opponentName, opponentKey)}</td>
                    <td style="${resultStyle}">${resultInfo.result}</td>
                    <td>${this.formatScore(battle, forceKey)}</td>
                    <td>${battle['Battle Size'] ? `${battle['Battle Size']}pts` : '-'}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = this.wrapInTable(
            ['Date', 'Battle', 'Opponent', 'Result', 'Score', 'Size'],
            rows,
            'force-battles-table'
        );

        this.makeSortable('force-battles-table');
    },

    /**
     * Display battles for a crusade
     */
    displayBattlesForCrusade(battles, container) {
        if (!battles || battles.length === 0) {
            UIHelpers.showNoData(container, 'No battles recorded yet for this crusade.');
            return;
        }

        const rows = battles.map(battle => `
            <tr>
                <td>${UIHelpers.formatDate(battle['Date Played'])}</td>
                <td>${this.createBattleLink(battle['Battle Name'] || 'Unnamed Battle', battle.Key)}</td>
                <td>${this.formatOutcome(battle)}</td>
                <td>${this.formatScore(battle)}</td>
            </tr>
        `).join('');

        container.innerHTML = this.wrapInTable(
            ['Date', 'Battle', 'Outcome', 'Score'],
            rows,
            'crusade-battles-table'
        );

        this.makeSortable('crusade-battles-table');
    },

    /**
     * Display recent battles (homepage)
     */
    displayRecentBattles(battles, container) {
        if (!battles || battles.length === 0) {
            UIHelpers.showNoData(container, 'No battles recorded yet.');
            return;
        }

        const rows = battles.map(battle => `
            <tr>
                <td>${UIHelpers.formatDate(battle['Date Played'])}</td>
                <td>${this.createBattleLink(battle['Battle Name'] || 'Unnamed Battle', battle.Key)}</td>
                <td>${this.formatOutcome(battle)}</td>
                <td>${this.formatScore(battle)}</td>
                <td>${battle['Battle Size'] ? `${battle['Battle Size']}pts` : '-'}</td>
            </tr>
        `).join('');

        container.innerHTML = this.wrapInTable(
            ['Date', 'Battle Name', 'Outcome', 'Score', 'Size'],
            rows,
            'recent-battles-table'
        );
    },

    /**
     * Get result style string
     */
    getResultStyle(result) {
        const styles = {
            'Victory': 'color: #069101; font-weight: bold;',
            'Defeat': 'color: #cc6666; font-weight: bold;',
            'Draw': 'color: #999999;'
        };
        return styles[result] || '';
    },

    /**
     * Wrap rows in table HTML
     */
    wrapInTable(headers, rowsHtml, tableId = '') {
        return `
            <div class="table-wrapper">
                <table class="data-table" ${tableId ? `id="${tableId}"` : ''}>
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Make table sortable if UIHelpers available
     */
    makeSortable(tableId) {
        if (window.UIHelpers && UIHelpers.makeSortable) {
            UIHelpers.makeSortable(tableId);
        }
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
            const scores = this.getScores(battle);

            // Update win/loss/draw counts
            if (victorForceKey === 'Draw') {
                stats.draws++;
            } else if (victorForceKey === forceKey) {
                stats.victories++;
            } else {
                stats.defeats++;
            }

            // Update score totals
            stats.totalPointsScored += isForce1 ? scores.player1 : scores.player2;
            stats.totalPointsConceded += isForce1 ? scores.player2 : scores.player1;
        });

        // Calculate averages
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