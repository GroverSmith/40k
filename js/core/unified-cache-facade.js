// filename: js/core/unified-cache-facade.js
// Unified Cache Facade using IndexedDB for Google Apps Scripts
// Provides a clean, database-like interface with proper caching and deduplication
// 40k Crusade Campaign Tracker

class UnifiedCacheFacade {
    constructor() {
        this.dbName = 'CrusadeTrackerCache';
        this.dbVersion = 1;
        this.db = null;
        
        // Extract URLs from TableDefs (if available) or use fallback
        this.scriptUrls = {};
        
        // Filter out utility functions from TableDefs
        const tableNames = Object.keys(TableDefs).filter(key => 
            typeof TableDefs[key] === 'object' && TableDefs[key].url
        );
        
        console.log('UnifiedCacheFacade: Found table definitions for:', tableNames.join(', '));
        
        tableNames.forEach(sheetName => {
            this.scriptUrls[sheetName] = TableDefs[sheetName].url;
            console.log(`UnifiedCacheFacade: Loaded URL for ${sheetName}: ${TableDefs[sheetName].url}`);
        });
        
        console.log('UnifiedCacheFacade: All loaded URLs:', this.scriptUrls);
        
        // Extract primary keys and composite keys from TableDefs
        this.primaryKeys = {};
        this.compositeKeys = {};
        tableNames.forEach(sheetName => {
            this.primaryKeys[sheetName] = TableDefs[sheetName].primaryKey;
            this.compositeKeys[sheetName] = TableDefs[sheetName].compositeKey;
        });
        console.log('UnifiedCacheFacade: Loaded primary keys from TableDefs for', Object.keys(this.primaryKeys).length, 'tables');
        
        // Cache TTL settings (in milliseconds)
        this.cacheTTL = {
            users: 24 * 60 * 60 * 1000, // 24 hours
            crusades: 24 * 60 * 60 * 1000, // 24 hours
            forces: 24 * 60 * 60 * 1000, // 24 hours
            armies: 60 * 60 * 1000, // 1 hour
            xref_crusade_participants: 24 * 60 * 60 * 1000, // 24 hours
            battle_history: 30 * 60 * 1000, // 30 minutes
            units: 60 * 60 * 1000, // 1 hour
            stories: 60 * 60 * 1000, // 1 hour
            xref_story_forces: 60 * 60 * 1000, // 1 hour
            xref_story_armies: 60 * 60 * 1000, // 1 hour
            xref_story_units: 60 * 60 * 1000 // 1 hour
        };
    }

    /**
     * Initialize the IndexedDB database
     */
    async init() {
        if (this.db) return; // Already initialized
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('UnifiedCacheFacade: IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('UnifiedCacheFacade: Creating database schema...');
                
                // Create object stores for each sheet
                Object.keys(this.scriptUrls).forEach(sheetName => {
                    if (!db.objectStoreNames.contains(sheetName)) {
                        console.log(`Creating object store: ${sheetName}`);
                        const store = db.createObjectStore(sheetName, { keyPath: 'id' });
                        
                        // Create indexes for common queries
                        store.createIndex('primaryKey', 'primaryKey', { unique: true });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('deleted', 'deleted', { unique: false });
                        
                        // Create composite indexes for junction tables
                        const compositeKey = this.compositeKeys[sheetName];
                        if (compositeKey && Array.isArray(compositeKey)) {
                            const indexName = compositeKey.join('_');
                            store.createIndex(indexName, compositeKey, { unique: true });
                        }
                    }
                });
                
                // Create metadata store for cache management
                if (!db.objectStoreNames.contains('metadata')) {
                    console.log('Creating metadata store');
                    const metadataStore = db.createObjectStore('metadata', { keyPath: 'sheetName' });
                    metadataStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
                }
                
                console.log('UnifiedCacheFacade: Database schema created successfully');
            };
        });
    }

    /**
     * Generate a unique ID for a row based on its primary key(s)
     */
    generateRowId(sheetName, row) {
        const primaryKey = this.primaryKeys[sheetName];
        
        if (!primaryKey) {
            throw new Error(`No primary key defined for sheet: ${sheetName}`);
        }
        
        // console.log(`UnifiedCacheFacade: generateRowId for ${sheetName}:`, { row, primaryKey });
        
        // Handle composite keys for junction tables
        const compositeKey = this.compositeKeys[sheetName];
        if (compositeKey && Array.isArray(compositeKey)) {
            // Check that all composite key fields are present
            const missingKeys = compositeKey.filter(key => !row[key]);
            if (missingKeys.length > 0) {
                const missingInfo = missingKeys.reduce((acc, key) => {
                    acc[key] = row[key];
                    return acc;
                }, {});
                console.error(`UnifiedCacheFacade: Missing required keys for ${sheetName}:`, missingInfo);
                throw new Error(`Missing required keys for ${sheetName}: ${missingKeys.map(key => `${key}=${row[key]}`).join(', ')}`);
            }
            // Generate composite key by joining all fields with underscores
            return compositeKey.map(key => row[key]).join('_');
        }
        
        if (!row[primaryKey]) {
            console.error(`UnifiedCacheFacade: Missing primary key for ${sheetName}:`, { primaryKey, value: row[primaryKey] });
            throw new Error(`Missing primary key for ${sheetName}: ${primaryKey}=${row[primaryKey]}`);
        }
        
        return row[primaryKey];
    }

    /**
     * Check if cache is valid (not expired)
     */
    async isCacheValid(sheetName) {
        await this.ensureDatabaseReady();
        
        const transaction = this.db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.get(sheetName);
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                const metadata = request.result;
                if (!metadata) {
                    resolve(false);
                    return;
                }
                
                const now = Date.now();
                const ttl = this.cacheTTL[sheetName] || 60 * 60 * 1000; // Default 1 hour
                const isValid = (now - metadata.lastUpdated) < ttl;
                
                resolve(isValid);
            };
            
            request.onerror = () => resolve(false);
        });
    }

    /**
     * Update cache metadata
     */
    async updateCacheMetadata(sheetName, recordCount = null) {
        await this.ensureDatabaseReady();
        
        const transaction = this.db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        
        // Get record count if not provided
        let actualRecordCount = recordCount;
        if (actualRecordCount === null) {
            actualRecordCount = await this.getRecordCount(sheetName);
        }
        
        const metadata = {
            sheetName: sheetName,
            lastUpdated: Date.now(),
            recordCount: actualRecordCount
        };
        
        store.put(metadata);
        
        // Wait for transaction to complete
        await new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error(`UnifiedCacheFacade: Metadata transaction failed for ${sheetName}:`, transaction.error);
                reject(transaction.error);
            };
        });
    }

    /**
     * Check if database is ready
     */
    async ensureDatabaseReady() {
        if (!this.db) {
            await this.init();
        }
        
        // Wait a bit for any pending transactions to complete
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    /**
     * Get table definitions (for debugging)
     */
    getTableDefs() {
        if (typeof TableDefs !== 'undefined') {
            return TableDefs;
        }
        return null;
    }

    /**
     * Get script URLs (for debugging)
     */
    getScriptUrls() {
        return this.scriptUrls;
    }

    /**
     * Get primary keys (for debugging)
     */
    getPrimaryKeys() {
        return this.primaryKeys;
    }

    /**
     * Get composite keys (for debugging)
     */
    getCompositeKeys() {
        return this.compositeKeys;
    }

    /**
     * Get valid table names (for debugging)
     */
    getTableNames() {
        return Object.keys(this.scriptUrls);
    }

    /**
     * Get record count for a sheet
     */
    async getRecordCount(sheetName) {
        await this.ensureDatabaseReady();
        
        try {
            const transaction = this.db.transaction([sheetName], 'readonly');
            const store = transaction.objectStore(sheetName);
            const request = store.count();
            
            return new Promise((resolve) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => {
                    console.error(`Error counting records in ${sheetName}:`, request.error);
                    resolve(0);
                };
            });
        } catch (error) {
            console.error(`Error accessing object store ${sheetName}:`, error);
            return 0;
        }
    }

    /**
     * Fetch data from Google Apps Script
     */
    async fetchFromScript(sheetName, action = 'list', key = null) {
        try {
            console.log(`UnifiedCacheFacade: fetchFromScript called with sheetName: ${sheetName}, action: ${action}, key: ${key}`);
            
            if (!sheetName || typeof sheetName !== 'string') {
                throw new Error(`Invalid sheetName parameter: ${sheetName}`);
            }
            
            const scriptUrlConfig = this.scriptUrls[sheetName];
            if (!scriptUrlConfig) {
                throw new Error(`No script URL configured for sheet: ${sheetName}`);
            }
            
            let requestUrl = `${scriptUrlConfig}?action=${action}`;
            if (key) {
                requestUrl += `&key=${encodeURIComponent(key)}`;
            }
            
            console.log(`UnifiedCacheFacade: Fetching from script - ${sheetName} (${action})`);
            console.log(`UnifiedCacheFacade: Configured URL: ${scriptUrlConfig}`);
            console.log(`UnifiedCacheFacade: Full request URL: ${requestUrl}`);
            
            const response = await fetch(requestUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log(`UnifiedCacheFacade: Response data:`, responseData);
            
            if (!responseData.success) {
                throw new Error(responseData.error || 'Unknown error from script');
            }
            
            return responseData;
        } catch (error) {
            console.error(`UnifiedCacheFacade: Error in fetchFromScript for ${sheetName}:`, error);
            throw error;
        }
    }

    /**
     * Store rows in IndexedDB with deduplication
     */
    async storeRows(sheetName, rows) {
        await this.ensureDatabaseReady();
        if (!Array.isArray(rows) || rows.length === 0) return;
        
        // Prepare data for storage
        const storedIds = new Set();
        const timestamp = Date.now();
        const cacheRows = [];
        
        console.log(`UnifiedCacheFacade: Processing ${rows.length} rows for ${sheetName}`);
        // if (rows.length > 0) {
        //     console.log(`UnifiedCacheFacade: Sample row for ${sheetName}:`, rows[0]);
        //     console.log(`UnifiedCacheFacade: Available fields:`, Object.keys(rows[0]));
        // }
        
        for (const row of rows) {
            try {
                const rowId = this.generateRowId(sheetName, row);
                
                // Skip duplicates
                if (storedIds.has(rowId)) {
                    console.warn(`UnifiedCacheFacade: Skipping duplicate row for ${sheetName}: ${rowId}`);
                    continue;
                }
                
                storedIds.add(rowId);
                
                const cacheRow = {
                    id: rowId,
                    primaryKey: rowId, // Use the generated rowId as the primaryKey for consistency
                    data: row,
                    timestamp: timestamp,
                    deleted: !!(row.deleted_timestamp)
                };
                
                cacheRows.push(cacheRow);
            } catch (error) {
                console.error(`UnifiedCacheFacade: Error processing row for ${sheetName}:`, error, row);
                // Continue processing other rows
            }
        }
        
        // Clear existing data and store new data in a single transaction
        const transaction = this.db.transaction([sheetName], 'readwrite');
        const store = transaction.objectStore(sheetName);
        
        // Clear existing data
        store.clear();
        
        // Store all rows
        for (const cacheRow of cacheRows) {
            store.put(cacheRow);
        }
        
        // Wait for transaction to complete
        await new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error(`UnifiedCacheFacade: Transaction failed for ${sheetName}:`, transaction.error);
                reject(transaction.error);
            };
        });
        
        // Update metadata with the actual count of stored rows
        await this.updateCacheMetadata(sheetName, storedIds.size);
        
        console.log(`UnifiedCacheFacade: Successfully stored ${storedIds.size} unique rows for ${sheetName}`);
    }

    /**
     * Get all rows from a sheet (from cache or fetch if needed)
     */
    async getAllRows(sheetName, forceRefresh = false) {
        await this.ensureDatabaseReady();
        
        // Check if we need to refresh the cache
        const cacheValid = await this.isCacheValid(sheetName);
        console.log(`UnifiedCacheFacade: Cache validation for ${sheetName}: valid=${cacheValid}, forceRefresh=${forceRefresh}`);
        if (!cacheValid || forceRefresh) {
            console.log(`UnifiedCacheFacade: Cache invalid or refresh requested for ${sheetName}, fetching from script...`);
            
            try {
                const response = await this.fetchFromScript(sheetName, 'list');
                console.log(`UnifiedCacheFacade: Fetched data for ${sheetName}:`, response);
                await this.storeRows(sheetName, response.data);
            } catch (error) {
                console.error(`UnifiedCacheFacade: Failed to fetch ${sheetName}:`, error);
                if (error) {
                    console.error(`UnifiedCacheFacade: Error details:`, {
                        message: error.message || 'Unknown error',
                        stack: error.stack || 'No stack trace',
                        name: error.name || 'Unknown error type'
                    });
                } else {
                    console.error(`UnifiedCacheFacade: Error is null or undefined`);
                }
                // Fall back to cached data if available
            }
        }
        
        // Retrieve from cache
        const transaction = this.db.transaction([sheetName], 'readonly');
        const store = transaction.objectStore(sheetName);
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const allRows = request.result;
                console.log(`UnifiedCacheFacade: Retrieved ${allRows.length} total rows from cache for ${sheetName}`);
                
                const rows = allRows
                    .filter(row => !row.deleted) // Filter out deleted rows
                    .map(row => row.data); // Extract the actual data
                
                console.log(`UnifiedCacheFacade: Retrieved ${rows.length} active rows for ${sheetName}`);
                resolve(rows);
            };
            
            request.onerror = () => {
                console.error(`UnifiedCacheFacade: Failed to retrieve rows for ${sheetName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get a specific row by primary key
     */
    async getRowByKey(sheetName, key) {
        await this.ensureDatabaseReady();
        
        // First try to get from cache
        const transaction = this.db.transaction([sheetName], 'readonly');
        const store = transaction.objectStore(sheetName);
        const request = store.get(key);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const cachedRow = request.result;
                
                if (cachedRow && !cachedRow.deleted) {
                    console.log(`UnifiedCacheFacade: Found row in cache for ${sheetName}: ${key}`);
                    resolve(cachedRow.data);
                    return;
                }
                
                // Not in cache or deleted, try to fetch from script
                console.log(`UnifiedCacheFacade: Row not in cache for ${sheetName}: ${key}, fetching from script...`);
                
                this.fetchFromScript(sheetName, 'get', key)
                    .then(response => {
                        if (response.data) {
                            // Store the single row
                            this.storeRows(sheetName, [response.data]);
                            resolve(response.data);
                        } else {
                            resolve(null);
                        }
                    })
                    .catch(error => {
                        console.error(`UnifiedCacheFacade: Failed to fetch row for ${sheetName}: ${key}`, error);
                        reject(error);
                    });
            };
            
            request.onerror = () => {
                console.error(`UnifiedCacheFacade: Failed to retrieve row for ${sheetName}: ${key}`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get rows by a specific field value
     */
    async getRowsByField(sheetName, fieldName, fieldValue) {
        const allRows = await this.getAllRows(sheetName);
        return allRows.filter(row => row[fieldName] === fieldValue);
    }

    /**
     * Get rows by multiple field values (AND condition)
     */
    async getRowsByFields(sheetName, criteria) {
        const allRows = await this.getAllRows(sheetName);
        return allRows.filter(row => {
            return Object.entries(criteria).every(([field, value]) => row[field] === value);
        });
    }

    /**
     * Clear cache for a specific sheet
     */
    async clearCache(sheetName) {
        await this.ensureDatabaseReady();
        
        // Clear both the data store and the metadata
        const transaction = this.db.transaction([sheetName, 'metadata'], 'readwrite');
        const store = transaction.objectStore(sheetName);
        const metadataStore = transaction.objectStore('metadata');
        
        return new Promise((resolve) => {
            let completed = 0;
            const total = 2;
            
            const checkComplete = () => {
                completed++;
                if (completed === total) {
                    console.log(`UnifiedCacheFacade: Cleared cache for ${sheetName}`);
                    resolve();
                }
            };
            
            // Clear data store
            const dataRequest = store.clear();
            dataRequest.onsuccess = checkComplete;
            dataRequest.onerror = () => {
                console.error(`UnifiedCacheFacade: Failed to clear data store for ${sheetName}:`, dataRequest.error);
                checkComplete();
            };
            
            // Clear metadata
            const metadataRequest = metadataStore.delete(sheetName);
            metadataRequest.onsuccess = checkComplete;
            metadataRequest.onerror = () => {
                console.error(`UnifiedCacheFacade: Failed to clear metadata for ${sheetName}:`, metadataRequest.error);
                checkComplete();
            };
        });
    }

    /**
     * Clear all caches
     */
    async clearAllCaches() {
        await this.ensureDatabaseReady();
        
        // Only clear caches for object stores that actually exist
        const existingStores = Array.from(this.db.objectStoreNames);
        const clearPromises = Object.keys(this.scriptUrls)
            .filter(sheetName => existingStores.includes(sheetName))
            .map(sheetName => this.clearCache(sheetName));
        
        await Promise.all(clearPromises);
        
        // Also clear metadata if it exists
        if (existingStores.includes('metadata')) {
            const transaction = this.db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            store.clear();
        }
        
        console.log('UnifiedCacheFacade: Cleared all caches');
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        await this.ensureDatabaseReady();
        
        const stats = {};
        
        for (const sheetName of Object.keys(this.scriptUrls)) {
            try {
                const recordCount = await this.getRecordCount(sheetName);
                const cacheValid = await this.isCacheValid(sheetName);
                
                stats[sheetName] = {
                    recordCount,
                    cacheValid,
                    ttl: this.cacheTTL[sheetName]
                };
            } catch (error) {
                console.error(`Error getting stats for ${sheetName}:`, error);
                stats[sheetName] = {
                    recordCount: 0,
                    cacheValid: false,
                    ttl: this.cacheTTL[sheetName],
                    error: error.message
                };
            }
        }
        
        return stats;
    }

    /**
     * Force refresh all caches
     */
    async refreshAllCaches() {
        console.log('UnifiedCacheFacade: Refreshing all caches...');
        
        // Only refresh caches for object stores that actually exist
        const existingStores = Array.from(this.db.objectStoreNames);
        const refreshPromises = Object.keys(this.scriptUrls)
            .filter(sheetName => existingStores.includes(sheetName))
            .map(sheetName => this.getAllRows(sheetName, true)); // Force refresh
        
        await Promise.all(refreshPromises);
        console.log('UnifiedCacheFacade: All caches refreshed');
    }
}

// Create and export singleton instance
const UnifiedCache = new UnifiedCacheFacade();

// Make globally available
window.UnifiedCache = UnifiedCache;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UnifiedCache.init().catch(error => {
        console.error('Failed to initialize UnifiedCache:', error);
    });
});

console.log('UnifiedCacheFacade: Module loaded');
