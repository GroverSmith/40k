// filename: user-manager.js
// User Management System for 40k Crusade Campaign Tracker
// Handles user selection, persistence, and context management

const UserManager = {
    // Storage keys
    STORAGE_KEY: 'crusade_selected_user',
    
    // Current user data
    currentUser: null,
    users: [],
    
    /**
     * Initialize the user management system
     */
    async init() {
        console.log('UserManager initializing...');
        
        // Load saved user from cache
        this.loadSavedUser();
        
        // Load all users from the backend
        await this.loadUsers();
        
        // Set up user dropdown in header
        this.setupUserDropdown();
        
        // Set up user selection handlers
        this.setupUserSelectionHandlers();
        
        // Set up create user button on main page
        this.setupCreateUserButton();
        
        // Verify dropdown was created
        const dropdown = document.getElementById('user-dropdown-container');
        if (dropdown) {
            console.log('✅ User dropdown created successfully');
        } else {
            console.error('❌ User dropdown not found after creation');
        }
        
        console.log('UserManager initialized with current user:', this.currentUser);
    },
    
    /**
     * Load saved user from localStorage
     */
    loadSavedUser() {
        try {
            const savedUser = localStorage.getItem(this.STORAGE_KEY);
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                console.log('Loaded saved user:', this.currentUser);
            }
        } catch (error) {
            console.warn('Error loading saved user:', error);
            this.currentUser = null;
        }
    },
    
    /**
     * Save current user to localStorage
     */
    saveCurrentUser() {
        try {
            if (this.currentUser) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
                console.log('Saved current user to cache:', this.currentUser);
            } else {
                localStorage.removeItem(this.STORAGE_KEY);
                console.log('Removed user from cache');
            }
        } catch (error) {
            console.error('Error saving user:', error);
        }
    },
    
    /**
     * Load all users from the backend
     */
    async loadUsers() {
        try {
            const usersUrl = CrusadeConfig.getSheetUrl('users');
            
            if (!usersUrl) {
                console.warn('Users sheet URL not configured');
                this.users = [];
                return;
            }
            
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
                id: index + 2, // Row number in sheet (1-based, accounting for header)
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
            
            console.log('Loaded users:', this.users);
            
            // If we have a saved user, validate it still exists
            if (this.currentUser) {
                const userExists = this.users.find(u => u.name === this.currentUser.name);
                if (!userExists) {
                    console.warn('Saved user no longer exists, clearing selection');
                    this.currentUser = null;
                    this.saveCurrentUser();
                }
            }
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = [];
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
        
        // Create user dropdown HTML
        const userDropdownHtml = `
            <div class="user-dropdown-trigger" id="user-dropdown-trigger">
                <span class="user-icon">👤</span>
                <span class="user-name" id="current-user-name">${this.currentUser ? this.currentUser.name : 'Select User'}</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="user-dropdown-menu" id="user-dropdown-menu" style="display: none;">
                <div class="user-dropdown-header">Select User</div>
                <div class="user-dropdown-options" id="user-dropdown-options">
                    <!-- Options will be populated here -->
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
        
        // Add to page - try multiple locations
        const container = document.querySelector('.container');
        const body = document.body;
        
        if (container) {
            // Make container relative if it isn't already
            const containerStyle = getComputedStyle(container);
            if (containerStyle.position === 'static') {
                container.style.position = 'relative';
            }
            
            // Add to container
            container.appendChild(userDropdownContainer);
            console.log('User dropdown added to container');
        } else {
            // Fallback: add to body
            body.appendChild(userDropdownContainer);
            console.log('User dropdown added to body as fallback');
        }
        
        // Populate dropdown options
        this.populateUserDropdown();
    },
    
    /**
     * Populate the user dropdown with available users
     */
    populateUserDropdown() {
        const optionsContainer = document.getElementById('user-dropdown-options');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        if (this.users.length === 0) {
            optionsContainer.innerHTML = '<div class="user-dropdown-empty">No users available</div>';
            return;
        }
        
        this.users.forEach(user => {
            const option = document.createElement('div');
            option.className = 'user-dropdown-option';
            if (this.currentUser && this.currentUser.name === user.name) {
                option.classList.add('selected');
            }
            
            option.innerHTML = `
                <div class="user-option-name">${user.name}</div>
                ${user.discordHandle ? `<div class="user-option-detail">Discord: ${user.discordHandle}</div>` : ''}
                ${user.email ? `<div class="user-option-email">${user.email}</div>` : ''}
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
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = menu.style.display !== 'none';
                menu.style.display = isVisible ? 'none' : 'block';
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
     */
    selectUser(user) {
        console.log('Selecting user:', user);
        
        this.currentUser = user;
        this.saveCurrentUser();
        
        // Update UI
        this.updateUserDisplayName();
        this.populateUserDropdown(); // Refresh to show selection
        
        // Close dropdown
        const menu = document.getElementById('user-dropdown-menu');
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
     * Auto-populate user name fields
     */
    autoPopulateUserFields() {
        if (!this.currentUser) return;
        
        // Find all user name input fields and populate them
        const userFields = document.querySelectorAll('input[name="userName"], input[id="user-name"], input[name="user-name"]');
        
        userFields.forEach(field => {
            if (field.value === '' || field.placeholder.toLowerCase().includes('name')) {
                field.value = this.currentUser.name;
                field.style.backgroundColor = '#2a4a2a'; // Slight green tint to show it's auto-populated
                
                // Add tooltip
                field.title = 'Auto-populated with current user';
            }
        });
    },
    
    /**
     * Show create user modal
     */
    showCreateUserModal() {
        console.log('Showing create user modal');
        
        // Create modal HTML
        const modalHtml = `
            <div id="create-user-modal" class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Create New User</h3>
                        <button class="modal-close" onclick="UserManager.closeCreateUserModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="create-user-form">
                            <div class="form-group">
                                <label for="create-user-name">Name <span style="color: #ff6b6b;">*</span></label>
                                <input type="text" id="create-user-name" name="name" required placeholder="Enter your name">
                                <small class="help-text">Your display name for the campaign tracker.</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-discord">Discord Handle</label>
                                <input type="text" id="create-user-discord" name="discordHandle" placeholder="username#1234">
                                <small class="help-text">Your Discord username and discriminator (optional).</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-email">Email</label>
                                <input type="email" id="create-user-email" name="email" placeholder="your@email.com">
                                <small class="help-text">Your email address (optional).</small>
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
                                <small class="help-text">Rate your 40k experience level (1-5).</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-experience">Years Experience</label>
                                <input type="number" id="create-user-experience" name="yearsExperience" min="0" max="50" placeholder="5">
                                <small class="help-text">How many years have you been playing Warhammer 40k?</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-games">Games Per Year</label>
                                <input type="number" id="create-user-games" name="gamesPerYear" min="0" max="365" placeholder="24">
                                <small class="help-text">Approximately how many 40k games do you play per year?</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="create-user-notes">Notes</label>
                                <textarea id="create-user-notes" name="notes" rows="3" placeholder="Any additional notes about yourself, your armies, preferences, etc."></textarea>
                                <small class="help-text">Optional notes about yourself or your gaming preferences.</small>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" onclick="UserManager.closeCreateUserModal()" class="btn-secondary">Cancel</button>
                                <button type="submit" class="btn-primary" id="create-user-submit-btn">
                                    <span class="btn-text">Create User</span>
                                    <span class="btn-loading" style="display: none;">
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
        document.body.appendChild(modalDiv);
        
        // Set up form handler
        const form = document.getElementById('create-user-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateUser();
        });
        
        // Focus on name field
        setTimeout(() => {
            document.getElementById('create-user-name').focus();
        }, 100);
    },
    
    /**
     * Close create user modal
     */
    closeCreateUserModal() {
        const modal = document.getElementById('create-user-modal');
        if (modal) {
            modal.remove();
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
            btnLoading.style.display = 'flex';
            
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
            btnLoading.style.display = 'none';
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
            this.autoPopulateUserFields();
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
        await this.loadUsers();
        this.populateUserDropdown();
    },
    
    /**
     * Clear current user selection
     */
    clearUser() {
        this.currentUser = null;
        this.saveCurrentUser();
        this.updateUserDisplayName();
        this.populateUserDropdown();
        this.onUserChanged(null);
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
            await UserManager.init();
            
            // Auto-populate any existing user fields
            UserManager.autoPopulateUserFields();
            
            console.log('✅ UserManager fully initialized and available globally');
        } catch (error) {
            console.error('❌ Error initializing UserManager:', error);
        }
    }, 100);
});

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}

console.log('UserManager loaded - user management system available');