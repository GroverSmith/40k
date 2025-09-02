// filename: forces/force-sections.js
// Section loaders for Force Details using SheetsManager with Key System
// 40k Crusade Campaign Tracker

const ForceSections = {
    /**
     * Load battle history section
     */
    async loadBattleHistory(forceData) {
        const section = document.getElementById('battle-history-section');
        if (section) {
            section.style.display = 'block';
            if (window.BattleTable) {
                await BattleTable.loadForForce(forceData.key, 'battle-history-content');
            }

            // Update stats separately
            const result = await BattleTable.fetchBattles('force', forceData.key);
            if (result.success && result.battles) {
                ForceUI.updateStatsFromBattles(result.battles, forceData.key);
            }
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
                'ðŸ"‹',
                'will be displayed here'
            );
        }
    },

    /**
     * Load characters and units for the force
     */
    async loadCharactersUnits(forceKey) {
        const section = document.getElementById('characters-units-section');
        console.log('Loading units for force:', forceKey); // Debug log
        console.log('UnitTable available:', !!window.UnitTable); // Check if module exists

        if (section) {
            section.style.display = 'block';
            if (window.UnitTable) {
                await UnitTable.loadForForce(forceKey, 'characters-units-sheet');
            } else {
                console.error('UnitTable module not loaded');
                const container = document.getElementById('characters-units-sheet');
                if (container) {
                    container.innerHTML = '<p class="error-message">Unit module not loaded</p>';
                }
            }
        }
    },
    

    
    async loadStories(forceKey) {
        const section = document.getElementById('stories-section');
        if (section) {
            section.style.display = 'block';
            if (window.StoryTable) {
                await StoryTable.loadForForce(forceKey, 'stories-sheet');
            }
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