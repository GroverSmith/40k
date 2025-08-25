// filename: user-manager.js
// User Management System for 40k Crusade Campaign Tracker
// Optimized with lazy loading - displays cached user immediately, fetches list only when needed

const UserManager = {
    // Storage keys
    STORAGE_KEY: 'crusade_selected_user',  // No expiration - persists indefinitely
    USERS_CACHE_KEY: 'crusade_users_cache',
    USERS_CACHE_DURATION: 3600000, // 1 hour for the user list cache
    
    // Current user data
    currentUser: null,
    users: [],
    usersLoaded: false,
    isLoadingUsers: false,
    
    /**
     * Initialize the user management system
     */
    async init() {
        console.log('UserManager initializing...');
        
        // Load saved user from cache FIRST
        this.loadSavedUser();
        
        // Set up user dropdown in header immediately with cached user
        this.setupUserDropdown();
        
        // Set up user selection handlers
        this.setupUserSelectionHandlers();
        
        // Set up create user button on main page
        this.setupCreateUserButton();
        
        // Check if we have cached users and they're still fresh
        this.loadCachedUsers();
        
        console.log('UserManager initialized with current user:', this.currentUser);
    },
    
    /**
     * Load saved user from localStorage
     * This never expires - user selection persists indefinitely
     */
    loadSavedUser() {
        try {
            const savedUser = localStorage.getItem(this.STORAGE_KEY);
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                console.log('Loaded saved user (no expiration):', this.currentUser);
            }
        } catch (error) {
            console.warn('Error loading saved user:', error);
            this.currentUser = null;
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
                    this.users = users;
                    this.usersLoaded = true;
                    const ageMinutes = Math.round(age / 60000);
                    console.log(`Loaded cached users: ${this.users.length} users (cached ${ageMinutes} minutes ago)`);
                    return true;
                } else {
                    console.log('Cached users expired, will fetch when dropdown is opened');
                    localStorage.removeItem(this.USERS_CACHE_KEY); // Clean up expired cache
                }
            }
        } catch (error) {
            console.warn('Error loading cached users:', error);
        }
        return false;
    },
    
    /**
     * Save users to cache with timestamp for expiration
     */
    saveUsersToCache() {
        try {
            const cacheData = {
                users: this.users,
                timestamp: Date.now()
            };
            localStorage.setItem(this.USERS_CACHE_KEY, JSON.stringify(cacheData));
            console.log(`Saved ${this.users.length} users to cache (expires in 1 hour)`);
        } catch (error) {
            console.warn('Error saving users to cache:', error);
        }
    },
    
    /**
     * Save current user to localStorage
     * No expiration - persists indefinitely until explicitly changed or cleared
     */
    saveCurrentUser() {
        try {
            if (this.currentUser) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
                console.log('Saved current user (no expiration):', this.currentUser);
            } else {
                localStorage.removeItem(this.STORAGE_KEY);
                console.log('Removed user from cache');
            }
        } catch (error) {
            console.error('Error saving user:', error);
        }
    },
    
    /**
     * Load all users from the backend (only when needed)
     */
    async loadUsers() {
        // Prevent multiple simultaneous loads
        if (this.isLoadingUsers) {
            console.log('Already loading users, skipping duplicate request');
            return;
        }
        
        // If already loaded, don't reload unless forced
        if (this.usersLoaded) {
            console.log('Users already loaded');
            return;
        }
        
        this.isLoadingUsers = true;
        
        try {
            const usersUrl = CrusadeConfig.getSheetUrl('users');
            
            if (!usersUrl) {
                console.warn('Users sheet URL not configured');
                this.users = [];
                this.usersLoaded = true;
                return;
            }
            
            console.log('Fetching users from Google Sheets...');
            const response = await fetch(usersUrl);
            const responseData = await response.json();
            
            let data;
            if (Array.isArray(responseData)) {
                data = responseData;
            } else if (responseData.success && Array.isArray(responseData.data)) {
                data = responseData.data;
            } else {
                throw new Error('Unable to load users data');
            }
            
            // Convert to user objects (skip header row)
            this.users = data.slice(1).map((row, index) => ({
                id: index + 2,
                timestamp: row[0] || new Date(),
                name: row[1] || 'Unknown User',
                discordHandle: row[2] || '',
                email: row[3] || '',
                notes: row[4] || '',
                selfRating: row[5] || '',
                yearsExperience: row[6] || '',
                gamesPerYear: row[7] || '',
                isActive: true
            })).filter(user => user.name !== 'Unknown User');
            
            console.log('Loaded users from API:', this.users);
            this.usersLoaded = true;
            
            // Save to cache
            this.saveUsersToCache();
            
            // Update dropdown if it exists
            this.populateUserDropdown();
            
            // Validate current user still exists
            if (this.currentUser) {
                const userExists = this.users.find(u => u.name === this.currentUser.name);
                if (!userExists) {
                    console.warn('Saved user no longer exists, clearing selection');
                    this.currentUser = null;
                    this.saveCurrentUser();
                    this.updateUserDisplayName();
                }
            }
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = [];
            this.usersLoaded = true; // Mark as loaded even on error to prevent repeated attempts
        } finally {
            this.isLoadingUsers = false;
        }
    },
    
    /**
     * Set up the user dropdown in the page header
     */
    setupUserDropdown() {
        // Remove any existing dropdown first
        const existingDropdown = document.getElementById('user-dropdown-container');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        // Create user dropdown HTML with current user or placeholder
        const userName = this.currentUser ? this.currentUser.name : 'Select User';
        const userDropdownHtml = `
            <div class="user-controls-wrapper">
                <button class="clear-cache-btn" id="clear-cache-btn" title="Clear all cached data">
                    🔄 Clear Cache
                </button>
                <div class="user-dropdown-trigger" id="user-dropdown-trigger">
                    <span class="user-icon">👤</span>
                    <span class="user-name" id="current-user-name">${userName}</span>
                    <span class="dropdown-arrow">▼</span>
                </div>
            </div>
            <div class="user-dropdown-menu" id="user-dropdown-menu" style="display: none;">
                <div class="user-dropdown-header">Select User</div>
                <div class="user-dropdown-options" id="user-dropdown-options">
                    <div class="user-dropdown-empty">Loading users...</div>
                </div>
                <div class="user-dropdown-divider"></div>
                <div class="user-dropdown-action">
                    <a href="#" onclick="UserManager.showCreateUserModal()" class="create-user-link">+ Create New User</a>
                </div>
            </div>
        `;
        
        // Create container
        const userDropdownContainer = document.createElement('div');
        userDropdownContainer.className = 'user-dropdown-container';
        userDropdownContainer.id = 'user-dropdown-container';
        userDropdownContainer.innerHTML = userDropdownHtml;
        
        // Add to page
        const container = document.querySelector('.container');
        const body = document.body;
        
        if (container) {
            const containerStyle = getComputedStyle(container);
            if (containerStyle.position === 'static') {
                container.style.position = 'relative';
            }
            container.appendChild(userDropdownContainer);
            console.log('User dropdown added to container');
        } else {
            body.appendChild(userDropdownContainer);
            console.log('User dropdown added to body as fallback');
        }
        
        // Set up cache clear button
        this.setupCacheClearButton();
        
        // If we have cached users, populate immediately
        if (this.usersLoaded && this.users.length > 0) {
            this.populateUserDropdown();
        }
    },
    
    /**
     * Set up the cache clear button
     */
    setupCacheClearButton() {
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                this.clearAllDataCaches();
            });
        }
    },
    
    /**
     * Clear all cached data across all pages
     */
    clearAllDataCaches() {
        if (confirm('Clear all cached data? This will force fresh data loads on all pages.')) {
            // Clear ALL localStorage entries related to the app
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
            
            // Clear any SheetsManager caches if available
            if (typeof SheetsManager !== 'undefined' && SheetsManager.clearAllCaches) {
                SheetsManager.clearAllCaches();
            }
            
            console.log(`Cleared ${keysToRemove.length} cache entries`);
            
            // Show success and refresh
            alert(`Cache cleared! ${keysToRemove.length} entries removed.\n\nRefreshing page...`);
            location.reload();
        }
    },
    
    /**
     * Populate the user dropdown with available users
     */
    populateUserDropdown() {
        const optionsContainer = document.getElementById('user-dropdown-options');
        if (!optionsContainer) return;
        
        // Only show loading if we're actually loading
        if (this.isLoadingUsers) {
            optionsContainer.innerHTML = '<div class="user-dropdown-empty">Loading users...</div>';
            return;
        }
        
        // Clear container for fresh population
        optionsContainer.innerHTML = '';
        
        // If users aren't loaded yet and we're not currently loading, show placeholder
        if (!this.usersLoaded) {
            optionsContainer.innerHTML = '<div class="user-dropdown-empty">Click to load users</div>';
            return;
        }
        
        // If no users available after loading
        if (this.users.length === 0) {
            optionsContainer.innerHTML = '<div class="user-dropdown-empty">No users available</div>';
            return;
        }
        
        // Populate with user options
        this.users.forEach(user => {
            const option = document.createElement('div');
            option.className = 'user-dropdown-option';
            if (this.currentUser && this.currentUser.name === user.name) {
                option.classList.add('selected');
            }
            
            option.innerHTML = `
                <div class="user-option-name">${user.name}</div>
            `;
            
            option.addEventListener('click', () => {
                this.selectUser(user);
            });
            
            optionsContainer.appendChild(option);
        });
    },
    
    /**
     * Set up user selection event handlers
     */
    setupUserSelectionHandlers() {
        const trigger = document.getElementById('user-dropdown-trigger');
        const menu = document.getElementById('user-dropdown-menu');
        
        if (trigger && menu) {
            // Toggle dropdown on click
            trigger.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isVisible = menu.style.display !== 'none';
                
                if (!isVisible) {
                    // Opening dropdown
                    menu.style.display = 'block';
                    
                    // Load users if not loaded
                    if (!this.usersLoaded && !this.isLoadingUsers) {
                        // Show loading state immediately
                        const optionsContainer = document.getElementById('user-dropdown-options');
                        if (optionsContainer) {
                            optionsContainer.innerHTML = '<div class="user-dropdown-empty">Loading users...</div>';
                        }
                        
                        // Load users
                        await this.loadUsers();
                    } else if (this.usersLoaded) {
                        // If users are already loaded, make sure they're displayed
                        this.populateUserDropdown();
                    }
                } else {
                    // Closing dropdown
                    menu.style.display = 'none';
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-dropdown-container')) {
                    menu.style.display = 'none';
                }
            });
        }
    },
    
    /**
     * Set up create user button on main page
     */
    setupCreateUserButton() {
        const createUserBtn = document.getElementById('create-user-btn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => {
                console.log('Create user button clicked');
                this.showCreateUserModal();
            });
            console.log('✅ Create user button event handler attached');
        } else {
            console.log('ℹ️ Create user button not found (not on main page)');
        }
    },
    
    /**
     * Select a user as the current user
     * Selected user persists indefinitely in localStorage
     */
    selectUser(user) {
        console.log('Selecting user (will persist indefinitely):', user);
        
        this.currentUser = user;
        this.saveCurrentUser(); // Saves without expiration
        
        // Update UI
        this.updateUserDisplayName();
        
        // Only repopulate if the dropdown is visible
        const menu = document.getElementById('user-dropdown-menu');
        if (menu && menu.style.display !== 'none') {
            this.populateUserDropdown(); // Refresh to show selection
        }
        
        // Close dropdown
        if (menu) {
            menu.style.display = 'none';
        }
        
        // Trigger user change event
        this.onUserChanged(user);
    },
    
    /**
     * Update the displayed user name
     */
    updateUserDisplayName() {
        const nameElement = document.getElementById('current-user-name');
        if (nameElement) {
            nameElement.textContent = this.currentUser ? this.currentUser.name : 'Select User';
        }
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
     * Auto-populate all user name fields on the page
     */
    autoPopulateAllUserFields() {
        if (!this.currentUser) return;
        
        // Find all potential user name fields
        const userFields = document.querySelectorAll(
            'input[name="userName"], ' +
            'input[id="user-name"], ' +
            'input[name="user-name"], ' +
            'input[name="user"], ' +
            'input[name="playerName"], ' +
            'input[name="submittedBy"]'
        );
        
        userFields.forEach(field => {
            // Skip if field already has a value (unless it's a placeholder)
            if (field.value && !field.placeholder.toLowerCase().includes('name')) {
                return;
            }
            
            // Set the value and make it read-only
            field.value = this.currentUser.name;
            field.readOnly = true;
            field.style.backgroundColor = 'rgba(78, 205, 196, 0.1)';
            field.style.cursor = 'not-allowed';
            field.title = 'Auto-populated with current user. Change user from the dropdown in the top right.';
            
            // Add visual indicator if there's a parent form group
            const formGroup = field.closest('.form-group') || field.closest('.user-input-group');
            if (formGroup && !formGroup.querySelector('.user-field-indicator')) {
                this.addFieldIndicator(field, this.currentUser);
            }
        });
    },
    
    /**
     * Add a visual indicator to a user field
     */
    addFieldIndicator(field, user) {
        const indicator = document.createElement('div');
        indicator.className = 'user-field-indicator';
        indicator.innerHTML = `
            <span class="indicator-icon">🔒</span>
            <span class="indicator-text">Using selected user: <strong>${user.name}</strong></span>
            <a href="#" class="change-user-link" onclick="UserManager.promptUserChange(event)">Change user</a>
        `;
        
        // Insert after the field
        field.parentNode.insertBefore(indicator, field.nextSibling);
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
            
            // Show tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'user-select-tooltip';
            tooltip.textContent = 'Select a user from the dropdown above ↗️';
            tooltip.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                background: linear-gradient(135deg, #2c5aa0 0%, #1e4080 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                animation: slideInRight 0.3s ease-out;
                font-weight: bold;
            `;
            
            document.body.appendChild(tooltip);
            
            setTimeout(() => {
                tooltip.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (document.body.contains(tooltip)) {
                        document.body.removeChild(tooltip);
                    }
                }, 300);
            }, 3000);
        } else {
            // Fallback: show create user modal
            this.showCreateUserModal();
        }
    },
    
    /**
     * Show create user modal
     */
    showCreateUserModal() {
        console.log('Showing create user modal');
        
        // Ensure users are loaded first
        if (!this.usersLoaded) {
            this.loadUsers();
        }
        
        // Create modal HTML with improved structure
        const modalHtml = `
            <div id="create-user-modal" class="modal-overlay" tabindex="-1">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Create New User</h2>
                        <button class="modal-close-btn" onclick="UserManager.closeCreateUserModal()" aria-label="Close modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="create-user-form" class="modal-form">
                            <div class="form-group">
                                <label for="create-user-name">Name <span class="required">*</span></label>
                                <input type="text" id="create-user-name" name="name" required placeholder="Enter your name" autocomplete="name">
                                <small class="help-text">Your display name for the campaign tracker</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-discord">Discord Handle</label>
                                <input type="text" id="create-user-discord" name="discordHandle" placeholder="username#1234" autocomplete="off">
                                <small class="help-text">Your Discord username (optional)</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-email">Email</label>
                                <input type="email" id="create-user-email" name="email" placeholder="your@email.com" autocomplete="email">
                                <small class="help-text">Your email address (optional)</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-rating">Self Rating</label>
                                <select id="create-user-rating" name="selfRating">
                                    <option value="">Select rating...</option>
                                    <option value="1">1 - Beginner</option>
                                    <option value="2">2 - Novice</option>
                                    <option value="3">3 - Intermediate</option>
                                    <option value="4">4 - Advanced</option>
                                    <option value="5">5 - Expert</option>
                                </select>
                                <small class="help-text">Rate your 40k experience level</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-experience">Years Experience</label>
                                <input type="number" id="create-user-experience" name="yearsExperience" min="0" max="50" placeholder="5">
                                <small class="help-text">Years playing Warhammer 40k</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-games">Games Per Year</label>
                                <input type="number" id="create-user-games" name="gamesPerYear" min="0" max="365" placeholder="24">
                                <small class="help-text">Approximate games played annually</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-notes">Notes</label>
                                <textarea id="create-user-notes" name="notes" rows="3" placeholder="Any additional notes about yourself, your armies, preferences, etc."></textarea>
                                <small class="help-text">Optional notes about yourself</small>
                            </div>
                            
                            <div class="modal-actions">
                                <button type="button" onclick="UserManager.closeCreateUserModal()" class="btn btn-secondary">Cancel</button>
                                <button type="submit" class="btn btn-primary" id="create-user-submit-btn">
                                    <span class="btn-text">Create User</span>
                                    <span class="btn-loading">
                                        <div class="loading-spinner"></div>
                                        Creating...
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Set up form handler
        const form = document.getElementById('create-user-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateUser();
        });
        
        // Close modal on overlay click
        const overlay = document.getElementById('create-user-modal');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeCreateUserModal();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', this.handleEscapeKey);
        
        // Focus on name field after animation
        setTimeout(() => {
            const nameField = document.getElementById('create-user-name');
            if (nameField) {
                nameField.focus();
            }
        }, 300);
        
        // Trap focus within modal for accessibility
        this.trapFocus(overlay);
    },
    
    /**
     * Handle escape key to close modal
     */
    handleEscapeKey(e) {
        if (e.key === 'Escape') {
            UserManager.closeCreateUserModal();
        }
    },
    
    /**
     * Trap focus within modal for accessibility
     */
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    },
    
    /**
     * Close create user modal
     */
    closeCreateUserModal() {
        const modal = document.getElementById('create-user-modal');
        if (modal) {
            // Re-enable body scroll
            document.body.style.overflow = '';
            
            // Remove escape key listener
            document.removeEventListener('keydown', this.handleEscapeKey);
            
            // Add fade out animation
            modal.style.animation = 'fadeOut 0.3s ease-out';
            
            // Remove after animation
            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    },
    
    /**
     * Handle create user form submission
     */
    async handleCreateUser() {
        const form = document.getElementById('create-user-form');
        const submitBtn = document.getElementById('create-user-submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnText.classList.add('hidden');
            btnLoading.style.display = 'inline-flex';
            btnLoading.classList.add('active');
            
            const formData = new FormData(form);
            const userData = {
                name: formData.get('name').trim(),
                discordHandle: formData.get('discordHandle').trim(),
                email: formData.get('email').trim(),
                selfRating: formData.get('selfRating'),
                yearsExperience: formData.get('yearsExperience'),
                gamesPerYear: formData.get('gamesPerYear'),
                notes: formData.get('notes').trim()
            };
            
            // Validate required fields
            if (!userData.name) {
                throw new Error('Name is required');
            }
            
            const usersUrl = CrusadeConfig.getSheetUrl('users');
            if (!usersUrl) {
                throw new Error('Users sheet not configured');
            }
            
            // Submit using hidden form method (to handle CORS)
            await this.submitUserCreation(userData, usersUrl);
            
            // Success
            this.closeCreateUserModal();
            await this.refreshUsers();
            
            // Auto-select the new user
            const newUser = this.users.find(u => u.name === userData.name);
            if (newUser) {
                this.selectUser(newUser);
            }
            
            // Show success message
            this.showMessage('User created successfully!', 'success');
            
        } catch (error) {
            console.error('Error creating user:', error);
            this.showMessage('Failed to create user: ' + error.message, 'error');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnText.classList.remove('hidden');
            btnLoading.style.display = 'none';
            btnLoading.classList.remove('active');
        }
    },
    
    /**
     * Submit user creation via hidden form
     */
    async submitUserCreation(userData, url) {
        return new Promise((resolve, reject) => {
            // Create hidden form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = 'create-user-frame';
            form.style.display = 'none';
            
            Object.entries(userData).forEach(([key, value]) => {
                if (value) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                }
            });
            
            // Create iframe
            let iframe = document.getElementById('create-user-frame');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.name = 'create-user-frame';
                iframe.id = 'create-user-frame';
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
            }
            
            document.body.appendChild(form);
            
            // Handle response
            const timeout = setTimeout(() => {
                reject(new Error('User creation timeout'));
            }, 15000);
            
            iframe.onload = () => {
                clearTimeout(timeout);
                try {
                    const response = iframe.contentWindow.document.body.textContent;
                    const result = JSON.parse(response);
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'User creation failed'));
                    }
                } catch (error) {
                    // Assume success if we can't read the response (CORS)
                    console.log('Could not read response, assuming success');
                    resolve({ success: true });
                }
                
                document.body.removeChild(form);
            };
            
            form.submit();
        });
    },
    
    /**
     * Event handler for when user changes
     */
    onUserChanged(user) {
        console.log('User changed to:', user);
        
        // Auto-populate any user fields on the current page
        setTimeout(() => {
            this.autoPopulateAllUserFields();
        }, 100);
        
        // Dispatch custom event for other components to listen to
        const event = new CustomEvent('userChanged', {
            detail: { user: user }
        });
        window.dispatchEvent(event);
    },
    
    /**
     * Refresh user data from server
     */
    async refreshUsers() {
        // Clear the cache to force reload
        localStorage.removeItem(this.USERS_CACHE_KEY);
        this.usersLoaded = false;
        this.users = [];
        
        await this.loadUsers();
    },
    
    /**
     * Clear current user selection
     * Removes the persistent user selection
     */
    clearUser() {
        console.log('Clearing user selection');
        this.currentUser = null;
        this.saveCurrentUser(); // Removes from localStorage
        this.updateUserDisplayName();
        this.populateUserDropdown();
        this.onUserChanged(null);
    },
    
    /**
     * Clear all UserManager data from localStorage
     * Useful for debugging or logout functionality
     */
    clearAllData() {
        console.log('Clearing all UserManager data');
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.USERS_CACHE_KEY);
        this.currentUser = null;
        this.users = [];
        this.usersLoaded = false;
        this.updateUserDisplayName();
    },
    
    /**
     * Show temporary message
     */
    showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.style.position = 'fixed';
        message.style.top = '20px';
        message.style.right = '20px';
        message.style.zIndex = '1002';
        message.style.padding = '15px 20px';
        message.style.borderRadius = '5px';
        message.style.maxWidth = '400px';
        message.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        
        if (type === 'success') {
            message.style.backgroundColor = '#1e4a3a';
            message.style.border = '2px solid #4ecdc4';
            message.style.color = '#ffffff';
        } else if (type === 'error') {
            message.style.backgroundColor = '#4a1e1e';
            message.style.border = '2px solid #ff6b6b';
            message.style.color = '#ffffff';
        }
        
        message.textContent = text;
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (document.body.contains(message)) {
                document.body.removeChild(message);
            }
        }, 5000);
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
    
    // Add slight delay to ensure config is loaded
    setTimeout(async () => {
        try {
            // Check if config is available, if not try a bit longer
            if (typeof CrusadeConfig === 'undefined') {
                console.log('Waiting for CrusadeConfig...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            await UserManager.init();
            
            // Auto-populate any existing user fields
            UserManager.autoPopulateAllUserFields();
            
            console.log('✅ UserManager fully initialized with lazy loading');
        } catch (error) {
            console.error('❌ Error initializing UserManager:', error);
        }
    }, 100);
});

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}

console.log('UserManager loaded - optimized with lazy loading');