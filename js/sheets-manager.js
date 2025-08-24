// filename: sheets-manager.js
/**
 * SheetsManager - Utility class for managing multiple GoogleSheetsEmbed instances
 * Provides easy setup and global cache management
 */
class SheetsManager {
    static embeds = {};
    
    /**
     * Create and embed a new Google Sheets instance
     * @param {string} containerId - ID of the container element (without #)
     * @param {string} appsScriptUrl - Google Apps Script URL
     * @param {Object} options - Configuration options for the embed
     * @returns {GoogleSheetsEmbed} The created embed instance
     */
    static embed(containerId, appsScriptUrl, options = {}) {
        const embed = new GoogleSheetsEmbed(`#${containerId}`, appsScriptUrl, options);
        this.embeds[containerId] = embed;
        return embed;
    }
    
    /**
     * Refresh data for a specific embed
     * @param {string} containerId - ID of the container to refresh
     */
    static refresh(containerId) {
        if (this.embeds[containerId]) {
            this.embeds[containerId].refresh();
        }
    }
    
    /**
     * Refresh all embedded sheets
     */
    static refreshAll() {
        Object.values(this.embeds).forEach(embed => embed.refresh());
    }
    
    /**
     * Clear cache for a specific embed
     * @param {string} containerId - ID of the container whose cache to clear
     */
    static clearCache(containerId) {
        if (this.embeds[containerId]) {
            this.embeds[containerId].clearCache();
        }
    }
    
    /**
	 * Clear all caches for all embeds AND all fetch caches across all pages
	 */
	static clearAllCaches() {
		// Clear caches for current page embeds
		Object.values(this.embeds).forEach(embed => embed.clearCache());
		
		// Clear ALL sheets-related localStorage entries (across all pages)
		const keysToRemove = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			// Remove any sheets cache or crusade-related cache
			if (key && (
				key.includes('sheets_cache') || 
				key.includes('crusade_') ||
				key.includes('force_cache') ||
				key.includes('army_cache')
			)) {
				keysToRemove.push(key);
			}
		}
		
		// Remove all found cache keys
		keysToRemove.forEach(key => {
			console.log('Removing cache key:', key);
			localStorage.removeItem(key);
		});
		
		console.log(`Cleared ${keysToRemove.length} cache entries across all pages`);
	}
    
    /**
     * Get an embed instance by container ID
     * @param {string} containerId - ID of the container
     * @returns {GoogleSheetsEmbed|null} The embed instance or null if not found
     */
    static getEmbed(containerId) {
        return this.embeds[containerId] || null;
    }
    
    /**
     * Get all embed instances
     * @returns {Object} Object containing all embed instances
     */
    static getAllEmbeds() {
        return { ...this.embeds };
    }
    
    /**
     * Remove an embed instance
     * @param {string} containerId - ID of the container to remove
     */
    static removeEmbed(containerId) {
        if (this.embeds[containerId]) {
            this.embeds[containerId].clearCache();
            delete this.embeds[containerId];
        }
    }
}

// Global functions for cache management (backward compatibility)
function refreshAllBattleData() {
    SheetsManager.refreshAll();
}

function clearAllCaches() {
    SheetsManager.clearAllCaches();
    console.log('All caches cleared');
}

function clearSpecificCache(containerId) {
    SheetsManager.clearCache(containerId);
    console.log(`Cache cleared for ${containerId}`);
}

// Export for use in other modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SheetsManager, GoogleSheetsEmbed };
}