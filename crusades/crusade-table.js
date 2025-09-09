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
                errorMessage: 'Failed to load crusades.',
                // Custom responsive column configuration
                responsiveColumns: {
                    mobile: {
                        columns: ['crusade', 'state'],
                        headers: ['Crusade', 'State']
                    },
                    tablet: {
                        columns: ['crusade', 'state', 'dates'],
                        headers: ['Crusade', 'State', 'Dates']
                    }
                    // desktop uses default columns
                }
            },
            'active': {
                columns: ['crusade', 'type', 'dates'],
                headers: ['Crusade', 'Type', 'Dates'],
                tableId: 'active-crusades-table',
                buildRow: this.buildCrusadeRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No active crusades found.',
                errorMessage: 'Failed to load active crusades.',
                // Custom responsive column configuration
                responsiveColumns: {
                    mobile: {
                        columns: ['crusade', 'dates'],
                        headers: ['Crusade', 'Dates']
                    }
                    // tablet and desktop use default columns
                }
            }
        };
        return configs[type] || configs['all'];
    },
    
    buildCrusadeRow(crusade, columns) {
        const crusadeKey = crusade['crusade_key'] || crusade.key;
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

    async loadCrusades(type, key, containerId) {
        const displayConfig = this.getDisplayConfig(type, key);
        
        // Create filter function for active crusades
        const filterFn = (type === 'active') ? 
            (crusade => this.filterActiveCrusades(crusade)) : null;
            
        await TableBase.loadAndDisplay('crusades', displayConfig, containerId, filterFn);
    },

    
    // Convenience methods
    async loadAllCrusades(containerId) {
        try {
            console.log('CrusadeTable.loadAllCrusades called for container:', containerId);
            return await this.loadCrusades('all', null, containerId);
        } catch (error) {
            console.error('Error in loadAllCrusades:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '<p class="no-data">Failed to load crusades. Please try refreshing the page.</p>';
            }
            throw error;
        }
    },

    async loadActiveCrusades(containerId) {
        return this.loadCrusades('active', null, containerId);
    },

    
    /**
     * Fetch crusades (for external use, like calculating stats)
     */
    async fetchCrusades(action, key) {
        return await UnifiedCache.getAllRows('crusades');
    },

    
    createCrusadeLink(name, key) {
        return TableBase.createEntityLink('crusade', name || 'Unnamed Crusade', key);
    },
     

    filterActiveCrusades(crusade) {
        const state = crusade['state'] || crusade['State'] || '';
        return state.toLowerCase() === 'active';
    },

    
    formatState(state) {
        if (!state) return '-';
        const stateClass = state.toLowerCase().replace(/\s+/g, '-');
        return `<span class="crusade-state state-${stateClass}">${state}</span>`;
    },

    
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
