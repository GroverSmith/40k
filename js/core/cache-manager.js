// filename: js/cache-manager.js
// Simplified caching system for all Google Sheets API calls
// 40k Crusade Campaign Tracker
// Caches all data once per table and filters on retrieval
//
// USAGE EXAMPLES:
// 
// 1. Basic caching (replaces old identifier-based caching):
//    const data = await CacheManager.fetchWithCache(url, 'forces');
// 
// 2. Find specific record in cached data:
//    const force = CacheManager.findInCache('forces', 'force_key', 'MyForce_User123');
// 
// 3. Filter cached data:
//    const userForces = CacheManager.getFiltered('forces', { 
//        column: 'user_key', 
//        value: 'User123' 
//    });
// 
// 4. Custom filter with predicate:
//    const recentForces = CacheManager.getFiltered('forces', {
//        predicate: (force) => new Date(force.timestamp) > new Date('2024-01-01')
//    });

const CacheManager = {
    // Cache configuration per data type
    cacheConfig: {
        forces: { duration: 86400000 }, // 24 hours
        users: { duration: 86400000 }, // 24 hours
        crusades: { duration: 86400000 }, // 24 hours
        armies: { duration: 3600000 }, // 1 hour
        battles: { duration: 1800000 }, // 30 minutes
        participants: { duration: 86400000 }, // 24 hours
        stories: { duration: 3600000 }, // 1 hour
        units: { duration: 3600000 }, // 1 hour
        xref_story_forces: { duration: 3600000 }, // 1 hour
        xref_story_units: { duration: 3600000 }, // 1 hour
        xref_crusade_participants: { duration: 86400000 }, // 24 hours
        // Generic cache for any URL
        generic: { duration: 1800000 } // 30 minutes default
    },
    
    /**
     * Get cached data if valid
     * @param {string} dataType - Type of data (forces, users, etc.)
     * @returns {Object|null} Cached data or null if invalid/missing
     */
    get(dataType) {
        try {
            const cacheKey = `cache_${dataType}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;
            
            const { data, timestamp, metadata } = JSON.parse(cached);
            const config = this.cacheConfig[dataType] || this.cacheConfig.generic;
            const age = Date.now() - timestamp;
            
            if (age < config.duration) {
                const ageMinutes = Math.round(age / 60000);
                console.log(`Cache hit for ${dataType} (${ageMinutes}m old, ${Array.isArray(data) ? data.length : 'N/A'} rows)`);
                return { data, timestamp, metadata, valid: true };
            }
            
            console.log(`Cache expired for ${dataType}`);
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
     * @param {Object} metadata - Optional metadata about the cached data
     */
    set(dataType, data, metadata = {}) {
        try {
            const cacheKey = `cache_${dataType}`;
            const cacheData = {
                data,
                timestamp: Date.now(),
                metadata: {
                    ...metadata,
                    dataType,
                    rows: Array.isArray(data) ? data.length : undefined
                }
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            
            const config = this.cacheConfig[dataType] || this.cacheConfig.generic;
            const expiryHours = Math.round(config.duration / 3600000);
            console.log(`Cached ${dataType} (${Array.isArray(data) ? data.length : 'N/A'} rows, expires in ${expiryHours}h)`);
            
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
     * Fetch with cache - simplified to cache all data once per table
     * @param {string} url - URL to fetch
     * @param {string} dataType - Type of data for cache config
     * @returns {Promise<any>} Fetched or cached data
     */
    async fetchWithCache(url, dataType = 'generic') {
        // Check cache first
        const cached = this.get(dataType);
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
            this.set(dataType, data, { url });
            
            return data;
            
        } catch (error) {
            console.error('Fetch error:', error);
            
            // Try to return stale cache if available
            const staleCache = this.getStale(dataType);
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
    getStale(dataType) {
        try {
            const cacheKey = `cache_${dataType}`;
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
    clear(dataType) {
        const cacheKey = `cache_${dataType}`;
        localStorage.removeItem(cacheKey);
        console.log(`Cleared cache for ${dataType}`);
    },

    /**
     * Get filtered data from cache
     * @param {string} dataType - Type of data
     * @param {Object} filter - Filter criteria
     * @returns {Array|null} Filtered data or null if cache miss
     */
    getFiltered(dataType, filter = {}) {
        const cached = this.get(dataType);
        if (!cached || !cached.valid) {
            return null;
        }

        if (!Array.isArray(cached.data)) {
            return cached.data;
        }

        // Apply filters
        let filteredData = cached.data;
        
        if (filter.column && filter.value !== undefined) {
            filteredData = filteredData.filter(row => {
                if (Array.isArray(row)) {
                    // Handle array format (with headers)
                    const headers = cached.data[0];
                    const columnIndex = headers.indexOf(filter.column);
                    return columnIndex !== -1 && row[columnIndex] === filter.value;
                } else {
                    // Handle object format
                    return row[filter.column] === filter.value;
                }
            });
        }

        if (filter.predicate && typeof filter.predicate === 'function') {
            filteredData = filteredData.filter(filter.predicate);
        }

        console.log(`Filtered ${dataType}: ${cached.data.length} -> ${filteredData.length} rows`);
        return filteredData;
    },

    /**
     * Find specific record in cached data
     * @param {string} dataType - Type of data
     * @param {string} keyColumn - Column name to search
     * @param {string} keyValue - Value to find
     * @returns {Object|null} Found record or null
     */
    findInCache(dataType, keyColumn, keyValue) {
        const cached = this.get(dataType);
        if (!cached || !cached.valid || !Array.isArray(cached.data)) {
            return null;
        }

        const data = cached.data;
        if (data.length === 0) return null;

        // Check if first row is headers
        const isArrayFormat = Array.isArray(data[0]);
        const headers = isArrayFormat ? data[0] : null;
        const searchData = isArrayFormat ? data.slice(1) : data;

        if (isArrayFormat) {
            const keyIndex = headers.indexOf(keyColumn);
            if (keyIndex === -1) return null;
            
            const found = searchData.find(row => row[keyIndex] === keyValue);
            if (!found) return null;

            // Convert array to object
            const result = {};
            headers.forEach((header, index) => {
                result[header] = found[index];
            });
            return result;
        } else {
            return searchData.find(row => row[keyColumn] === keyValue) || null;
        }
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