// filename: crusades/crusade-participants-table.js
// Crusade Participants display module using TableBase utility
// 40k Crusade Campaign Tracker

const CrusadeParticipantsTable = {
    
    getDisplayConfig(type, key) {
        const configs = {
            'by-crusade': {
                columns: ['force', 'player', 'registered'],
                headers: ['Force', 'Player', 'Registered'],
                tableId: 'crusade-participants-table',
                buildRow: this.buildParticipantRow.bind(this),
                sortBy: TableBase.sortByDateDesc('timestamp'),
                noDataMessage: 'No forces registered for this crusade.',
                errorMessage: 'Failed to load crusade participants.',
                responsiveColumns: {
                    mobile: {
                        columns: ['force', 'player'],
                        headers: ['Force', 'Player']
                    }
                }
            }
        };

        return configs[type] || configs['by-crusade'];
    },

    
    async loadParticipants(type, key, containerId) {
        try {
            const displayConfig = this.getDisplayConfig(type, key);
            
            // Use UnifiedCache to fetch participants data
            const participants = await UnifiedCache.getAllRows('xref_crusade_participants');
            
            // Apply filtering based on type and key
            let filteredParticipants = participants;
            if (type === 'by-crusade' && key) {
                filteredParticipants = participants.filter(p => p.crusade_key === key);
            } 
            
            // Display the data using TableBase
            const container = document.getElementById(containerId);
            if (container) {
                if (filteredParticipants.length > 0) {
                    // Apply sorting if configured
                    if (displayConfig.sortBy) {
                        filteredParticipants.sort(displayConfig.sortBy);
                    }
                    TableBase.displayTable(filteredParticipants, container, displayConfig);
                } else {
                    UIHelpers.showNoData(container, displayConfig.noDataMessage);
                }
            }
        } catch (error) {
            console.error('Error in loadParticipants:', error);
            throw error;
        }
    },

    buildParticipantRow(participant, columns) {
        const forceKey = participant.force_key;
        const forceName = participant.force_name || 'Unknown Force';
        const userName = participant.user_name || 'Unknown Player';
        const crusadeKey = participant.crusade_key;
        const crusadeName = participant.crusade_name;
        const timestamp = participant.timestamp;

        const columnData = {
            force: this.createForceLink(forceName, forceKey),
            player: userName,
            crusade: crusadeName ? this.createCrusadeLink(crusadeName, crusadeKey) : '-',
            registered: TableBase.formatters.date(timestamp)
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },   

    
    async fetchData(action, key) {
        // Use UnifiedCache to get all participants
        const participants = await UnifiedCache.getAllRows('xref_crusade_participants');
        
        // Apply filtering based on action
        if (action === 'by-crusade' && key) {
            return participants.filter(p => p.crusade_key === key);
        } 
        
        return participants;
    },
    
    async displayCrusadeParticipants(containerId, crusadeKey, options = {}) {
        const crusadeOptions = {
            ...options,
            action: 'by-crusade',
            key: crusadeKey
        };
        return await this.loadParticipants(crusadeOptions.action || 'all', crusadeOptions.key, containerId);
    },

    
    async getCrusadeParticipantCount(crusadeKey) {
        try {
            const participants = await this.fetchData('by-crusade', crusadeKey);
            return participants ? participants.length : 0;
        } catch (error) {
            console.error('Error getting participant count:', error);
            return 0;
        }
    },

    
    async isForceRegistered(crusadeKey, forceKey) {
        try {
            const participants = await this.fetchData('by-crusade', crusadeKey);
            return participants.some(p => p.force_key === forceKey);
        } catch (error) {
            console.error('Error checking force registration:', error);
            return false;
        }
    },


    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },

    createCrusadeLink(name, key) {
        return TableBase.createEntityLink('crusade', name || 'Unknown Crusade', key);
    },
};

// Make globally available
window.CrusadeParticipantsTable = CrusadeParticipantsTable;