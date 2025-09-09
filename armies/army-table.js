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
                errorMessage: 'Failed to load army lists.',
                responsiveColumns: this.getResponsiveColumns()
            },
            'user': {
                columns: ['army', 'force', 'faction', 'points', 'date'],
                headers: ['Army Name', 'Force', 'Faction', 'Points', 'Date Added'],
                tableId: 'user-armies-table',
                buildRow: this.buildArmyRow.bind(this),
                sortBy: TableBase.sortByDateDesc('Timestamp'),
                noDataMessage: 'No army lists created by this user yet.',
                errorMessage: 'Failed to load user army lists.',
                responsiveColumns: this.getResponsiveColumns()
            }
        };

        return configs[type] || configs['all'];
    }, 
    
    // Shared responsive column configuration
    getResponsiveColumns() {
        return {
            mobile: {
                columns: ['army', 'points'],
                headers: ['Army Name', 'Points']
            },
            tablet: {
                columns: ['army', 'detachment', 'points'],
                headers: ['Army Name', 'Detachment', 'Points']
            }
            // desktop uses default columns
        };
    },

    buildArmyRow(army, columns, context = {}) {
        const armyKey = army.army_key;
        const armyName = army.army_name || 'Unnamed List';
        const forceName = army.force_name || '';
        const forceKey = army.force_key || '';
        const faction = army.faction || 'Unknown';
        const detachment = army.detachment || '-';
        const points = army.points_value || '';
        const mfmVersion = army.mfm_version || '-';
        const userName = army.user_name || 'Unknown';
        const timestamp = army.timestamp;
        const notes = army.notes || '';

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
       
    async loadArmyLists(type, key, containerId) {
        const displayConfig = this.getDisplayConfig(type, key);
        
        // Create filter function based on type and key
        const filterFn = (type === 'force' && key) ? 
            (army => army.force_key === key) :
            (type === 'user' && key) ? 
            (army => army.user_key === key) : null;
            
        await TableBase.loadAndDisplay('armies', displayConfig, containerId, filterFn);
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        return await this.loadArmyLists('force', forceKey, containerId);
    },

    
    async loadForUser(userKey, containerId) {
        return this.loadArmyLists('user', userKey, containerId);
    },
   

    /**
     * Fetch army lists (for external use)
     */
    async fetchArmyLists(action, key) {
        const armies = await UnifiedCache.getAllRows('armies');
        
        // Apply filtering based on action and key
        if (action === 'force' && key) {
            return armies.filter(army => army.force_key === key);
        } else if (action === 'user' && key) {
            return armies.filter(army => army.user_key === key);
        }
        
        return armies;
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
