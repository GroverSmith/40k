// filename: force-sections.js
// Section loaders for Force Details using SheetsManager with Key System
// 40k Crusade Campaign Tracker

const ForceSections = {
    /**
     * Load battle history section
     */
    loadBattleHistory(forceData) {
        ForceUI.showSection('battle-history-section');
        const battleHistoryUrl = CrusadeConfig.getSheetUrl('battleHistory');
        
        if (battleHistoryUrl) {
            // When implemented, this should filter by force key
            SheetsManager.embed('battle-history-sheet', 
                battleHistoryUrl, 
                {
                    maxHeight: '300px',
                    showStats: true,
                    sortable: true,
                    cacheMinutes: CrusadeConfig.getCacheConfig('forcePage'),
                    // Future: Add filter parameter for force key
                    // filter: { forceKey: forceData.key }
                }
            );
        } else {
            ForceUI.displayPlaceholder(
                'battle-history-sheet',
                'battleHistory',
                forceData.forceName,
                '📊',
                'tracking will be implemented here'
            );
        }
    },
    
    /**
     * Load army lists section using force key
     */
    async loadArmyLists(forceData) {
        ForceUI.showSection('army-lists-section');
        
        // Use the force key to load army lists
        const forceKey = forceData.key;
        console.log('Loading army lists for force key:', forceKey);
        
        const result = await ForceData.loadArmyLists(forceKey);
        
        if (result.success) {
            ForceUI.displayArmyLists(result.data, forceData.forceName, forceKey);
        } else {
            ForceUI.displayPlaceholder(
                'army-lists-sheet',
                'armyLists',
                forceData.forceName,
                '📋',
                'will be displayed here'
            );
        }
    },
    
    /**
     * Load characters and units section
     */
    loadCharactersUnits(forceData) {
        ForceUI.showSection('characters-units-section');
        const charactersUnitsUrl = CrusadeConfig.getSheetUrl('charactersUnits');
        
        if (charactersUnitsUrl) {
            // When implemented, this should filter by force key
            SheetsManager.embed('characters-units-sheet', 
                charactersUnitsUrl, 
                {
                    maxHeight: '400px',
                    showStats: true,
                    sortable: true,
                    cacheMinutes: CrusadeConfig.getCacheConfig('forcePage'),
                    // Future: Add filter parameter for force key
                    // filter: { forceKey: forceData.key }
                }
            );
        } else {
            ForceUI.displayPlaceholder(
                'characters-units-sheet',
                'charactersUnits',
                forceData.forceName,
                '🛡️',
                'will be displayed here'
            );
        }
    },
    
    /**
     * Load stories section
     */
    loadStories(forceData) {
        ForceUI.showSection('stories-section');
        const storiesUrl = CrusadeConfig.getSheetUrl('stories');
        
        if (storiesUrl) {
            // When implemented, this should filter by force key
            SheetsManager.embed('stories-sheet', 
                storiesUrl, 
                {
                    maxHeight: '400px',
                    showStats: true,
                    sortable: true,
                    cacheMinutes: CrusadeConfig.getCacheConfig('forcePage'),
                    // Future: Add filter parameter for force key
                    // filter: { forceKey: forceData.key }
                }
            );
        } else {
            ForceUI.displayPlaceholder(
                'stories-sheet',
                'stories',
                forceData.forceName,
                '📖',
                'and narratives will be displayed here'
            );
        }
    },
    
    /**
     * Load force logs section
     */
    loadForceLogs(forceData) {
        ForceUI.showSection('force-logs-section');
        const forceLogsUrl = CrusadeConfig.getSheetUrl('forceLogs');
        
        if (forceLogsUrl) {
            // When implemented, this should filter by force key
            SheetsManager.embed('force-logs-sheet', 
                forceLogsUrl, 
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    cacheMinutes: CrusadeConfig.getCacheConfig('forcePage'),
                    // Future: Add filter parameter for force key
                    // filter: { forceKey: forceData.key }
                }
            );
        } else {
            ForceUI.displayPlaceholder(
                'force-logs-sheet',
                'forceLogs',
                forceData.forceName,
                '📝',
                'will be displayed here'
            );
        }
    }
};

// Make globally available
window.ForceSections = ForceSections;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceSections;
}

console.log('ForceSections module loaded with key system support');