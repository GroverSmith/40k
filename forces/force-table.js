// filename: forces/force-table.js
// Force display module using TableBase utility
// 40k Crusade Campaign Tracker

const ForceTable = {

    getDisplayConfig(type) {
        const configs = {
            'all': {
                columns: ['commander', 'force', 'faction', 'detachment', 'joined'],
                headers: ['Commander', 'Force Name', 'Faction', 'Detachment', 'Joined'],
                tableId: 'all-forces-table',
                buildRow: this.buildForceRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No forces registered yet.',
                errorMessage: 'Failed to load forces.',
                responsiveColumns: this.getResponsiveColumns()
            },
            'crusade': {
                columns: ['commander', 'force', 'faction', 'joined'],
                headers: ['Commander', 'Force Name', 'Faction', 'Joined'],
                tableId: 'crusade-forces-table',
                buildRow: this.buildForceRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No forces registered for this crusade yet.',
                errorMessage: 'Failed to load crusade forces.',
                responsiveColumns: this.getResponsiveColumns()
            },
            'user': {
                columns: ['force', 'faction', 'detachment', 'battles', 'joined'],
                headers: ['Force Name', 'Faction', 'Detachment', 'Battles', 'Created'],
                tableId: 'user-forces-table',
                buildRow: this.buildForceRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No forces created by this user yet.',
                errorMessage: 'Failed to load user forces.',
                responsiveColumns: {
                    mobile: {
                        columns: ['force', 'faction', 'battles'],
                        headers: ['Force Name', 'Faction', 'Battles']
                    },
                    tablet: {
                        columns: ['force', 'faction', 'battles'],
                        headers: ['Force Name', 'Faction', 'Battles']
                    }
                    // desktop uses default columns
                }
            }
        };
        return configs[type] || configs['all'];
    },

    // Shared responsive column configuration
    getResponsiveColumns() {
        return {
            mobile: {
                columns: ['commander', 'force', 'faction'],
                headers: ['Commander', 'Force Name', 'Faction']
            },
            tablet: {
                columns: ['commander', 'force', 'faction'],
                headers: ['Commander', 'Force Name', 'Faction']
            }
            // desktop uses default columns
        };
    },
    
    buildForceRow(force, columns) {
        const forceKey = force['force_key'] || force['Force Key'] || force['Key'] || force.key;
        const forceName = force['force_name'] || force['Force Name'] || force.forceName || 'Unnamed Force';
        const userName = force['user_name'] || force['User Name'] || force['Player Name'] || force.playerName || 'Unknown';
        const faction = force['faction'] || force['Faction'] || force.faction || 'Unknown';
        const detachment = force['detachment'] || force['Detachment'] || force.detachment || '-';
        const timestamp = force['timestamp'] || force['Timestamp'] || force.timestamp;

        const columnData = {
            force: this.createForceLink(forceName, forceKey),
            commander: userName,
            faction: faction,
            detachment: detachment,
            joined: TableBase.formatters.date(timestamp),
            supply: force['supply_limit'] || force['Supply Limit'] || force.supplyLimit || '-',
            battles: force['battle_count'] || force['Battle Count'] || force.battleCount || '0',
            points: force['total_points'] || force['Total Points'] || force.totalPoints || '0'
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },
 
    getFetchConfig(type, key) {
        const forceUrl = CrusadeConfig.getSheetUrl('forces');
        const participantsUrl = CrusadeConfig.getSheetUrl('xref_crusade_participants');

        const configs = {
            'all': {
                url: `${forceUrl}?action=list`,
                cacheType: 'forces',
                dataKey: 'data',
                loadingMessage: 'Loading forces...'
            },
            'crusade': {
                url: participantsUrl,
                cacheType: 'participants',
                dataKey: null,
                loadingMessage: 'Loading crusade forces...'
            },
            'user': {
                url: forceUrl,
                cacheType: 'forces',
                cacheKey: 'all',
                dataKey: 'data',
                loadingMessage: 'Loading user forces...',
                filterFunction: (data) => {
                    // Filter forces by user key (column 1)
                    return data.filter(row => row[1] === key);
                }
            }
        };
        return configs[type] || configs['all'];
    },

    
    
    async loadForces(type, key, containerId) {
        const fetchConfig = this.getFetchConfig(type, key);
        const displayConfig = this.getDisplayConfig(type, key);
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId);
    },

    // Convenience methods
    async loadAllForces(containerId) {
        return this.loadForces('all', null, containerId);
    },

    async loadForCrusade(crusadeKey, containerId) {
        const fetchConfig = this.getFetchConfig('crusade', crusadeKey);
        const displayConfig = this.getDisplayConfig('crusade');
        
        // Filter participants to only show forces for this crusade
        const filterFn = (participant) => {
            const participantCrusadeKey = participant['crusade_key'] || participant['Crusade Key'] || '';
            return participantCrusadeKey === crusadeKey;
        };
        
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId, filterFn);
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
     * Load all available forces (for registration dropdown)
     */
    async loadAvailableForces() {
        try {
            // Use CacheManager with automatic URL resolution
            return await CacheManager.fetchSheetData('forces');
            
        } catch (error) {
            console.error('Error loading available forces:', error);
            throw error;
        }
    },

    
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },
    
    calculateForceStats(forces) {
        const stats = {
            totalForces: forces.length,
            factionBreakdown: {},
            totalBattles: 0,
            averageBattles: 0
        };

        forces.forEach(force => {
            const faction = force['faction'] || force['Faction'] || force.faction || 'Unknown';
            stats.factionBreakdown[faction] = (stats.factionBreakdown[faction] || 0) + 1;

            const battles = parseInt(force['battle_count'] || force['Battle Count'] || force.battleCount || 0);
            stats.totalBattles += battles;
        });

        if (stats.totalForces > 0) {
            stats.averageBattles = Math.round(stats.totalBattles / stats.totalForces);
        }

        return stats;
    }
};

window.ForceTable = ForceTable;
