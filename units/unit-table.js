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
            points: `<span class="unit-points" data-unit-key="${unit.unit_key}" data-original-points="${unit.points || '0'}">${unit.points || '0'}</span>`,
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
        console.log(`Unit table - loadForForce called with forceKey: ${forceKey}, mfmVersion: ${mfmVersion}`);
        const displayConfig = this.getDisplayConfig('force');
        
        // Always load the table normally first
        const filterFn = (unit) => {
            const unitForceKey = unit.force_key || '';
            return unitForceKey === forceKey;
        };
        
        await TableBase.loadAndDisplay('units', displayConfig, containerId, filterFn);
        
        // Then update points with MFM version if available
        if (mfmVersion && typeof UnifiedCache !== 'undefined') {
            console.log(`Unit table - Updating points with MFM version: ${mfmVersion}`);
            await this.updatePointsWithMFMVersion(forceKey, mfmVersion);
        }
    },

    /**
     * Update unit points in the table with MFM version-aware values
     */
    async updatePointsWithMFMVersion(forceKey, mfmVersion) {
        try {
            const mfmVersionStr = String(mfmVersion);
            const unitsWithMFMContext = await UnifiedCache.getUnitsWithMFMVersion(
                mfmVersionStr, 
                { force_key: forceKey }
            );
            
            console.log(`Unit table - Updating points for ${unitsWithMFMContext.length} units with MFM version ${mfmVersionStr}`);
            
            // Update each unit's points in the table
            unitsWithMFMContext.forEach(unit => {
                const pointsElement = document.querySelector(`.unit-points[data-unit-key="${unit.unit_key}"]`);
                if (pointsElement) {
                    const originalPoints = pointsElement.getAttribute('data-original-points');
                    const newPoints = unit.points || '0';
                    
                    if (originalPoints !== newPoints) {
                        console.log(`Unit table - Updating ${unit.unit_name} points from ${originalPoints} to ${newPoints}`);
                        pointsElement.textContent = newPoints;
                        pointsElement.setAttribute('data-original-points', newPoints);
                        
                        // Add visual indicator that points were updated
                        pointsElement.style.color = '#4CAF50';
                        pointsElement.style.fontWeight = 'bold';
                    }
                } else {
                    console.warn(`Unit table - Could not find points element for unit ${unit.unit_name} (${unit.unit_key})`);
                }
            });
            
        } catch (error) {
            console.error('Unit table - Error updating points with MFM version:', error);
        }
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
