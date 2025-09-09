// filename: units/unit-table.js
// Unit display module using TableBase utility
// 40k Crusade Campaign Tracker

const UnitTable = {

    getDisplayConfig(type, key) {
        const configs = {
            'force': {
                columns: ['name', 'datasheet', 'role', 'points', 'cp', 'xp', 'rank', 'battles', 'kills'],
                headers: ['Name', 'Data Sheet', 'Type', 'Points', 'CP', 'XP', 'Rank', 'Battles', 'Kills'],
                tableId: 'force-units-table',
                buildRow: this.buildDetailedUnitRow.bind(this),
                sortBy: (a, b) => (b.XP || 0) - (a.XP || 0), // Sort by XP descending
                noDataMessage: 'No units registered for this force yet.',
                errorMessage: 'Failed to load units.',
                responsiveColumns: this.getResponsiveColumns()
                // Removed groupBy
            },
            'crusade': {
                columns: ['name', 'force', 'datasheet', 'points', 'xp', 'rank'],
                headers: ['Name', 'Force', 'Data Sheet', 'Points', 'XP', 'Rank'],
                tableId: 'crusade-units-table',
                buildRow: this.buildUnitRow.bind(this),
                context: { showUnitLinks: true },
                sortBy: (a, b) => (b.XP || 0) - (a.XP || 0),
                noDataMessage: 'No units in this crusade yet.',
                errorMessage: 'Failed to load crusade units.',
                responsiveColumns: this.getResponsiveColumns()
            },
            'user': {
                columns: ['name', 'force', 'datasheet', 'points', 'xp', 'rank', 'battles'],
                headers: ['Name', 'Force', 'Type', 'Points', 'XP', 'Rank', 'Battles'],
                tableId: 'user-units-table',
                buildRow: this.buildUnitRow.bind(this),
                context: { showUnitLinks: true },
                sortBy: (a, b) => (b.XP || 0) - (a.XP || 0),
                noDataMessage: 'No units created by this user yet.',
                errorMessage: 'Failed to load user units.',
                responsiveColumns: this.getResponsiveColumns()
            },
            'all': {
                columns: ['name', 'force', 'datasheet', 'points', 'xp', 'rank'],
                headers: ['Name', 'Force', 'Type', 'Points', 'XP', 'Rank'],
                tableId: 'all-units-table',
                buildRow: this.buildUnitRow.bind(this),
                context: { showUnitLinks: true },
                sortBy: (a, b) => (b.XP || 0) - (a.XP || 0),
                noDataMessage: 'No units registered yet.',
                errorMessage: 'Failed to load units.',
                responsiveColumns: this.getResponsiveColumns()
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
            name: `<strong>${unit.unit_name || 'Unnamed'}</strong> ${this.formatBadges(unit)}`,
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


    /**
     * Build detailed unit display (for force details page)
     */
    buildDetailedUnitRow(unit, columns) {
        // Get the base row from buildUnitRow
        const baseRow = this.buildUnitRow(unit, columns);

        // Check if unit has additional details to show
        const hasDetails = unit.description || unit.notable_history ||
                          unit.wargear || unit.enhancements ||
                          unit.battle_traits || unit.battle_scars;

        if (!hasDetails) return baseRow;

        // Add expandable details row
        let detailsHtml = '<tr class="unit-details-row"><td colspan="' + columns.length + '">';
        detailsHtml += '<div class="unit-details">';

        if (unit.wargear) {
            detailsHtml += `<div class="detail-item"><strong>Wargear:</strong> ${unit.wargear}</div>`;
        }
        if (unit.enhancements) {
            detailsHtml += `<div class="detail-item"><strong>Enhancements:</strong> ${unit.enhancements}</div>`;
        }
        if (unit.battle_traits) {
            detailsHtml += `<div class="detail-item"><strong>Battle Traits:</strong> ${unit.battle_traits}</div>`;
        }
        if (unit.battle_scars) {
            detailsHtml += `<div class="detail-item"><strong>Battle Scars:</strong> ${unit.battle_scars}</div>`;
        }
        if (unit.description) {
            detailsHtml += `<div class="detail-item"><strong>Description:</strong> ${unit.description}</div>`;
        }
        if (unit.notable_history) {
            detailsHtml += `<div class="detail-item"><strong>Notable History:</strong> ${unit.notable_history}</div>`;
        }

        detailsHtml += '</div></td></tr>';

        return baseRow + detailsHtml;
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

    async loadForCrusade(crusadeKey, containerId) {
        return this.loadUnits('crusade', crusadeKey, containerId);
    },

    async loadForUser(userKey, containerId) {
        return this.loadUnits('user', userKey, containerId);
    },

    async loadAllUnits(containerId) {
        return this.loadUnits('all', null, containerId);
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
