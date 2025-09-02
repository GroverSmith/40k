// filename: armies/army-table.js
// Army List display module using TableBase utility
// 40k Crusade Campaign Tracker

const ArmyTable = {
    // Use base utility for common methods
    getRelativePath: (dir) => TableBase.getRelativePath(dir),

    // Simplified link creators using base
    createArmyLink(name, key) {
        return TableBase.createEntityLink('army', name || 'Unnamed Army List', key);
    },
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },

    /**
     * Format points value
     */
    formatPoints(points) {
        if (!points) return '-';
        const value = parseInt(points);
        if (isNaN(value)) return points;
        return value.toLocaleString() + ' pts';
    },

    /**
     * Build army list row
     */
    buildArmyRow(army, columns, context = {}) {
        const armyKey = army.Key || army.key || army.id;
        const armyName = army['Army Name'] || 'Unnamed List';
        const forceName = army['Force Name'] || army.forceName || '';
        const forceKey = army['Force Key'] || army.forceKey || '';
        const faction = army.Faction || army.faction || 'Unknown';
        const detachment = army.Detachment || army.detachment || '-';
        const points = army['Points Value'] || army.pointsValue || '';
        const mfmVersion = army['MFM Version'] || army.mfmVersion || '-';
        const userName = army['User Name'] || army.userName || 'Unknown';
        const timestamp = army.Timestamp || army.timestamp;
        const notes = army.Notes || army.notes || '';

        const columnData = {
            army: this.createArmyLink(armyName, armyKey),
            force: forceName ? this.createForceLink(forceName, forceKey) : '-',
            player: userName,
            faction: faction,
            detachment: detachment,
            points: this.formatPoints(points),
            mfm: mfmVersion,
            date: TableBase.formatters.date(timestamp),
            notes: notes ? `<span title="${notes.replace(/"/g, '&quot;')}" style="cursor: help;">📝</span>` : ''
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    /**
     * Fetch army lists configuration
     */
    getFetchConfig(type, key) {
        const armyUrl = CrusadeConfig.getSheetUrl('armyLists');

        const configs = {
            'force': {
                url: `${armyUrl}?action=force-lists&forceKey=${encodeURIComponent(key)}`,
                cacheType: 'armyLists',
                cacheKey: `force_${key}`,
                dataKey: 'data',
                loadingMessage: 'Loading army lists...'
            },
            'crusade': {
                url: `${armyUrl}?action=crusade-lists&crusadeKey=${encodeURIComponent(key)}`,
                cacheType: 'armyLists',
                cacheKey: `crusade_${key}`,
                dataKey: 'data',
                loadingMessage: 'Loading crusade army lists...'
            },
            'user': {
                url: `${armyUrl}?action=user-lists&userKey=${encodeURIComponent(key)}`,
                cacheType: 'armyLists',
                cacheKey: `user_${key}`,
                dataKey: 'data',
                loadingMessage: 'Loading user army lists...'
            },
            'recent': {
                url: `${armyUrl}?action=recent&limit=20`,
                cacheType: 'armyLists',
                cacheKey: 'recent',
                dataKey: 'data',
                loadingMessage: 'Loading recent army lists...'
            },
            'all': {
                url: armyUrl,
                cacheType: 'armyLists',
                cacheKey: 'all',
                dataKey: null, // Raw array format
                loadingMessage: 'Loading all army lists...'
            }
        };

        return configs[type] || configs['all'];
    },

    /**
     * Get display configuration
     */
    getDisplayConfig(type, key) {
        const configs = {
            'force': {
                // Matching the columns from the old ForceUI.displayArmyLists implementation
                columns: ['army', 'detachment', 'mfm', 'points', 'date'],
                headers: ['Army Name', 'Detachment', 'MFM Version', 'Points', 'Date Added'],
                tableId: 'army-lists-table',
                buildRow: this.buildArmyRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No army lists uploaded for this force yet.',
                errorMessage: 'Failed to load army lists.'
            },
            'crusade': {
                columns: ['army', 'force', 'player', 'points', 'date'],
                headers: ['Army List', 'Force', 'Player', 'Points', 'Date'],
                tableId: 'crusade-armies-table',
                buildRow: this.buildArmyRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No army lists in this crusade yet.',
                errorMessage: 'Failed to load crusade army lists.'
            },
            'user': {
                columns: ['army', 'force', 'faction', 'points', 'date'],
                headers: ['Army List', 'Force', 'Faction', 'Points', 'Date'],
                tableId: 'user-armies-table',
                buildRow: this.buildArmyRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No army lists created by this user yet.',
                errorMessage: 'Failed to load user army lists.'
            },
            'recent': {
                columns: ['army', 'force', 'player', 'faction', 'points', 'date'],
                headers: ['Army List', 'Force', 'Player', 'Faction', 'Points', 'Date'],
                tableId: 'recent-armies-table',
                buildRow: this.buildArmyRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                limit: 20,
                noDataMessage: 'No army lists uploaded yet.',
                errorMessage: 'Failed to load recent army lists.'
            },
            'all': {
                columns: ['army', 'force', 'player', 'faction', 'points', 'date'],
                headers: ['Army List', 'Force', 'Player', 'Faction', 'Points', 'Date'],
                tableId: 'all-armies-table',
                buildRow: this.buildArmyRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No army lists in the system yet.',
                errorMessage: 'Failed to load army lists.'
            }
        };

        return configs[type] || configs['all'];
    },

    /**
     * Generic loader using base utility - using standard table display for all contexts
     */
    async loadArmyLists(type, key, containerId) {
        const fetchConfig = this.getFetchConfig(type, key);
        const displayConfig = this.getDisplayConfig(type, key);

        // Use standard table display for all contexts (including force)
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId);
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        return this.loadArmyLists('force', forceKey, containerId);
    },

    async loadForCrusade(crusadeKey, containerId) {
        return this.loadArmyLists('crusade', crusadeKey, containerId);
    },

    async loadForUser(userKey, containerId) {
        return this.loadArmyLists('user', userKey, containerId);
    },

    async loadRecentArmyLists(containerId) {
        return this.loadArmyLists('recent', null, containerId);
    },

    async loadAllArmyLists(containerId) {
        return this.loadArmyLists('all', null, containerId);
    },

    /**
     * Fetch army lists (for external use)
     */
    async fetchArmyLists(action, key) {
        const config = this.getFetchConfig(action, key);
        return await TableBase.fetchWithCache(config.url, config.cacheType, config.cacheKey);
    },

    /**
     * Calculate army list statistics
     */
    calculateArmyStats(armyLists) {
        const stats = {
            totalLists: armyLists.length,
            totalPoints: 0,
            averagePoints: 0,
            factionBreakdown: {},
            detachmentBreakdown: {}
        };

        armyLists.forEach(army => {
            const points = parseInt(army['Points Value'] || army.pointsValue || 0);
            stats.totalPoints += points;

            const faction = army.Faction || army.faction || 'Unknown';
            stats.factionBreakdown[faction] = (stats.factionBreakdown[faction] || 0) + 1;

            const detachment = army.Detachment || army.detachment || 'None';
            stats.detachmentBreakdown[detachment] = (stats.detachmentBreakdown[detachment] || 0) + 1;
        });

        if (stats.totalLists > 0) {
            stats.averagePoints = Math.round(stats.totalPoints / stats.totalLists);
        }

        return stats;
    }
};

// Initialize auto-loading for pages with recent army lists
TableBase.initAutoLoad('recent-armies-container', () => ArmyTable.loadRecentArmyLists('recent-armies-container'));

// Make globally available
window.ArmyTable = ArmyTable;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArmyTable;
}