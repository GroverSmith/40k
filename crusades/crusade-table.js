// filename: crusades/crusade-table.js
// Crusade display module using TableBase utility
// 40k Crusade Campaign Tracker

const CrusadeTable = {
    // Use base utility for common methods
    getRelativePath: (dir) => TableBase.getRelativePath(dir),

    // Simplified link creator using base
    createCrusadeLink(name, key) {
        return TableBase.createEntityLink('crusade', name || 'Unnamed Crusade', key);
    },

    /**
     * Format crusade state with styling
     */
    formatState(state) {
        if (!state) return '-';
        const stateClass = state.toLowerCase().replace(/\s+/g, '-');
        return `<span class="crusade-state state-${stateClass}">${state.toUpperCase()}</span>`;
    },

    /**
     * Format date range
     */
    formatDateRange(startDate, endDate) {
        const start = TableBase.formatters.date(startDate);
        const end = TableBase.formatters.date(endDate);
        
        if (start && end) {
            return `${start} - ${end}`;
        } else if (start) {
            return `Started ${start}`;
        } else if (end) {
            return `Ends ${end}`;
        }
        return '-';
    },

    /**
     * Build crusade row
     */
    buildCrusadeRow(crusade, columns) {
        const crusadeKey = crusade['crusade_key'] || crusade['Key'] || crusade.key;
        const crusadeName = crusade['crusade_name'] || crusade['Crusade Name'] || 'Unnamed Crusade';
        const crusadeType = crusade['crusade_type'] || crusade['Crusade Type'] || '-';
        const state = crusade['state'] || crusade['State'] || 'Unknown';
        const startDate = crusade['start_date'] || crusade['Start Date'];
        const endDate = crusade['end_date'] || crusade['End Date'];
        const timestamp = crusade['timestamp'] || crusade['Timestamp'];

        const columnData = {
            crusade: this.createCrusadeLink(crusadeName, crusadeKey),
            type: crusadeType,
            state: this.formatState(state),
            dates: this.formatDateRange(startDate, endDate),
            created: TableBase.formatters.date(timestamp)
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    /**
     * Fetch crusades configuration
     */
    getFetchConfig(type, key) {
        const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');

        const configs = {
            'all': {
                url: crusadesUrl,
                cacheType: 'crusades'
            },
            'active': {
                url: crusadesUrl,
                cacheType: 'crusades'
            },
            'by-state': {
                url: crusadesUrl,
                cacheType: 'crusades'
            }
        };

        return configs[type] || configs['all'];
    },

    /**
     * Fetch crusades data
     */
    async fetchData(action, key) {
        const config = this.getFetchConfig(action, key);
        const data = await TableBase.fetchWithCache(config.url, config.cacheType);
        
        // Apply filtering based on action
        if (action === 'active') {
            return this.filterActiveCrusades(data);
        } else if (action === 'by-state' && key) {
            return this.filterCrusadesByState(data, key);
        }
        
        return data;
    },

    /**
     * Filter active crusades
     */
    filterActiveCrusades(data) {
        if (!Array.isArray(data)) return data;
        
        const processedData = TableBase.processResponseData(data);
        return processedData.filter(crusade => {
            const state = crusade['state'] || crusade['State'] || '';
            return state.toLowerCase() === 'active';
        });
    },

    /**
     * Filter crusades by state
     */
    filterCrusadesByState(data, state) {
        if (!Array.isArray(data)) return data;
        
        const processedData = TableBase.processResponseData(data);
        return processedData.filter(crusade => {
            const crusadeState = crusade['state'] || crusade['State'] || '';
            return crusadeState.toLowerCase() === state.toLowerCase();
        });
    },

    /**
     * Display crusades table
     */
    async displayCrusades(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        try {
            // Show loading state
            container.innerHTML = '<div class="loading-spinner"></div><span>Loading crusades...</span>';

            // Fetch data
            const data = await this.fetchData(options.action || 'all', options.key);
            const processedData = TableBase.processResponseData(data);

            if (!processedData || processedData.length === 0) {
                container.innerHTML = '<div class="no-data">No crusades found</div>';
                return;
            }

            // Define columns
            const columns = options.columns || ['crusade', 'type', 'state', 'dates', 'created'];

            // Build table
            let html = `
                <table class="data-table">
                    <thead>
                        <tr>${TableBase.buildHeaderCells(columns)}</tr>
                    </thead>
                    <tbody>
            `;

            // Add rows
            processedData.forEach(crusade => {
                html += this.buildCrusadeRow(crusade, columns);
            });

            html += `
                    </tbody>
                </table>
            `;

            container.innerHTML = html;

            // Make sortable if requested
            if (options.sortable !== false) {
                UIHelpers.makeSortable(container.querySelector('table'));
            }

        } catch (error) {
            console.error('Error displaying crusades:', error);
            container.innerHTML = `<div class="error-message">Error loading crusades: ${error.message}</div>`;
        }
    },

    /**
     * Display active crusades only
     */
    async displayActiveCrusades(containerId, options = {}) {
        const activeOptions = {
            ...options,
            action: 'active'
        };
        return await this.displayCrusades(containerId, activeOptions);
    },

    /**
     * Display crusades by state
     */
    async displayCrusadesByState(containerId, state, options = {}) {
        const stateOptions = {
            ...options,
            action: 'by-state',
            key: state
        };
        return await this.displayCrusades(containerId, stateOptions);
    }
};

// Make globally available
window.CrusadeTable = CrusadeTable;
