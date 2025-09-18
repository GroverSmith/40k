// filename: requisitions/requisition-table.js
// Requisition display module using TableBase utility
// 40k Crusade Campaign Tracker

const RequisitionTable = {

    getDisplayConfig(type) {
        const configs = {
            'all': {
                columns: ['force_key', 'event_name', 'rp_change', 'notes', 'timestamp'],
                headers: ['Force', 'Event', 'RP Change', 'Notes', 'Date'],
                tableId: 'all-requisitions-table',
                buildRow: this.buildRequisitionRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No requisitions recorded yet.',
                errorMessage: 'Failed to load requisitions.',
                responsiveColumns: this.getResponsiveColumns()
            },
            'force': {
                columns: ['event_name', 'rp_change', 'notes', 'timestamp'],
                headers: ['Event', 'RP Change', 'Notes', 'Date'],
                tableId: 'force-requisitions-table',
                buildRow: this.buildRequisitionRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No requisitions for this force yet.',
                errorMessage: 'Failed to load force requisitions.',
                responsiveColumns: {
                    mobile: {
                        columns: ['event_name', 'rp_change'],
                        headers: ['Event', 'RP Change']
                    },
                    tablet: {
                        columns: ['event_name', 'rp_change', 'timestamp'],
                        headers: ['Event', 'RP Change', 'Date']
                    }
                    // desktop uses default columns
                }
            }
        };
        return configs[type] || configs['all'];
    },

    // Shared responsive column configuration
    getResponsiveColumns() {
        return {
            mobile: {
                columns: ['event_name', 'rp_change'],
                headers: ['Event', 'RP Change']
            },
            tablet: {
                columns: ['event_name', 'rp_change', 'timestamp'],
                headers: ['Event', 'RP Change', 'Date']
            }
            // desktop uses default columns
        };
    },
    
    buildRequisitionRow(requisition, columns) {
        const requisitionKey = requisition.requisition_key;
        const forceKey = requisition.force_key || 'Unknown';
        const eventName = requisition.event_name || 'Unnamed Event';
        const rpChange = requisition.rp_change || 0;
        const notes = requisition.notes || '';
        const timestamp = requisition.timestamp;

        const columnData = {
            force_key: this.createForceLink(forceKey),
            event_name: eventName,
            rp_change: this.formatRPChange(rpChange),
            notes: notes,
            timestamp: TableBase.formatters.date(timestamp)
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },    
    
    async loadRequisitions(type, key, containerId) {
        const displayConfig = this.getDisplayConfig(type);
        
        if (type === 'force' && key) {
            // Use filter for force-specific requisitions
            const filterFn = (requisition => requisition.force_key === key);
            await TableBase.loadAndDisplay('requisitions', displayConfig, containerId, filterFn);
        } else {
            // Load all requisitions
            await TableBase.loadAndDisplay('requisitions', displayConfig, containerId);
        }
    },

    // Convenience methods
    async loadAllRequisitions(containerId) {
        return this.loadRequisitions('all', null, containerId);
    },

    async loadForForce(forceKey, containerId) {
        return await this.loadRequisitions('force', forceKey, containerId);
    },

    /**
     * Fetch requisitions (for external use)
     */
    async fetchRequisitions(action, key) {
        const requisitions = await UnifiedCache.getAllRows('requisitions');
        
        // Apply filtering based on action and key
        if (action === 'force' && key) {
            return requisitions.filter(requisition => requisition.force_key === key);
        }
        
        return requisitions;
    },

    /**
     * Calculate total RP change for a force
     */
    calculateTotalRP(requisitions, forceKey) {
        const forceRequisitions = requisitions.filter(req => req.force_key === forceKey);
        return forceRequisitions.reduce((total, req) => {
            const rpChange = parseInt(req.rp_change) || 0;
            return total + rpChange;
        }, 0);
    },

    /**
     * Get RP summary for a force
     */
    async getRPSummary(forceKey) {
        try {
            const requisitions = await this.fetchRequisitions('force', forceKey);
            const totalRP = this.calculateTotalRP(requisitions, forceKey);
            
            return {
                totalRP: totalRP,
                requisitionCount: requisitions.length,
                recentRequisitions: requisitions
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 5)
            };
        } catch (error) {
            console.error('Error getting RP summary:', error);
            return {
                totalRP: 0,
                requisitionCount: 0,
                recentRequisitions: []
            };
        }
    },
    
    createForceLink(forceKey) {
        return TableBase.createEntityLink('force', forceKey, forceKey);
    },
    
    formatRPChange(rpChange) {
        const change = parseInt(rpChange) || 0;
        if (change > 0) {
            return `<span class="rp-positive">+${change}</span>`;
        } else if (change < 0) {
            return `<span class="rp-negative">${change}</span>`;
        } else {
            return `<span class="rp-neutral">${change}</span>`;
        }
    }
};

window.RequisitionTable = RequisitionTable;
