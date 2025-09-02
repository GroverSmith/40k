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
        const section = document.getElementById('army-lists-section');
        if (section) {
            section.style.display = 'block';
            if (window.ArmyTable) {
                await ArmyTable.loadForForce(forceData.key, 'army-lists-sheet');
            } else {
                console.error('ArmyTable module not loaded');
                const container = document.getElementById('army-lists-sheet');
                if (container) {
                    container.innerHTML = '<p class="error-message">Army table module not loaded</p>';
                }
            }
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