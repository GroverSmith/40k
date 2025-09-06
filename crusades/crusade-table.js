// filename: crusades/crusade-table.js
// Crusade display module using TableBase utility
// 40k Crusade Campaign Tracker

const CrusadeTable = {    

    getDisplayConfig(type) {
        const configs = {
            'all': {
                columns: ['type', 'crusade', 'state', 'dates'],
                headers: ['Type', 'Crusade', 'State', 'Dates'],
                tableId: 'all-crusades-table',
                buildRow: this.buildCrusadeRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No crusades found.',
                errorMessage: 'Failed to load crusades.'
            },
            'active': {
                columns: ['crusade', 'type', 'dates'],
                headers: ['Crusade', 'Type', 'Dates'],
                tableId: 'active-crusades-table',
                buildRow: this.buildCrusadeRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No active crusades found.',
                errorMessage: 'Failed to load active crusades.'
            }
        };
        return configs[type] || configs['all'];
    },
    
    buildCrusadeRow(crusade, columns) {
        const crusadeKey = crusade['crusade_key'] || crusade['Key'] || crusade.key;
        const crusadeName = crusade['crusade_name'] || crusade['Crusade Name'] || 'Unnamed Crusade';
        const crusadeType = crusade['crusade_type'] || crusade['Crusade Type'] || '-';
        const state = crusade['state'] || crusade['State'] || 'Unknown';
        const startDate = crusade['start_date'] || crusade['Start Date'];
        const endDate = crusade['end_date'] || crusade['End Date'];

        const columnData = {
            crusade: this.createCrusadeLink(crusadeName, crusadeKey),
            type: crusadeType,
            state: this.formatState(state),
            dates: this.formatDateRange(startDate, endDate)
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    getFetchConfig(type, key) {
        const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');

        const configs = {
            'all': {
                url: crusadesUrl,
                cacheType: 'crusades',
                cacheKey: 'all',
                dataKey: null,
                loadingMessage: 'Loading crusades...'
            },
            'active': {
                url: crusadesUrl,
                cacheType: 'crusades',
                cacheKey: 'active',
                dataKey: null,
                loadingMessage: 'Loading active crusades...'
            }
        };

        return configs[type] || configs['all'];
    },
    

    async loadCrusades(type, key, containerId) {
        const fetchConfig = this.getFetchConfig(type, key);
        const displayConfig = this.getDisplayConfig(type, key);
        
        // Apply filtering for active crusades
        const filterFn = type === 'active' ? this.filterActiveCrusades : null;
        
        await TableBase.loadAndDisplay(fetchConfig, displayConfig, containerId, filterFn);
    },

    
    // Convenience methods
    async loadAllCrusades(containerId) {
        return this.loadCrusades('all', null, containerId);
    },

    async loadActiveCrusades(containerId) {
        return this.loadCrusades('active', null, containerId);
    },

    
    /**
     * Fetch crusades (for external use, like calculating stats)
     */
    async fetchCrusades(action, key) {
        const config = this.getFetchConfig(action, key);
        return await TableBase.fetchWithCache(config.url, config.cacheType, config.cacheKey);
    },

    
    createCrusadeLink(name, key) {
        return TableBase.createEntityLink('crusade', name || 'Unnamed Crusade', key);
    },

    getRelativePath: (dir) => TableBase.getRelativePath(dir),

    

    

    filterActiveCrusades(crusade) {
        const state = crusade['state'] || crusade['State'] || '';
        return state.toLowerCase() === 'active';
    },


    
    formatState(state) {
        if (!state) return '-';
        const stateClass = state.toLowerCase().replace(/\s+/g, '-');
        return `<span class="crusade-state state-${stateClass}">${state}</span>`;
    },

    
    /**
     * Format date range using common date formatting with year optimization
     */
    formatDateRange(startDate, endDate) {
        const start = TableBase.formatters.date(startDate);
        const end = TableBase.formatters.date(endDate);
        
        if (start && end) {
            // Check if both dates are in the same year
            const startYear = new Date(startDate).getFullYear();
            const endYear = new Date(endDate).getFullYear();
            
            if (startYear === endYear) {
                // Same year: show "MMM dd - MMM dd, yyyy"
                const startWithoutYear = start.replace(`, ${startYear}`, '');
                return `${startWithoutYear} - ${end}`;
            } else {
                // Different years: show full dates
                return `${start} - ${end}`;
            }
        } else if (start) {
            return `Started ${start}`;
        } else if (end) {
            return `Ends ${end}`;
        }
        return '-';
    },
};

// Make globally available
window.CrusadeTable = CrusadeTable;
