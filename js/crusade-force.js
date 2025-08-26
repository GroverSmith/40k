// filename: crusade-force.js
// Main orchestration for Force Details Page
// 40k Crusade Campaign Tracker

class CrusadeForceApp {
    constructor() {
        this.forceName = null;
        this.forceData = null;
        this.init();
    }
    
    init() {
        // Wait for config to be available
        if (typeof CrusadeConfig === 'undefined') {
            ForceUI.showError('Configuration not loaded. Please refresh the page.');
            return;
        }
        
        // Get force name from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.forceName = urlParams.get('force') || urlParams.get('name');
        
        if (!this.forceName) {
            ForceUI.showError('No force specified. Please select a force from the main page.');
            return;
        }
        
        // Decode the force name
        this.forceName = decodeURIComponent(this.forceName);
        
        console.log('Loading data for force:', this.forceName);
        this.loadForceData();
    }
    
    async loadForceData() {
        try {
            console.log('Starting loadForceData...');
            
            // Load main force data
            console.log('Loading main force data...');
            this.forceData = await ForceData.loadForceData(this.forceName);
            console.log('Main force data loaded successfully');
            
            // Update UI with force data
            ForceUI.updateHeader(this.forceData);
            ForceUI.updateStats(this.forceData);
            
            // Load all sections in parallel for better performance
            console.log('Loading force sections...');
            await this.loadAllSections();
            console.log('All sections loaded');
            
            console.log('All data loading complete!');
            
        } catch (error) {
            console.error('Error in loadForceData:', error);
            ForceUI.showError('Failed to load force data: ' + error.message);
        }
    }
    
    async loadAllSections() {
        // Load sections in parallel where possible
        const loadPromises = [
            this.loadBattleHistory(),
            this.loadArmyLists(),
            this.loadCharactersUnits(),
            this.loadStories(),
            this.loadForceLogs()
        ];
        
        await Promise.all(loadPromises);
    }
    
    async loadBattleHistory() {
        try {
            console.log('Loading battle history...');
            ForceSections.loadBattleHistory(this.forceData);
        } catch (error) {
            console.error('Error loading battle history:', error);
            ForceUI.showDataError('battle-history-sheet', 'Failed to load battle history');
        }
    }
    
    async loadArmyLists() {
        try {
            console.log('Loading army lists...');
            await ForceSections.loadArmyLists(this.forceData);
        } catch (error) {
            console.error('Error loading army lists:', error);
            ForceUI.showDataError('army-lists-sheet', 'Failed to load army lists');
        }
    }
    
    async loadCharactersUnits() {
        try {
            console.log('Loading characters and units...');
            ForceSections.loadCharactersUnits(this.forceData);
        } catch (error) {
            console.error('Error loading characters and units:', error);
            ForceUI.showDataError('characters-units-sheet', 'Failed to load characters and units');
        }
    }
    
    async loadStories() {
        try {
            console.log('Loading stories...');
            ForceSections.loadStories(this.forceData);
        } catch (error) {
            console.error('Error loading stories:', error);
            ForceUI.showDataError('stories-sheet', 'Failed to load stories');
        }
    }
    
    async loadForceLogs() {
        try {
            console.log('Loading force logs...');
            ForceSections.loadForceLogs(this.forceData);
        } catch (error) {
            console.error('Error loading force logs:', error);
            ForceUI.showDataError('force-logs-sheet', 'Failed to load force logs');
        }
    }
    
    // Public methods for debugging and manual control
    refreshForce() {
        console.log('Refreshing force data...');
        this.loadForceData();
    }
    
    getForceData() {
        return this.forceData;
    }
}

// Initialize the force app when page loads
document.addEventListener('DOMContentLoaded', () => {
    const forceApp = new CrusadeForceApp();
    
    // Make it globally available for debugging
    window.CrusadeForceApp = forceApp;
    
    console.log('Crusade Force page initialized with modular architecture');
});

// Utility functions for force page
const ForcePageUtils = {
    // Convert force name to URL parameter
    createForceUrl(forceName, basePath = 'forces/') {
        const encodedName = encodeURIComponent(forceName);
        return `${basePath}force-details.html?force=${encodedName}`;
    },
    
    // Get current force name from URL
    getCurrentForceName() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('force') || urlParams.get('name');
    },
    
    // Format date consistently
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch (error) {
            return dateString;
        }
    }
};

// Export for use in other modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CrusadeForceApp, ForcePageUtils };
}