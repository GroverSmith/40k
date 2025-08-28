// filename: js/crusade-force.js
// Main orchestrator for Force Details page - minimal changes to add caching
// 40k Crusade Campaign Tracker

const CrusadeForceApp = {
    forceKey: null,
    forceData: null,
    
    async init() {
        try {
            // Get force key from URL
            const urlParams = new URLSearchParams(window.location.search);
            this.forceKey = urlParams.get('key');
            
            if (!this.forceKey) {
                throw new Error('No force key provided in URL');
            }
            
            console.log('Loading force details for key:', this.forceKey);
            
            // Load force data - ForceData now uses caching automatically
            this.forceData = await ForceData.loadForceData(this.forceKey);
            
            // Update UI using existing ForceUI module
            ForceUI.updateHeader(this.forceData);
            ForceUI.updateStats(this.forceData);
            
            // Load sections using existing ForceSections module
            ForceSections.loadBattleHistory(this.forceData);
            await ForceSections.loadArmyLists(this.forceData);
            ForceSections.loadCharactersUnits(this.forceData);
            ForceSections.loadStories(this.forceData);
            ForceSections.loadForceLogs(this.forceData);
            
        } catch (error) {
            console.error('Error loading force:', error);
            ForceUI.showError(error.message);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if UserStorage is available (for caching)
    if (typeof UserStorage !== 'undefined') {
        console.log('Force page with caching support initializing...');
    } else {
        console.log('Force page initializing without cache (UserStorage not loaded)...');
    }
    
    CrusadeForceApp.init();
    window.CrusadeForceApp = CrusadeForceApp; // Make available globally
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeForceApp;
}