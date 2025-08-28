// filename: user-storage.js
// LocalStorage operations for User Management System with Global Data Cache
// 40k Crusade Campaign Tracker

const UserStorage = {
    // Storage keys
    STORAGE_KEY: 'crusade_selected_user',  // No expiration - persists indefinitely
    USERS_CACHE_KEY: 'crusade_users_cache',
    CRUSADES_CACHE_KEY: 'crusade_crusades_cache',  // New crusades cache
    FORCES_CACHE_KEY: 'crusade_forces_cache',      // Forces cache for consistency
    USERS_CACHE_DURATION: 86400000, // 24 hours
    CRUSADES_CACHE_DURATION: 86400000, // 24 hours for crusades (they rarely change)
    FORCES_CACHE_DURATION: 3600000, // 1 hour for forces
    
    /**
     * Load saved user from localStorage
     * This never expires - user selection persists indefinitely
     */
    loadSavedUser() {
        try {
            const savedUser = localStorage.getItem(this.STORAGE_KEY);
            if (savedUser) {
                const user = JSON.parse(savedUser);
                console.log('Loaded saved user (no expiration):', user);
                return user;
            }
            return null;
        } catch (error) {
            console.warn('Error loading saved user:', error);
            return null;
        }
    },
    
    /**
     * Save current user to localStorage
     * No expiration - persists indefinitely until explicitly changed or cleared
     */
    saveCurrentUser(user) {
        try {
            if (user) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
                console.log('Saved current user (no expiration):', user);
            } else {
                localStorage.removeItem(this.STORAGE_KEY);
                console.log('Removed user from cache');
            }
            return true;
        } catch (error) {
            console.error('Error saving user:', error);
            return false;
        }
    },
    
    /**
     * Load cached users if available and fresh
     * User list cache expires after USERS_CACHE_DURATION
     */
    loadCachedUsers() {
        try {
            const cachedData = localStorage.getItem(this.USERS_CACHE_KEY);
            if (cachedData) {
                const { users, timestamp } = JSON.parse(cachedData);
                const age = Date.now() - timestamp;
                
                if (age < this.USERS_CACHE_DURATION) {
                    const ageMinutes = Math.round(age / 60000);
                    console.log(`Loaded cached users: ${users.length} users (cached ${ageMinutes} minutes ago)`);
                    return { users, timestamp, valid: true };
                } else {
                    console.log('Cached users expired, will fetch when dropdown is opened');
                    localStorage.removeItem(this.USERS_CACHE_KEY); // Clean up expired cache
                    return { users: [], valid: false };
                }
            }
            return { users: [], valid: false };
        } catch (error) {
            console.warn('Error loading cached users:', error);
            return { users: [], valid: false };
        }
    },
    
    /**
     * Save users to cache with timestamp for expiration
     */
    saveUsersToCache(users) {
        try {
            const cacheData = {
                users: users,
                timestamp: Date.now()
            };
            localStorage.setItem(this.USERS_CACHE_KEY, JSON.stringify(cacheData));
            console.log(`Saved ${users.length} users to cache (expires in 1 hour)`);
            return true;
        } catch (error) {
            console.warn('Error saving users to cache:', error);
            return false;
        }
    },
    
    /**
     * Load cached crusades if available and fresh
     */
    loadCachedCrusades() {
        try {
            const cachedData = localStorage.getItem(this.CRUSADES_CACHE_KEY);
            if (cachedData) {
                const { crusades, timestamp } = JSON.parse(cachedData);
                const age = Date.now() - timestamp;
                
                if (age < this.CRUSADES_CACHE_DURATION) {
                    const ageHours = Math.round(age / 3600000);
                    console.log(`Loaded cached crusades: ${crusades.length} rows (cached ${ageHours} hours ago)`);
                    return { crusades, timestamp, valid: true };
                } else {
                    console.log('Cached crusades expired');
                    localStorage.removeItem(this.CRUSADES_CACHE_KEY);
                    return { crusades: [], valid: false };
                }
            }
            return { crusades: [], valid: false };
        } catch (error) {
            console.warn('Error loading cached crusades:', error);
            return { crusades: [], valid: false };
        }
    },
    
    /**
     * Save crusades to cache with timestamp
     */
    saveCrusadesToCache(crusades) {
        try {
            const cacheData = {
                crusades: crusades,
                timestamp: Date.now()
            };
            localStorage.setItem(this.CRUSADES_CACHE_KEY, JSON.stringify(cacheData));
            console.log(`Saved ${crusades.length} crusade rows to cache (expires in 24 hours)`);
            return true;
        } catch (error) {
            console.warn('Error saving crusades to cache:', error);
            return false;
        }
    },
    
    /**
     * Load cached forces if available and fresh
     */
    loadCachedForces() {
        try {
            const cachedData = localStorage.getItem(this.FORCES_CACHE_KEY);
            if (cachedData) {
                const { forces, timestamp } = JSON.parse(cachedData);
                const age = Date.now() - timestamp;
                
                if (age < this.FORCES_CACHE_DURATION) {
                    const ageMinutes = Math.round(age / 60000);
                    console.log(`Loaded cached forces: ${forces.length} rows (cached ${ageMinutes} minutes ago)`);
                    return { forces, timestamp, valid: true };
                } else {
                    console.log('Cached forces expired');
                    localStorage.removeItem(this.FORCES_CACHE_KEY);
                    return { forces: [], valid: false };
                }
            }
            return { forces: [], valid: false };
        } catch (error) {
            console.warn('Error loading cached forces:', error);
            return { forces: [], valid: false };
        }
    },
    
    /**
     * Save forces to cache with timestamp
     */
    saveForcesToCache(forces) {
        try {
            const cacheData = {
                forces: forces,
                timestamp: Date.now()
            };
            localStorage.setItem(this.FORCES_CACHE_KEY, JSON.stringify(cacheData));
            console.log(`Saved ${forces.length} force rows to cache (expires in 1 hour)`);
            return true;
        } catch (error) {
            console.warn('Error saving forces to cache:', error);
            return false;
        }
    },
    
    /**
     * Clear all cached data across all pages
     */
    clearAllDataCaches() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                // Clear everything except the selected user (which should persist)
                if (key !== this.STORAGE_KEY) {
                    keysToRemove.push(key);
                }
            }
        }
        
        // Remove all found cache keys
        keysToRemove.forEach(key => {
            console.log('Removing cache key:', key);
            localStorage.removeItem(key);
        });
        
        console.log(`Cleared ${keysToRemove.length} cache entries`);
        return keysToRemove.length;
    },
    
    /**
     * Clear user-specific caches
     */
    clearUserCaches() {
        localStorage.removeItem(this.USERS_CACHE_KEY);
        console.log('Cleared user list cache');
    },
    
    /**
     * Clear crusades cache
     */
    clearCrusadesCache() {
        localStorage.removeItem(this.CRUSADES_CACHE_KEY);
        console.log('Cleared crusades cache');
    },
    
    /**
     * Clear forces cache
     */
    clearForcesCache() {
        localStorage.removeItem(this.FORCES_CACHE_KEY);
        console.log('Cleared forces cache');
    },
    
    /**
     * Clear all UserManager data from localStorage
     */
    clearAllData() {
        console.log('Clearing all UserManager data');
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.USERS_CACHE_KEY);
        localStorage.removeItem(this.CRUSADES_CACHE_KEY);
        localStorage.removeItem(this.FORCES_CACHE_KEY);
    }
};

// Make globally available
window.UserStorage = UserStorage;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserStorage;
}

console.log('UserStorage module loaded with global data caching');