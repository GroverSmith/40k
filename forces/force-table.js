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
        const forceKey = force.force_key;
        const forceName = force.force_name || 'Unnamed Force';
        const userName = force.user_name || 'Unknown';
        const faction = force.faction || 'Unknown';
        const detachment = force.detachment || '-';
        const timestamp = force.timestamp;

        const columnData = {
            force: this.createForceLink(forceName, forceKey),
            commander: userName,
            faction: faction,
            detachment: detachment,
            joined: TableBase.formatters.date(timestamp),
            supply: force.supply_limit || '-',
            battles: force.battle_count || '0',
            points: force.total_points || '0'
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },    
    
    async loadForces(type, key, containerId) {
        const displayConfig = this.getDisplayConfig(type, key);
        
        if (type === 'crusade' && key) {
            // Use complex filter for crusade forces (needs to join with participants)
            const complexFilterFn = async () => {
                const forces = await UnifiedCache.getAllRows('forces');
                const participants = await UnifiedCache.getAllRows('xref_crusade_participants');
                return participants
                    .filter(p => p.crusade_key === key)
                    .map(p => forces.find(f => f.force_key === p.force_key))
                    .filter(f => f); // Remove undefined entries
            };
            await TableBase.loadAndDisplayWithComplexFilter('forces', displayConfig, containerId, complexFilterFn);
        } else {
            // Use simple filter for user and all forces
            const filterFn = type === 'user' && key ? 
                (force => force.user_key === key) : null;
            await TableBase.loadAndDisplay('forces', displayConfig, containerId, filterFn);
        }
    },

    // Convenience methods
    async loadAllForces(containerId) {
        return this.loadForces('all', null, containerId);
    },

    async loadForCrusade(crusadeKey, containerId) {
        return await this.loadForces('crusade', crusadeKey, containerId);
    },

    async loadForUser(userKey, containerId) {
        return this.loadForces('user', userKey, containerId);
    },

    /**
     * Fetch forces (for external use)
     */
    async fetchForces(action, key) {
        const forces = await UnifiedCache.getAllRows('forces');
        
        // Apply filtering based on action and key
        if (action === 'user' && key) {
            return forces.filter(force => force.user_key === key);
        } else if (action === 'crusade' && key) {
            // For crusade forces, we need to get participants and then get the forces
            const participants = await UnifiedCache.getAllRows('xref_crusade_participants');
            return participants
                .filter(p => p.crusade_key === key)
                .map(p => forces.find(f => f.force_key === p.force_key))
                .filter(f => f); // Remove undefined entries
        }
        
        return forces;
    },

    /**
     * Load all available forces (for registration dropdown)
     */
    async loadAvailableForces() {
        try {
            // Use UnifiedCache to get all forces
            return await UnifiedCache.getAllRows('forces');
            
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
