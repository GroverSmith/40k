// filename: units/unit-table.js
// Unit display module using TableBase utility
// 40k Crusade Campaign Tracker

const UnitTable = {

    getDisplayConfig(type, key) {
        const configs = {
            'force': {
                columns: ['name', 'datasheet', 'role', 'points', 'cp', 'xp', 'rank'],
                headers: ['Name', 'Data Sheet', 'Type', 'Points', 'CP', 'XP', 'Rank'],
                tableId: 'force-units-table',
                buildRow: this.buildUnitRow.bind(this),
                sortBy: (a, b) => (b.XP || 0) - (a.XP || 0), // Sort by XP descending
                noDataMessage: 'No units registered for this force yet.',
                errorMessage: 'Failed to load units.',
                responsiveColumns: this.getResponsiveColumns()
                // Removed groupBy
            }
        };
        return configs[type] || configs['force'];
    },

    // Shared responsive column configuration
    getResponsiveColumns() {
        return {
            mobile: {
                columns: ['name', 'datasheet', 'points', 'cp'],
                headers: ['Name', 'Data Sheet', 'Points', 'CP']
            },
            tablet: {
                columns: ['name', 'datasheet', 'points', 'cp', 'xp'],
                headers: ['Name', 'Data Sheet', 'Points', 'CP', 'XP']
            }
            // desktop uses default columns
        };
    },

    
    buildUnitRow(unit, columns, context = {}) {
        const rank = unit.rank || this.calculateRank(unit.xp);
        const rankClass = `rank-${rank.toLowerCase().replace(/[^a-z]/g, '')}`;

        const columnData = {
            name: this.createUnitLink(unit.unit_name || 'Unnamed', unit.unit_key),
            datasheet: unit.data_sheet || '-',
            role: unit.unit_type || '-',
            points: unit.points || '0',
            power: unit.power_level || '-',
            cp: unit.crusade_points || '0',
            xp: unit.xp || '0',
            rank: `<span class="rank-badge ${rankClass}">${rank}</span>`,
            battles: unit.battle_count || '0',
            kills: unit.kill_count || '0',
            deaths: unit.times_killed || '0',
            force: unit.force_name ? this.createForceLink(unit.force_name, unit.force_key) : '-'
        };

        // Add unit link if displaying across forces
        if (context.showUnitLinks && unit.unit_key) {
            columnData.name = this.createUnitLink(columnData.name, unit.unit_key);
        }

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    
    
    async loadUnits(type, key, containerId) {
        const displayConfig = this.getDisplayConfig(type, key);
        await TableBase.loadAndDisplay('units', displayConfig, containerId);
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        const displayConfig = this.getDisplayConfig('force');
        
        // Filter units to only show those for this force
        const filterFn = (unit) => {
            const unitForceKey = unit.force_key || '';
            return unitForceKey === forceKey;
        };
        
        await TableBase.loadAndDisplay('units', displayConfig, containerId, filterFn);
    },

    // Simplified link creators using base
    createUnitLink(name, key) {
        return TableBase.createEntityLink('unit', name || 'Unnamed Unit', key);
    },
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },
    
    calculateRank(xp) {
        const xpValue = parseInt(xp) || 0;
        if (xpValue >= 51) return 'Legendary';
        if (xpValue >= 31) return 'Heroic';
        if (xpValue >= 16) return 'Veteran';
        if (xpValue >= 6) return 'Blooded';
        return 'Battle-ready';
    },

    
    formatBadges(unit) {
        let badges = '';
        if (unit.battle_traits) badges += '<span class="badge trait">T</span>';
        if (unit.battle_scars) badges += '<span class="badge scar">S</span>';
        if (unit.relics) badges += '<span class="badge relic">R</span>';
        return badges;
    },

    
    calculateUnitStats(units) {
        return {
            totalUnits: units.length,
            totalPoints: units.reduce((sum, unit) =>
                sum + (parseInt(unit.points) || 0), 0),
            totalCP: units.reduce((sum, unit) =>
                sum + (parseInt(unit.crusade_points) || 0), 0),
            totalKills: units.reduce((sum, unit) =>
                sum + (parseInt(unit.kill_count) || 0), 0),
            totalXP: units.reduce((sum, unit) =>
                sum + (parseInt(unit.xp) || 0), 0)
        };
    }
};

// Make globally available
window.UnitTable = UnitTable;
