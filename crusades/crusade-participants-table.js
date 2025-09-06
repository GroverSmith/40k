// filename: crusades/crusade-participants-table.js
// Crusade Participants display module using TableBase utility
// 40k Crusade Campaign Tracker

const CrusadeParticipantsTable = {

    // Simplified link creators using base
    createForceLink(name, key) {
        return TableBase.createEntityLink('force', name || 'Unknown Force', key);
    },

    createCrusadeLink(name, key) {
        return TableBase.createEntityLink('crusade', name || 'Unknown Crusade', key);
    },

    /**
     * Build participant row
     */
    buildParticipantRow(participant, columns) {
        const forceKey = participant['force_key'] || participant['Force Key'] || participant.Key;
        const forceName = participant['force_name'] || participant['Force Name'] || 'Unknown Force';
        const userName = participant['user_name'] || participant['User Name'] || 'Unknown Player';
        const crusadeKey = participant['crusade_key'] || participant['Crusade Key'];
        const crusadeName = participant['crusade_name'] || participant['Crusade Name'];
        const timestamp = participant['timestamp'] || participant['Timestamp'];

        const columnData = {
            force: this.createForceLink(forceName, forceKey),
            player: userName,
            crusade: crusadeName ? this.createCrusadeLink(crusadeName, crusadeKey) : '-',
            registered: TableBase.formatters.date(timestamp)
        };

        return `<tr>${TableBase.buildCells(columnData, columns)}</tr>`;
    },

    /**
     * Fetch participants configuration
     */
    getFetchConfig(type, key) {
        const participantsUrl = CrusadeConfig.getSheetUrl('xref_crusade_participants');

        const configs = {
            'all': {
                url: participantsUrl,
                cacheType: 'participants'
            },
            'by-crusade': {
                url: participantsUrl,
                cacheType: 'participants'
            },
            'by-force': {
                url: participantsUrl,
                cacheType: 'participants'
            },
            'by-user': {
                url: participantsUrl,
                cacheType: 'participants'
            }
        };

        return configs[type] || configs['all'];
    },

    /**
     * Fetch participants data
     */
    async fetchData(action, key) {
        const config = this.getFetchConfig(action, key);
        const data = await TableBase.fetchWithCache(config.url, config.cacheType);
        
        // Apply filtering based on action
        if (action === 'by-crusade' && key) {
            return this.filterParticipantsByCrusade(data, key);
        } else if (action === 'by-force' && key) {
            return this.filterParticipantsByForce(data, key);
        } else if (action === 'by-user' && key) {
            return this.filterParticipantsByUser(data, key);
        }
        
        return data;
    },

    /**
     * Filter participants by crusade
     */
    filterParticipantsByCrusade(data, crusadeKey) {
        if (!Array.isArray(data)) return data;
        
        // Filter raw data before processing
        const headers = data[0];
        const crusadeKeyIndex = headers.indexOf('crusade_key');
        
        if (crusadeKeyIndex === -1) return data;
        
        const filteredRows = [headers].concat(
            data.slice(1).filter(row => row[crusadeKeyIndex] === crusadeKey)
        );
        
        return filteredRows;
    },

    /**
     * Filter participants by force
     */
    filterParticipantsByForce(data, forceKey) {
        if (!Array.isArray(data)) return data;
        
        // Filter raw data before processing
        const headers = data[0];
        const forceKeyIndex = headers.indexOf('force_key');
        
        if (forceKeyIndex === -1) return data;
        
        const filteredRows = [headers].concat(
            data.slice(1).filter(row => row[forceKeyIndex] === forceKey)
        );
        
        return filteredRows;
    },

    /**
     * Filter participants by user
     */
    filterParticipantsByUser(data, userKey) {
        if (!Array.isArray(data)) return data;
        
        // Filter raw data before processing
        const headers = data[0];
        const userKeyIndex = headers.indexOf('user_key');
        
        if (userKeyIndex === -1) return data;
        
        const filteredRows = [headers].concat(
            data.slice(1).filter(row => row[userKeyIndex] === userKey)
        );
        
        return filteredRows;
    },

    /**
     * Display participants table
     */
    async displayParticipants(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        try {
            // Show loading state
            container.innerHTML = '<div class="loading-spinner"></div><span>Loading participants...</span>';

            // Fetch data
            const data = await this.fetchData(options.action || 'all', options.key);
            const processedData = TableBase.processResponseData(data);

            if (!processedData || processedData.length === 0) {
                container.innerHTML = '<div class="no-data">No participants found</div>';
                return;
            }

            // Define columns
            const columns = options.columns || ['force', 'player', 'crusade', 'registered'];

            // Build table
            let html = `
                <table class="data-table">
                    <thead>
                        <tr>${TableBase.buildHeaderCells(columns)}</tr>
                    </thead>
                    <tbody>
            `;

            // Add rows
            processedData.forEach(participant => {
                html += this.buildParticipantRow(participant, columns);
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
            console.error('Error displaying participants:', error);
            container.innerHTML = `<div class="error-message">Error loading participants: ${error.message}</div>`;
        }
    },

    /**
     * Display participants for a specific crusade
     */
    async displayCrusadeParticipants(containerId, crusadeKey, options = {}) {
        const crusadeOptions = {
            ...options,
            action: 'by-crusade',
            key: crusadeKey
        };
        return await this.displayParticipants(containerId, crusadeOptions);
    },

    /**
     * Display crusades for a specific force
     */
    async displayForceCrusades(containerId, forceKey, options = {}) {
        const forceOptions = {
            ...options,
            action: 'by-force',
            key: forceKey
        };
        return await this.displayParticipants(containerId, forceOptions);
    },

    /**
     * Display crusades for a specific user
     */
    async displayUserCrusades(containerId, userKey, options = {}) {
        const userOptions = {
            ...options,
            action: 'by-user',
            key: userKey
        };
        return await this.displayParticipants(containerId, userOptions);
    },

    /**
     * Get participant count for a crusade
     */
    async getCrusadeParticipantCount(crusadeKey) {
        try {
            const data = await this.fetchData('by-crusade', crusadeKey);
            if (!Array.isArray(data) || data.length <= 1) return 0;
            return data.length - 1; // Subtract 1 for header row
        } catch (error) {
            console.error('Error getting participant count:', error);
            return 0;
        }
    },

    /**
     * Check if a force is registered for a crusade
     */
    async isForceRegistered(crusadeKey, forceKey) {
        try {
            const data = await this.fetchData('by-crusade', crusadeKey);
            if (!Array.isArray(data) || data.length <= 1) return false;
            
            const headers = data[0];
            const forceKeyIndex = headers.indexOf('force_key');
            if (forceKeyIndex === -1) return false;
            
            return data.slice(1).some(row => row[forceKeyIndex] === forceKey);
        } catch (error) {
            console.error('Error checking force registration:', error);
            return false;
        }
    },

    /**
     * Register a force for a crusade
     */
    async registerForce(registrationData) {
        const participantsUrl = CrusadeConfig.getSheetUrl('xref_crusade_participants');
        
        if (!participantsUrl) {
            throw new Error('Participants sheet URL not configured');
        }
        
        // Submit registration
        const response = await fetch(participantsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(registrationData).toString()
        });
        
        if (!response.ok) {
            throw new Error('Failed to register force');
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Clear the participants cache
            CacheManager.clear('participants');
        }
        
        return result;
    }
};

// Make globally available
window.CrusadeParticipantsTable = CrusadeParticipantsTable;