// filename: js/crusade-force.js
// Main controller for Force Details page using Key System
// 40k Crusade Campaign Tracker

const CrusadeForceApp = {
    forceKey: null,
    forceData: null,
    
    /**
     * Initialize the force details page
     */
    async init() {
        // Get force key from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.forceKey = urlParams.get('key');
        
        if (!this.forceKey) {
            this.showError('No force specified');
            return;
        }
        
        try {
            // Load force data
            this.forceData = await ForceData.loadForceData(this.forceKey);
            
            if (!this.forceData) {
                this.showError('Force not found');
                return;
            }
            
            // Display force header
            ForceUI.updateHeader(this.forceData);
            
            // Load all sections
            await ForceSections.loadBattleHistory(this.forceData);
            await ForceSections.loadArmyLists(this.forceData.key);
            
            // Load characters and units - pass the key string, not the whole object
            await ForceSections.loadCharactersUnits(this.forceData.key);
            
            await ForceSections.loadStories(this.forceData.key);
            await ForceSections.loadForceLogs(this.forceData.key);
            
        } catch (error) {
            console.error('Error loading force details:', error);
            this.showError('Error loading force data');
        }
    },
    
    /**
     * Show error message
     */
    showError(message) {
        const header = document.getElementById('force-header');
        if (header) {
            header.innerHTML = `
                <div class="error-message">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <a href="../index.html" class="btn-secondary">Back to Home</a>
                </div>
            `;
        }
    },
    
    /**
     * Refresh all data
     */
    async refreshData() {
        if (!this.forceKey) return;
        
        // Clear caches for this force
        CacheManager.clear('forces', this.forceKey);
        CacheManager.clear('battleHistory', `force_${this.forceKey}`);
        CacheManager.clear('armyLists', `force_${this.forceKey}`);
        CacheManager.clear('units', `force_${this.forceKey}`);
        
        // Reload
        await this.init();
    },
    
    /**
     * Navigate to add army list page
     */
    addArmyList() {
        if (!this.forceData) return;
        
        const params = new URLSearchParams({
            forceKey: this.forceData.key,
            forceName: this.forceData.forceName || '',
            userName: this.forceData.playerName || '',
            faction: this.forceData.faction || '',
            detachment: this.forceData.detachment || ''
        });
        
        window.location.href = `../army-lists/add-army-list.html?${params.toString()}`;
    },
    
    /**
     * Navigate to add unit page
     */
    addUnit() {
        if (!this.forceData) return;
        
        // Extract user key from force key
        let userKey = '';
        if (this.forceData.key && this.forceData.key.includes('_')) {
            const keyParts = this.forceData.key.split('_');
            userKey = keyParts[keyParts.length - 1];
        }
        
        const params = new URLSearchParams({
            forceKey: this.forceData.key,
            forceName: this.forceData.forceName || '',
            userName: this.forceData.playerName || '',
            userKey: userKey,
            faction: this.forceData.faction || ''
        });
        
        window.location.href = `../units/add-unit.html?${params.toString()}`;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Force page initializing...');
    CrusadeForceApp.init();
});

// Make globally available
window.CrusadeForceApp = CrusadeForceApp;