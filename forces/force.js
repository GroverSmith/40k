// filename: forces/force.js
// Unified Force Details Controller
// 40k Crusade Campaign Tracker

const CrusadeForceApp = {
    forceKey: null,
    forceData: null,

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.forceKey = urlParams.get('key');

        if (!this.forceKey) {
            UIHelpers.showError('force-header', 'No force specified');
            return;
        }

        try {
            // Load force data
            this.forceData = await ForceData.loadForceData(this.forceKey);

            if (!this.forceData) {
                UIHelpers.showError('force-header', 'Force not found');
                return;
            }

            // Display force header
            ForceUI.updateHeader(this.forceData);

            // Load all sections in parallel for better performance
            await Promise.all([
                ForceSections.loadBattleHistory(this.forceData),
                ForceSections.loadArmyLists(this.forceData),
                ForceSections.loadCharactersUnits(this.forceData.key),
                ForceSections.loadStories(this.forceData.key),
                ForceSections.loadForceLogs(this.forceData.key)
            ]);

        } catch (error) {
            console.error('Error loading force details:', error);
            UIHelpers.showError('force-header', 'Error loading force data');
        }
    },

    async refreshData() {
        if (!this.forceKey) return;

        // Clear all related caches
        CacheManager.clear('forces', this.forceKey);
        CacheManager.clear('battleHistory', `force_${this.forceKey}`);
        CacheManager.clear('armyLists', `force_${this.forceKey}`);
        CacheManager.clear('units', `force_${this.forceKey}`);
        CacheManager.clear('stories', `force_${this.forceKey}`);

        // Reload
        await this.init();
    },

    navigateToAddArmyList() {
        if (!this.forceData) return;

        const params = new URLSearchParams({
            forceKey: this.forceData.key,
            forceName: this.forceData.forceName || '',
            userName: this.forceData.playerName || '',
            faction: this.forceData.faction || '',
            detachment: this.forceData.detachment || ''
        });

        window.location.href = `../armies/add-army-list.html?${params.toString()}`;
    },

    navigateToAddUnit() {
        if (!this.forceData) return;

        const userKey = KeyUtils.extractUserKeyFromForceKey(this.forceData.key);

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
    CrusadeForceApp.init();
});

// Make globally available
window.CrusadeForceApp = CrusadeForceApp;