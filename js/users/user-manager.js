// filename: js/user-manager.js
// Core User Management System for 40k Crusade Campaign Tracker (using UnifiedCache)
// Orchestrates storage, API, UI, and modal modules

const UserManager = {
    // Current user data
    currentUser: null,
    users: [],
    usersLoaded: false,
    
    /**
     * Initialize the user management system
     */
    async init() {
        console.log('UserManager initializing...');
        
        // Load saved user from storage FIRST
        this.currentUser = UserStorage.loadSavedUser();
        
        // Set up user dropdown in header immediately with cached user
        UserUI.setupUserDropdown(this.currentUser ? this.currentUser.name : null);
        
        // Set up user selection handlers
        UserUI.setupUserSelectionHandlers(async () => {
            // Load users when dropdown is opened
            if (!this.usersLoaded && !UserAPI.isLoading()) {
                UserUI.populateUserDropdown([], this.currentUser, null, true);
                await this.loadUsers();
                UserUI.populateUserDropdown(this.users, this.currentUser, (user) => this.selectUser(user));
            } else if (this.usersLoaded) {
                UserUI.populateUserDropdown(this.users, this.currentUser, (user) => this.selectUser(user));
            }
        });
        
        // Set up cache clear button
        UserUI.setupCacheClearButton(() => this.clearAllDataCaches());
        
        // Set up create user button on main page
        UserUI.setupCreateUserButton(() => this.showCreateUserModal());
        
        console.log('UserManager initialized with current user:', this.currentUser);
    },
    
    /**
     * Load all users from the backend (only when needed)
     */
    async loadUsers() {
        if (this.usersLoaded) {
            console.log('Users already loaded, skipping reload');
            return;
        }
        
        const users = await UserAPI.loadUsers();
        
        if (users) {
            this.users = users;
            this.usersLoaded = true;
            
            // Validate current user still exists
            if (this.currentUser) {
                const userExists = this.users.find(u => u.name === this.currentUser.name);
                if (!userExists) {
                    console.warn('Saved user no longer exists, clearing selection');
                    this.currentUser = null;
                    UserStorage.saveCurrentUser(null);
                    UserUI.updateUserDisplayName(null);
                }
            }
        }
    },
    
    /**
     * Select a user as the current user
     */
    selectUser(user) {
        console.log('Selecting user (will persist indefinitely):', user);
        
        this.currentUser = user;
        UserStorage.saveCurrentUser(user);
        
        // Update UI
        UserUI.updateUserDisplayName(user ? user.name : null);
        UserUI.populateUserDropdown(this.users, this.currentUser, (u) => this.selectUser(u));
        UserUI.closeDropdownMenu();
        
        // Trigger user change event
        this.onUserChanged(user);
    },
    
    /**
     * Show create user modal
     */
    showCreateUserModal() {
        // Ensure users are loaded first
        if (!this.usersLoaded) {
            this.loadUsers();
        }
        
        UserModal.showCreateUserModal(async (userData) => {
            // Clear cache and reload users
            await UnifiedCache.clearCache('users');
            this.usersLoaded = false;
            this.users = [];
            
            // Force reload users from server
            await this.loadUsers();
            
            // Find and select the newly created user
            const newUser = this.users.find(u => u.name === userData.name);
            if (newUser) {
                this.selectUser(newUser);
                // Update dropdown immediately to show the new user
                UserUI.populateUserDropdown(this.users, newUser, (user) => this.selectUser(user));
            } else {
                console.warn('Could not find newly created user in refreshed list');
                // Still update the dropdown with the refreshed list
                UserUI.populateUserDropdown(this.users, this.currentUser, (user) => this.selectUser(user));
            }
        });
    },
    
    /**
     * Close create user modal (exposed for onclick handlers)
     */
    closeCreateUserModal() {
        UserModal.closeCreateUserModal();
    },
    
    /**
     * Get the current user
     */
    getCurrentUser() {
        return this.currentUser;
    },
    
    /**
     * Get the current user's name
     */
    getCurrentUserName() {
        return this.currentUser ? this.currentUser.name : null;
    },
    
    /**
     * Check if a user is currently selected
     */
    hasCurrentUser() {
        return this.currentUser !== null;
    },
    
    /**
     * Event handler for when user changes
     */
    onUserChanged(user) {
        console.log('User changed to:', user);
        
        // Auto-populate any user fields on the current page
        setTimeout(() => {
            UserUI.autoPopulateAllUserFields(this.currentUser);
        }, 100);
        
        // Dispatch custom event for other components to listen to
        const event = new CustomEvent('userChanged', {
            detail: { user: user }
        });
        window.dispatchEvent(event);
    },
    
    /**
     * Prompt user to change their selection
     */
    promptUserChange(event) {
        if (event) event.preventDefault();
        
        const dropdownTrigger = document.getElementById('user-dropdown-trigger');
        if (dropdownTrigger) {
            dropdownTrigger.click();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            UserUI.showTooltip('Select a user from the dropdown above ↗️');
        } else {
            this.showCreateUserModal();
        }
    },
    
    /**
     * Clear all cached data
     */
    async clearAllDataCaches() {
        if (confirm('Clear all cached data? This will force fresh data loads on all pages.')) {
            // Clear all caches using UnifiedCache
            if (typeof UnifiedCache !== 'undefined' && UnifiedCache.clearAllCaches) {
                await UnifiedCache.clearAllCaches();
                
                // Show success and refresh
                alert('Cache cleared! All cached data removed.\n\nRefreshing page...');
                location.reload();
            } else {
                alert('UnifiedCache not available');
            }
        }
    },
    
    /**
     * Clear all UserManager data from localStorage
     */
    async clearAllData() {
        console.log('Clearing all UserManager data');
        await UserStorage.clearAllData();
        this.currentUser = null;
        this.users = [];
        this.usersLoaded = false;
        UserUI.updateUserDisplayName(null);
    }
};

// Make UserManager globally available immediately (before DOM load)
if (typeof window !== 'undefined') {
    window.UserManager = UserManager;
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make UserManager globally available immediately
    window.UserManager = UserManager;
    
        // Add slight delay to ensure modules are loaded
        setTimeout(async () => {
            try {
                // Check that all modules are loaded
            if (typeof UserStorage === 'undefined') {
                console.error('UserStorage module not loaded!');
            }
            if (typeof UserAPI === 'undefined') {
                console.error('UserAPI module not loaded!');
            }
            if (typeof UserUI === 'undefined') {
                console.error('UserUI module not loaded!');
            }
            if (typeof UserModal === 'undefined') {
                console.error('UserModal module not loaded!');
            }
            if (typeof UnifiedCache === 'undefined') {
                console.error('UnifiedCache module not loaded!');
            }
            
            await UserManager.init();
            
            // Auto-populate any existing user fields
            UserUI.autoPopulateAllUserFields(UserManager.currentUser);
            
            console.log('✅ UserManager fully initialized with unified caching');
        } catch (error) {
            console.error('❌ Error initializing UserManager:', error);
        }
    }, 100);
});

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}

console.log('UserManager core module loaded - using UnifiedCache');