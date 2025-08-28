// filename: js/user-storage.js
// LocalStorage operations for User Management System (simplified to use CacheManager)
// 40k Crusade Campaign Tracker

const UserStorage = {
    // Storage key for selected user (no expiration)
    STORAGE_KEY: 'crusade_selected_user',
    
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
                console.log('Removed user from storage');
            }
            return true;
        } catch (error) {
            console.error('Error saving user:', error);
            return false;
        }
    },
    
    /**
     * Clear all UserManager data from localStorage
     */
    clearAllData() {
        console.log('Clearing all UserManager data');
        localStorage.removeItem(this.STORAGE_KEY);
        // CacheManager will handle clearing cached data
        CacheManager.clearType('users');
    }
};

// Make globally available
window.UserStorage = UserStorage;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserStorage;
}

console.log('UserStorage module loaded (simplified with CacheManager)');