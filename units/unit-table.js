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

        // Use MFM version-aware points if available in context
        let pointsValue = unit.points || '0';
        if (context.mfmVersion && context.forceKey && unit.force_key === context.forceKey) {
            // If we have MFM context and this unit belongs to the force, use the MFM-aware points
            pointsValue = unit.points || '0'; // This should already be calculated with MFM context
        }

        const columnData = {
            name: this.createUnitLink(unit.unit_name || 'Unnamed', unit.unit_key),
            datasheet: unit.data_sheet || '-',
            role: unit.unit_type || '-',
            points: pointsValue,
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
    async loadForForce(forceKey, containerId, mfmVersion = null) {
        const displayConfig = this.getDisplayConfig('force');
        
        // If we have an MFM version, use MFM-aware units
        if (mfmVersion && typeof UnifiedCache !== 'undefined') {
            try {
                // Create a complex filter function that gets MFM-aware units
                const complexFilterFn = async () => {
                    const unitsWithMFMContext = await UnifiedCache.getUnitsWithMFMVersion(
                        mfmVersion, 
                        { force_key: forceKey }
                    );
                    
                    console.log(`Loading units for force ${forceKey} with MFM version ${mfmVersion}:`, unitsWithMFMContext);
                    return unitsWithMFMContext;
                };
                
                await TableBase.loadAndDisplayWithComplexFilter('units', displayConfig, containerId, complexFilterFn);
                return;
                
            } catch (error) {
                console.warn('Failed to load units with MFM context, falling back to standard load:', error);
            }
        }
        
        // Fallback to standard loading
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

    
    calculateUnitStats(units, mfmVersion = null, forceKey = null) {
        // If we have MFM version context, use MFM-aware points calculation
        let totalPoints = 0;
        if (mfmVersion && forceKey && typeof UnifiedCache !== 'undefined') {
            // This would need to be called asynchronously in practice
            // For now, use the points as they are (should already be MFM-aware if loaded correctly)
            totalPoints = units.reduce((sum, unit) =>
                sum + (parseInt(unit.points) || 0), 0);
        } else {
            totalPoints = units.reduce((sum, unit) =>
                sum + (parseInt(unit.points) || 0), 0);
        }
        
        return {
            totalUnits: units.length,
            totalPoints: totalPoints,
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
