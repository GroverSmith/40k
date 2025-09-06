// filename: armies/army-table.js
// Army List display module using TableBase utility
// 40k Crusade Campaign Tracker

const ArmyTable = {

    getDisplayConfig(type, key) {
        const configs = {
            'force': {
                columns: ['army', 'detachment', 'mfm', 'points', 'date'],
                headers: ['Army Name', 'Detachment', 'MFM Version', 'Points', 'Date Added'],
                tableId: 'army-lists-table',
                buildRow: this.buildArmyRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No army lists uploaded for this force yet.',
                errorMessage: 'Failed to load army lists.'
            },
            'user': {
                columns: ['army', 'force', 'faction', 'points', 'date'],
                headers: ['Army Name', 'Force', 'Faction', 'Points', 'Date Added'],
                tableId: 'user-armies-table',
                buildRow: this.buildArmyRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No army lists created by this user yet.',
                errorMessage: 'Failed to load user army lists.'
            }
        };

        return configs[type] || configs['all'];
    },    

    buildArmyRow(army, columns, context = {}) {
        const armyKey = army.army_key || army.Key || army.key || army.id;
        const armyName = army.army_name || army['Army Name'] || 'Unnamed List';
        const forceName = army.force_name || army['Force Name'] || army.forceName || '';
        const forceKey = army.force_key || army['Force Key'] || army.forceKey || '';
        const faction = army.faction || army.Faction || army.faction || 'Unknown';
        const detachment = army.detachment || army.Detachment || army.detachment || '-';
        const points = army.points_value || army['Points Value'] || army.pointsValue || '';
        const mfmVersion = army.mfm_version || army['MFM Version'] || army.mfmVersion || '-';
        const userName = army.user_name || army['User Name'] || army.userName || 'Unknown';
        const timestamp = army.timestamp || army.Timestamp || army.timestamp;
        const notes = army.notes || army.Notes || army.notes || '';

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

    
    getFetchConfig(type, key) {
        const armyUrl = CrusadeConfig.getSheetUrl('armies');

        const configs = {
            'force': {
                url: `${armyUrl}?action=list`,
                cacheType: 'armies',
                cacheKey: 'all',
                dataKey: 'data',
                loadingMessage: 'Loading army lists...'
            },            
            'user': {
                url: `${armyUrl}?action=user-lists&userKey=${encodeURIComponent(key)}`,
                cacheType: 'armies',
                cacheKey: `user_${key}`,
                dataKey: 'data',
                loadingMessage: 'Loading user army lists...'
            }            
        };

        return configs[type] || configs['all'];
    },

   
    async loadArmyLists(type, key, containerId) {
        const fetchConfig = this.getFetchConfig(type, key);
        const displayConfig = this.getDisplayConfig(type, key);
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId);
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        const fetchConfig = this.getFetchConfig('force', forceKey);
        const displayConfig = this.getDisplayConfig('force');
        
        // Create a filter function to only show armies for this specific force
        const filterFn = (army) => {
            if (!army) return false;
            const armyForceKey = army.force_key || '';
            return armyForceKey === forceKey;
        };
        
        // Use the standard loadAndDisplay method with filtering
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId, filterFn);
    },

    
    async loadForUser(userKey, containerId) {
        return this.loadArmyLists('user', userKey, containerId);
    },
   


    /**
     * Fetch army lists (for external use)
     */
    async fetchArmyLists(action, key) {
        const config = this.getFetchConfig(action, key);
        return await TableBase.fetchWithCache(config.url, config.cacheType, config.cacheKey);
    },

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

// Make globally available
window.ArmyTable = ArmyTable;
