// filename: forces/force-table.js
// Force display module using TableBase utility
// 40k Crusade Campaign Tracker

const ForceTable = {
    // Use base utility for common methods
    getRelativePath: (dir) => TableBase.getRelativePath(dir),

    // Simplified link creator using base
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },

    /**
     * Build force row
     */
    buildForceRow(force, columns) {
        const forceKey = force['Force Key'] || force['Key'] || force.key;
        const forceName = force['Force Name'] || force.forceName || 'Unnamed Force';
        const userName = force['User Name'] || force['Player Name'] || force.playerName || 'Unknown';
        const faction = force['Faction'] || force.faction || 'Unknown';
        const detachment = force['Detachment'] || force.detachment || '-';
        const timestamp = force['Timestamp'] || force.timestamp;

        const columnData = {
            force: this.createForceLink(forceName, forceKey),
            commander: userName,
            faction: faction,
            detachment: detachment,
            joined: TableBase.formatters.date(timestamp),
            supply: force['Supply Limit'] || force.supplyLimit || '-',
            battles: force['Battle Count'] || force.battleCount || '0',
            points: force['Total Points'] || force.totalPoints || '0'
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    /**
     * Fetch forces configuration
     */
    getFetchConfig(type, key) {
        const forceUrl = CrusadeConfig.getSheetUrl('forces');
        const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');

        const configs = {
            'all': {
                url: forceUrl,
                cacheType: 'forces',
                cacheKey: 'all',
                dataKey: null, // Uses raw array format
                loadingMessage: 'Loading forces...'
            },
            'crusade': {
                url: `${participantsUrl}?action=forces-for-crusade&crusade=${encodeURIComponent(key)}`,
                cacheType: 'crusadeParticipants',
                cacheKey: `crusade_${key}_forces`,
                dataKey: 'forces',
                loadingMessage: 'Loading crusade forces...'
            },
            'user': {
                url: `${forceUrl}?action=user-forces&userKey=${encodeURIComponent(key)}`,
                cacheType: 'forces',
                cacheKey: `user_${key}`,
                dataKey: 'forces',
                loadingMessage: 'Loading user forces...'
            }
        };
        return configs[type] || configs['all'];
    },

    /**
     * Get display configuration
     */
    getDisplayConfig(type) {
        const configs = {
            'all': {
                columns: ['force', 'commander', 'faction', 'detachment', 'joined'],
                headers: ['Force Name', 'Commander', 'Faction', 'Detachment', 'Joined'],
                tableId: 'all-forces-table',
                buildRow: this.buildForceRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No forces registered yet.',
                errorMessage: 'Failed to load forces.'
            },
            'crusade': {
                columns: ['force', 'commander', 'faction', 'joined'],
                headers: ['Force Name', 'Commander', 'Faction', 'Joined'],
                tableId: 'crusade-forces-table',
                buildRow: this.buildForceRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No forces registered for this crusade yet.',
                errorMessage: 'Failed to load crusade forces.'
            },
            'user': {
                columns: ['force', 'faction', 'detachment', 'battles', 'joined'],
                headers: ['Force Name', 'Faction', 'Detachment', 'Battles', 'Created'],
                tableId: 'user-forces-table',
                buildRow: this.buildForceRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No forces created by this user yet.',
                errorMessage: 'Failed to load user forces.'
            }
        };
        return configs[type] || configs['all'];
    },

    /**
     * Generic loader using base utility
     */
    async loadForces(type, key, containerId) {
        const fetchConfig = this.getFetchConfig(type, key);
        const displayConfig = this.getDisplayConfig(type);

        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId);
    },

    // Convenience methods
    async loadAllForces(containerId) {
        return this.loadForces('all', null, containerId);
    },

    async loadForCrusade(crusadeKey, containerId) {
        return this.loadForces('crusade', crusadeKey, containerId);
    },

    async loadForUser(userKey, containerId) {
        return this.loadForces('user', userKey, containerId);
    },

    /**
     * Fetch forces (for external use)
     */
    async fetchForces(action, key) {
        const config = this.getFetchConfig(action, key);
        return await TableBase.fetchWithCache(config.url, config.cacheType, config.cacheKey);
    },

    /**
     * Calculate force statistics
     */
    calculateForceStats(forces) {
        const stats = {
            totalForces: forces.length,
            factionBreakdown: {},
            totalBattles: 0,
            averageBattles: 0
        };

        forces.forEach(force => {
            const faction = force['Faction'] || force.faction || 'Unknown';
            stats.factionBreakdown[faction] = (stats.factionBreakdown[faction] || 0) + 1;

            const battles = parseInt(force['Battle Count'] || force.battleCount || 0);
            stats.totalBattles += battles;
        });

        if (stats.totalForces > 0) {
            stats.averageBattles = Math.round(stats.totalBattles / stats.totalForces);
        }

        return stats;
    }
};

// Maintain backward compatibility
window.ForceDisplay = ForceTable;
window.ForceTable = ForceTable;

// Initialize auto-loading
TableBase.initAutoLoad('all-forces-container', () => ForceTable.loadAllForces('all-forces-container'));

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceTable;
}