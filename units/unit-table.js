// filename: units/unit-table.js
// Unit display module using TableBase utility
// 40k Crusade Campaign Tracker

const UnitTable = {

    // Simplified link creators using base
    createUnitLink(name, key) {
        return TableBase.createEntityLink('unit', name || 'Unnamed Unit', key);
    },
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },

    /**
     * Calculate rank from XP
     */
    calculateRank(xp) {
        const xpValue = parseInt(xp) || 0;
        if (xpValue >= 51) return 'Legendary';
        if (xpValue >= 31) return 'Heroic';
        if (xpValue >= 16) return 'Veteran';
        if (xpValue >= 6) return 'Blooded';
        return 'Battle-ready';
    },

    /**
     * Format unit badges
     */
    formatBadges(unit) {
        let badges = '';
        if (unit['Battle Traits'] || unit['Battle Honours']) badges += '<span class="badge trait">T</span>';
        if (unit['Battle Scars']) badges += '<span class="badge scar">S</span>';
        if (unit['Relics'] || unit['Equipment']) badges += '<span class="badge relic">R</span>';
        return badges;
    },

    /**
     * Build unit row
     */
    buildUnitRow(unit, columns, context = {}) {
        const rank = unit.rank || unit.Rank || this.calculateRank(unit.xp || unit.XP || unit['Experience Points']);
        const rankClass = `rank-${rank.toLowerCase().replace(/[^a-z]/g, '')}`;

        const columnData = {
            name: `<strong>${unit.unit_name || unit.Name || unit['Unit Name'] || 'Unnamed'}</strong> ${this.formatBadges(unit)}`,
            datasheet: unit.data_sheet || unit['Data Sheet'] || unit['Unit Type'] || '-',
            role: unit.unit_type || unit['Battlefield Role'] || unit.Role || '-',
            points: unit.points || unit.Points || unit['Points Cost'] || '0',
            power: unit['Power Level'] || unit.PL || '-',
            cp: unit.crusade_points || unit['Crusade Points'] || unit.CP || '0',
            xp: unit.xp || unit.XP || unit['Experience Points'] || '0',
            rank: `<span class="rank-badge ${rankClass}">${rank}</span>`,
            battles: unit.battle_count || unit['Battle Count'] || unit.Battles || '0',
            kills: unit.kill_count || unit['Kill Count'] || unit.Kills || '0',
            deaths: unit.times_killed || unit['Times Killed'] || unit.Deaths || '0',
            force: unit['Force Name'] ? this.createForceLink(unit['Force Name'], unit['Force Key']) : '-'
        };

        // Add unit link if displaying across forces
        if (context.showUnitLinks && (unit.unit_key || unit.Key)) {
            columnData.name = this.createUnitLink(columnData.name, unit.unit_key || unit.Key);
        }

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    /**
     * Build detailed unit display (for force details page)
     */
    buildDetailedUnitRow(unit, columns) {
        const baseRow = this.buildUnitRow(unit, columns);

        // Check if unit has additional details to show
        const hasDetails = unit.description || unit.Description || unit['Notable History'] ||
                          unit.wargear || unit.Wargear || unit.enhancements || unit.Enhancements ||
                          unit.battle_traits || unit['Battle Traits'] || unit.battle_scars || unit['Battle Scars'];

        if (!hasDetails) return baseRow;

        // Add expandable details row
        let detailsHtml = '<tr class="unit-details-row"><td colspan="' + columns.length + '">';
        detailsHtml += '<div class="unit-details">';

        if (unit.wargear || unit.Wargear) {
            detailsHtml += `<div class="detail-item"><strong>Wargear:</strong> ${unit.wargear || unit.Wargear}</div>`;
        }
        if (unit.enhancements || unit.Enhancements) {
            detailsHtml += `<div class="detail-item"><strong>Enhancements:</strong> ${unit.enhancements || unit.Enhancements}</div>`;
        }
        if (unit.battle_traits || unit['Battle Traits'] || unit['Battle Honours']) {
            const traits = unit.battle_traits || unit['Battle Traits'] || unit['Battle Honours'];
            detailsHtml += `<div class="detail-item"><strong>Battle Traits:</strong> ${traits}</div>`;
        }
        if (unit.battle_scars || unit['Battle Scars']) {
            detailsHtml += `<div class="detail-item"><strong>Battle Scars:</strong> ${unit.battle_scars || unit['Battle Scars']}</div>`;
        }
        if (unit.description || unit.Description) {
            detailsHtml += `<div class="detail-item"><strong>Description:</strong> ${unit.description || unit.Description}</div>`;
        }
        if (unit['Notable History']) {
            detailsHtml += `<div class="detail-item"><strong>Notable History:</strong> ${unit['Notable History']}</div>`;
        }

        detailsHtml += '</div></td></tr>';

        return baseRow + detailsHtml;
    },

    /**
     * Fetch units configuration
     */
    getFetchConfig(type, key) {
        const unitsUrl = CrusadeConfig.getSheetUrl('units');
        console.log('Units URL from config:', unitsUrl); // Debug log

        if (!unitsUrl) {
            console.error('Units URL not configured in CrusadeConfig');
            return null;
        }

        const configs = {
            'force': {
                url: `${unitsUrl}?action=list`,
                cacheType: 'units',
                dataKey: 'data',
                loadingMessage: 'Loading units...'
            },
            'crusade': {
                url: `${unitsUrl}?action=list`,
                cacheType: 'units',
                dataKey: 'data',
                loadingMessage: 'Loading crusade units...'
            },
            'user': {
                url: `${unitsUrl}?action=list`,
                cacheType: 'units',
                dataKey: 'data',
                loadingMessage: 'Loading user units...'
            },
            'all': {
                url: `${unitsUrl}?action=list`,
                cacheType: 'units',
                dataKey: 'data',
                loadingMessage: 'Loading all units...'
            }
        };
        return configs[type] || configs['force'];
    },

    /**
     * Get display configuration
     */
    getDisplayConfig(type, key) {
        const configs = {
            'force': {
                columns: ['name', 'datasheet', 'role', 'points', 'cp', 'xp', 'rank', 'battles', 'kills'],
                headers: ['Name', 'Data Sheet', 'Role', 'Points', 'CP', 'XP', 'Rank', 'Battles', 'Kills'],
                tableId: 'force-units-table',
                buildRow: this.buildDetailedUnitRow.bind(this),
                sortBy: (a, b) => (b.XP || 0) - (a.XP || 0), // Sort by XP descending
                noDataMessage: 'No units registered for this force yet.',
                errorMessage: 'Failed to load units.'
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
                errorMessage: 'Failed to load crusade units.'
            },
            'user': {
                columns: ['name', 'force', 'datasheet', 'points', 'xp', 'rank', 'battles'],
                headers: ['Name', 'Force', 'Type', 'Points', 'XP', 'Rank', 'Battles'],
                tableId: 'user-units-table',
                buildRow: this.buildUnitRow.bind(this),
                context: { showUnitLinks: true },
                sortBy: (a, b) => (b.XP || 0) - (a.XP || 0),
                noDataMessage: 'No units created by this user yet.',
                errorMessage: 'Failed to load user units.'
            },
            'all': {
                columns: ['name', 'force', 'datasheet', 'points', 'xp', 'rank'],
                headers: ['Name', 'Force', 'Type', 'Points', 'XP', 'Rank'],
                tableId: 'all-units-table',
                buildRow: this.buildUnitRow.bind(this),
                context: { showUnitLinks: true },
                sortBy: (a, b) => (b.XP || 0) - (a.XP || 0),
                noDataMessage: 'No units registered yet.',
                errorMessage: 'Failed to load units.'
            }
        };
        return configs[type] || configs['force'];
    },

    /**
     * Custom display for grouped units (by role)
     */
    async displayGroupedUnits(units, container, config) {
        if (!units?.length) {
            UIHelpers.showNoData(container, config.noDataMessage);
            return;
        }

        // Group units by battlefield role
        const unitsByRole = {};
        units.forEach(unit => {
            const role = unit.unit_type || unit['Battlefield Role'] || unit.Role || 'Other';
            if (!unitsByRole[role]) unitsByRole[role] = [];
            unitsByRole[role].push(unit);
        });

        // Build grouped display
        let html = '<div class="units-container">';

        const roleOrder = ['HQ', 'Troops', 'Elites', 'Fast Attack', 'Heavy Support', 'Flyer', 'Dedicated Transport', 'Other'];
        roleOrder.forEach(role => {
            if (!unitsByRole[role]) return;

            const roleUnits = unitsByRole[role];
            html += `
                <div class="unit-role-group">
                    <h4 class="unit-role-header">${role} (${roleUnits.length})</h4>
                    <table class="data-table units-table">
                        <thead>
                            <tr>${config.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${roleUnits.map(unit =>
                                config.buildRow(unit, config.columns, config.context || {})
                            ).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });

        // Add summary statistics
        const stats = this.calculateUnitStats(units);
        html += `
            <div class="units-summary">
                <strong>Force Summary:</strong>
                ${stats.totalUnits} units |
                ${stats.totalPoints} points |
                ${stats.totalCP} Crusade Points |
                ${stats.totalKills} total kills
            </div>
        `;

        html += '</div>';
        container.innerHTML = html;
    },

    /**
     * Generic loader using base utility
     */
    async loadUnits(type, key, containerId) {
        const fetchConfig = this.getFetchConfig(type, key);

        if (!fetchConfig) {
            console.error('Failed to get fetch configuration for units');
            const container = typeof containerId === 'string' ?
                document.getElementById(containerId) : containerId;
            if (container) {
                UIHelpers.showError(container, 'Units configuration error');
            }
            return;
        }

        const displayConfig = this.getDisplayConfig(type, key);

        // Use standard table display for all types
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId);
    },

    // Convenience methods
    async loadForForce(forceKey, containerId) {
        const fetchConfig = this.getFetchConfig('force', forceKey);
        const displayConfig = this.getDisplayConfig('force');
        
        // Filter units to only show those for this force
        const filterFn = (unit) => {
            const unitForceKey = unit.force_key || unit['force_key'] || unit['Force Key'] || '';
            return unitForceKey === forceKey;
        };
        
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId, filterFn);
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

    /**
     * Calculate unit statistics
     */
    calculateUnitStats(units) {
        return {
            totalUnits: units.length,
            totalPoints: units.reduce((sum, unit) =>
                sum + (parseInt(unit.points || unit.Points || unit['Points Cost']) || 0), 0),
            totalCP: units.reduce((sum, unit) =>
                sum + (parseInt(unit.crusade_points || unit['Crusade Points'] || unit.CP) || 0), 0),
            totalKills: units.reduce((sum, unit) =>
                sum + (parseInt(unit.kill_count || unit['Kill Count'] || unit.Kills) || 0), 0),
            totalXP: units.reduce((sum, unit) =>
                sum + (parseInt(unit.xp || unit.XP || unit['Experience Points']) || 0), 0)
        };
    }
};

// Make globally available
window.UnitTable = UnitTable;
