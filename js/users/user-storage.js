// filename: js/user-storage.js
// LocalStorage operations for User Management System (simplified to use UnifiedCache)
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
            } else {
                localStorage.removeItem(this.STORAGE_KEY);
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
    async clearAllData() {
        console.log('Clearing all UserManager data');
        localStorage.removeItem(this.STORAGE_KEY);
        // UnifiedCache will handle clearing cached data
        if (typeof UnifiedCache !== 'undefined') {
            await UnifiedCache.clearCache('users');
        }
    }
};

// Make globally available
window.UserStorage = UserStorage;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserStorage;
}

console.log('UserStorage module loaded (simplified with UnifiedCache)');