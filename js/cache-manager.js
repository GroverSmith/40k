// filename: js/cache-manager.js
// Unified caching system for all Google Sheets API calls
// 40k Crusade Campaign Tracker

const CacheManager = {
    // Cache configuration per data type
    cacheConfig: {
        forces: { duration: 3600000, key: 'cache_forces' }, // 1 hour
        users: { duration: 86400000, key: 'cache_users' }, // 24 hours
        crusades: { duration: 86400000, key: 'cache_crusades' }, // 24 hours
        armyLists: { duration: 1800000, key: 'cache_army_lists' }, // 30 minutes
        battleHistory: { duration: 1800000, key: 'cache_battle_history' }, // 30 minutes
        participants: { duration: 3600000, key: 'cache_participants' }, // 1 hour
        // Generic cache for any URL
        generic: { duration: 1800000, prefix: 'cache_url_' } // 30 minutes default
    },
    
    /**
     * Get cached data if valid
     * @param {string} dataType - Type of data (forces, users, etc.) or 'url' for generic
     * @param {string} identifier - Optional identifier for sub-queries (e.g., forceKey)
     * @returns {Object|null} Cached data or null if invalid/missing
     */
    get(dataType, identifier = '') {
        try {
            const cacheKey = this.getCacheKey(dataType, identifier);
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;
            
            const { data, timestamp, metadata } = JSON.parse(cached);
            const config = this.cacheConfig[dataType] || this.cacheConfig.generic;
            const age = Date.now() - timestamp;
            
            if (age < config.duration) {
                const ageMinutes = Math.round(age / 60000);
                console.log(`Cache hit for ${dataType}${identifier ? `:${identifier}` : ''} (${ageMinutes}m old)`);
                return { data, timestamp, metadata, valid: true };
            }
            
            console.log(`Cache expired for ${dataType}${identifier ? `:${identifier}` : ''}`);
            localStorage.removeItem(cacheKey);
            return null;
            
        } catch (error) {
            console.warn('Cache read error:', error);
            return null;
        }
    },
    
    /**
     * Set cache data
     * @param {string} dataType - Type of data
     * @param {any} data - Data to cache
     * @param {string} identifier - Optional identifier
     * @param {Object} metadata - Optional metadata about the cached data
     */
    set(dataType, data, identifier = '', metadata = {}) {
        try {
            const cacheKey = this.getCacheKey(dataType, identifier);
            const cacheData = {
                data,
                timestamp: Date.now(),
                metadata: {
                    ...metadata,
                    dataType,
                    identifier,
                    rows: Array.isArray(data) ? data.length : undefined
                }
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            
            const config = this.cacheConfig[dataType] || this.cacheConfig.generic;
            const expiryHours = Math.round(config.duration / 3600000);
            console.log(`Cached ${dataType}${identifier ? `:${identifier}` : ''} (expires in ${expiryHours}h)`);
            
            return true;
        } catch (error) {
            console.warn('Cache write error:', error);
            // If localStorage is full, try clearing old caches
            if (error.name === 'QuotaExceededError') {
                this.clearOldCaches();
                // Try once more
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    return true;
                } catch (retryError) {
                    console.error('Cache write failed after cleanup:', retryError);
                }
            }
            return false;
        }
    },
    
    /**
     * Fetch with cache
     * @param {string} url - URL to fetch
     * @param {string} dataType - Type of data for cache config
     * @param {string} identifier - Optional identifier
     * @returns {Promise<any>} Fetched or cached data
     */
    async fetchWithCache(url, dataType = 'generic', identifier = '') {
        // Check cache first
        const cached = this.get(dataType, identifier || url);
        if (cached && cached.valid) {
            return cached.data;
        }
        
        console.log(`Cache miss for ${dataType}, fetching from API...`);
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the response
            this.set(dataType, data, identifier || url, { url });
            
            return data;
            
        } catch (error) {
            console.error('Fetch error:', error);
            
            // Try to return stale cache if available
            const staleCache = this.getStale(dataType, identifier || url);
            if (staleCache) {
                console.warn('Using stale cache due to fetch error');
                return staleCache.data;
            }
            
            throw error;
        }
    },
    
    /**
     * Get stale cache (expired but still present)
     */
    getStale(dataType, identifier = '') {
        try {
            const cacheKey = this.getCacheKey(dataType, identifier);
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;
            
            const parsed = JSON.parse(cached);
            console.log('Returning stale cache as fallback');
            return { ...parsed, stale: true };
            
        } catch (error) {
            return null;
        }
    },
    
    /**
     * Clear specific cache
     */
    clear(dataType, identifier = '') {
        const cacheKey = this.getCacheKey(dataType, identifier);
        localStorage.removeItem(cacheKey);
        console.log(`Cleared cache for ${dataType}${identifier ? `:${identifier}` : ''}`);
    },
    
    /**
     * Clear all caches for a data type
     */
    clearType(dataType) {
        const config = this.cacheConfig[dataType];
        if (!config) return;
        
        const prefix = config.key || `${config.prefix}${dataType}`;
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`Cleared ${keysToRemove.length} ${dataType} cache entries`);
    },
    
    /**
     * Clear all caches
     */
    clearAll() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('cache_') || 
                       key.startsWith('sheets_cache') || 
                       key.includes('_cache'))) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`Cleared ${keysToRemove.length} total cache entries`);
        return keysToRemove.length;
    },
    
    /**
     * Clear old/expired caches to free up space
     */
    clearOldCaches() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('cache_') || key.includes('_cache'))) {
                try {
                    const cached = JSON.parse(localStorage.getItem(key));
                    const age = Date.now() - (cached.timestamp || 0);
                    // Remove if older than 48 hours
                    if (age > 172800000) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    // Remove if we can't parse it
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`Cleaned up ${keysToRemove.length} old cache entries`);
    },
    
    /**
     * Get cache key for a data type and identifier
     */
    getCacheKey(dataType, identifier) {
        const config = this.cacheConfig[dataType];
        
        if (!config) {
            // Generic URL cache
            return `cache_url_${btoa(identifier).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
        }
        
        if (identifier) {
            return `${config.key || config.prefix}_${identifier}`;
        }
        
        return config.key || `${config.prefix}${dataType}`;
    },
    
    /**
     * Get cache statistics
     */
    getStats() {
        const stats = {
            totalEntries: 0,
            totalSize: 0,
            byType: {}
        };
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('cache_') || key.includes('_cache'))) {
                stats.totalEntries++;
                const value = localStorage.getItem(key);
                stats.totalSize += value.length;
                
                // Categorize by type
                const type = key.split('_')[1] || 'unknown';
                stats.byType[type] = (stats.byType[type] || 0) + 1;
            }
        }
        
        stats.totalSizeMB = (stats.totalSize / 1048576).toFixed(2);
        return stats;
    },
    
    /**
     * Configure cache duration for a specific type
     */
    configureDuration(dataType, durationMs) {
        if (this.cacheConfig[dataType]) {
            this.cacheConfig[dataType].duration = durationMs;
            console.log(`Set ${dataType} cache duration to ${durationMs}ms`);
        }
    },
    
    /**
     * Migrate old cache formats to new unified format
     */
    migrateOldCaches() {
        const migrations = {
            'crusade_forces_cache': 'cache_forces',
            'crusade_users_cache': 'cache_users',
            'crusade_crusades_cache': 'cache_crusades'
        };
        
        Object.entries(migrations).forEach(([oldKey, newKey]) => {
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
                try {
                    const parsed = JSON.parse(oldData);
                    // Convert old format to new format
                    const newData = {
                        data: parsed.forces || parsed.users || parsed.crusades || parsed.data,
                        timestamp: parsed.timestamp || Date.now(),
                        metadata: {}
                    };
                    localStorage.setItem(newKey, JSON.stringify(newData));
                    localStorage.removeItem(oldKey);
                    console.log(`Migrated ${oldKey} to ${newKey}`);
                } catch (e) {
                    console.warn(`Failed to migrate ${oldKey}:`, e);
                }
            }
        });
    }
};

// Run migration on load
CacheManager.migrateOldCaches();

// Make globally available
window.CacheManager = CacheManager;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}

console.log('CacheManager initialized - unified caching system ready');