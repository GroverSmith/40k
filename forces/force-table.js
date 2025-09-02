// filename: forces/force-table.js
// Unified force display module with integrated data fetching
// 40k Crusade Campaign Tracker

const ForceTable = {
    /**
     * Resolve relative path based on current location
     */
    getRelativePath(targetDir) {
        const currentPath = window.location.pathname;
        const pathMap = {
            'forces': { forces: '', battles: '../battles/', crusades: '../crusades/', stories: '../stories/' },
            'battles': { forces: '../forces/', battles: '', crusades: '../crusades/', stories: '../stories/' },
            'crusades': { forces: '../forces/', battles: '../battles/', crusades: '', stories: '../stories/' },
            'stories': { forces: '../forces/', battles: '../battles/', crusades: '../crusades/', stories: '' },
            'default': { forces: 'forces/', battles: 'battles/', crusades: 'crusades/', stories: 'stories/' }
        };

        let currentDir = 'default';
        if (currentPath.includes('/forces/')) currentDir = 'forces';
        else if (currentPath.includes('/battles/')) currentDir = 'battles';
        else if (currentPath.includes('/crusades/')) currentDir = 'crusades';
        else if (currentPath.includes('/stories/')) currentDir = 'stories';

        return pathMap[currentDir][targetDir];
    },

    /**
     * Create hyperlinks for various entities
     */
    createLink(type, name, key) {
        if (!key) return name || `Unknown ${type}`;
        const path = this.getRelativePath('forces');
        return `<a href="${path}force-details.html?key=${encodeURIComponent(key)}">${name}</a>`;
    },

    createForceLink(name, key) { return this.createLink('force', name || 'Unknown Force', key); },

    /**
     * Build a force row with specified columns
     */
    buildForceRow(force, columns) {
        const forceKey = force['Force Key'] || force['Key'] || force.key;
        const forceName = force['Force Name'] || force.forceName || 'Unnamed Force';
        const userName = force['User Name'] || force['Player Name'] || force.playerName || 'Unknown';
        const faction = force['Faction'] || force.faction || 'Unknown';
        const detachment = force['Detachment'] || force.detachment || '-';
        const timestamp = force['Timestamp'] || force.timestamp;
        const joinDate = timestamp ? UIHelpers.formatDate(timestamp) : '-';

        // Build column data map
        const columnData = {
            force: this.createForceLink(forceName, forceKey),
            commander: userName,
            faction: faction,
            detachment: detachment,
            joined: joinDate,
            // Add more columns as needed for different contexts
            supply: force['Supply Limit'] || force.supplyLimit || '-',
            battles: force['Battle Count'] || force.battleCount || '0',
            points: force['Total Points'] || force.totalPoints || '0'
        };

        const cells = columns.map(col => `<td>${columnData[col] || '-'}</td>`).join('');
        return `<tr>${cells}</tr>`;
    },

    /**
     * Fetch forces with caching
     */
    async fetchForces(action, key) {
        const forceUrl = CrusadeConfig.getSheetUrl('forces');
        const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');

        const configs = {
            'all': {
                url: forceUrl,
                cacheKey: 'all',
                cacheType: 'forces'
            },
            'crusade': {
                url: `${participantsUrl}?action=forces-for-crusade&crusade=${encodeURIComponent(key)}`,
                cacheKey: `crusade_${key}_forces`,
                cacheType: 'crusadeParticipants'
            },
            'user': {
                url: `${forceUrl}?action=user-forces&userKey=${encodeURIComponent(key)}`,
                cacheKey: `user_${key}`,
                cacheType: 'forces'
            }
        };

        const config = configs[action] || configs['all'];

        if (!config.url) {
            throw new Error(`${action} tracking not configured`);
        }

        return await CacheManager.fetchWithCache(config.url, config.cacheType, config.cacheKey);
    },

    /**
     * Process raw force data into structured format
     */
    processForceData(data) {
        if (!data) return [];

        // Handle different response formats
        if (data.success && data.forces) {
            return data.forces;
        }

        if (Array.isArray(data) && data.length > 1) {
            const headers = data[0];
            return data.slice(1).map(row => {
                const force = {};
                headers.forEach((header, index) => {
                    force[header] = row[index];
                });
                return force;
            });
        }

        return [];
    },

    /**
     * Generic loader for forces
     */
    async loadForces(type, key, containerId) {
        const container = typeof containerId === 'string' ?
            document.getElementById(containerId) : containerId;
        if (!container) return;

        try {
            UIHelpers.showLoading(container, 'Loading forces...');
            const result = await this.fetchForces(type, key);
            const forces = this.processForceData(result);

            if (forces.length > 0) {
                // Sort by timestamp (newest first)
                forces.sort((a, b) => {
                    const dateA = new Date(a['Timestamp'] || a.timestamp || 0);
                    const dateB = new Date(b['Timestamp'] || b.timestamp || 0);
                    return dateB - dateA;
                });

                // Display configurations
                const configs = {
                    'all': {
                        columns: ['force', 'commander', 'faction', 'detachment', 'joined'],
                        headers: ['Force Name', 'Commander', 'Faction', 'Detachment', 'Joined'],
                        tableId: 'all-forces-table'
                    },
                    'crusade': {
                        columns: ['force', 'commander', 'faction', 'joined'],
                        headers: ['Force Name', 'Commander', 'Faction', 'Joined'],
                        tableId: 'crusade-forces-table'
                    },
                    'user': {
                        columns: ['force', 'faction', 'detachment', 'battles', 'joined'],
                        headers: ['Force Name', 'Faction', 'Detachment', 'Battles', 'Created'],
                        tableId: 'user-forces-table'
                    }
                };

                const config = configs[type] || configs['all'];
                this.displayForces(forces, container, config);
            } else {
                const messages = {
                    'all': 'No forces registered yet.',
                    'crusade': 'No forces registered for this crusade yet.',
                    'user': 'No forces created by this user yet.'
                };
                UIHelpers.showNoData(container, messages[type] || 'No forces found.');
            }
        } catch (error) {
            console.error(`Error loading ${type} forces:`, error);
            UIHelpers.showError(container, 'Failed to load forces.');
        }
    },

    // Convenience methods
    async loadAllForces(containerId) {
        return this.loadForces('all', null, containerId);
    },

    async loadForCrusade(crusadeKey, containerId) {
        return this.loadForces('crusade', crusadeKey, containerId);
    },

    async loadForUser(userKey, containerId) {
        return this.loadForces('user', userKey, containerId);
    },

    /**
     * Display forces in a table
     */
    displayForces(forces, container, config) {
        if (!forces?.length) {
            UIHelpers.showNoData(container, 'No forces found.');
            return;
        }

        const rows = forces.map(force =>
            this.buildForceRow(force, config.columns)
        ).join('');

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table" ${config.tableId ? `id="${config.tableId}"` : ''}>
                    <thead>
                        <tr>${config.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        if (config.tableId && window.UIHelpers?.makeSortable) {
            UIHelpers.makeSortable(config.tableId);
        }
    },

    /**
     * Calculate force statistics
     */
    calculateForceStats(forces) {
        const stats = {
            totalForces: forces.length,
            factionBreakdown: {},
            totalBattles: 0,
            averageBattles: 0
        };

        forces.forEach(force => {
            // Count by faction
            const faction = force['Faction'] || force.faction || 'Unknown';
            stats.factionBreakdown[faction] = (stats.factionBreakdown[faction] || 0) + 1;

            // Sum battles
            const battles = parseInt(force['Battle Count'] || force.battleCount || 0);
            stats.totalBattles += battles;
        });

        if (stats.totalForces > 0) {
            stats.averageBattles = Math.round(stats.totalBattles / stats.totalForces);
        }

        return stats;
    }
};

window.ForceTable = ForceTable;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Auto-load forces on relevant pages
    if (document.getElementById('all-forces-container')) {
        setTimeout(() => ForceTable.loadAllForces('all-forces-container'), 100);
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceTable;
}