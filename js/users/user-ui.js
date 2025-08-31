// filename: user-ui.js
// UI components and dropdown management for User Management System
// 40k Crusade Campaign Tracker

const UserUI = {
    /**
     * Set up the user dropdown in the page header
     */
    setupUserDropdown(currentUserName) {
        // Remove any existing dropdown first
        const existingDropdown = document.getElementById('user-dropdown-container');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        // Create user dropdown HTML with current user or placeholder
        const userName = currentUserName || 'Select User';
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
    },
    
    /**
     * Set up user selection event handlers
     */
    setupUserSelectionHandlers(onTriggerClick) {
        const trigger = document.getElementById('user-dropdown-trigger');
        const menu = document.getElementById('user-dropdown-menu');
        
        if (trigger && menu) {
            // Toggle dropdown on click
            trigger.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isVisible = menu.style.display !== 'none';
                
                if (!isVisible) {
                    menu.style.display = 'block';
                    // Call the provided callback when trigger is clicked
                    if (onTriggerClick) {
                        await onTriggerClick();
                    }
                } else {
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
     * Set up the cache clear button
     */
    setupCacheClearButton(onClearCache) {
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', onClearCache);
        }
    },
    
    /**
     * Set up create user button on main page
     */
    setupCreateUserButton(onCreateClick) {
        const createUserBtn = document.getElementById('create-user-btn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', onCreateClick);
            console.log('✅ Create user button event handler attached');
        } else {
            console.log('ℹ️ Create user button not found (not on main page)');
        }
    },
    
    /**
     * Populate the user dropdown with available users
     */
    populateUserDropdown(users, currentUser, onSelectUser, isLoading = false) {
        const optionsContainer = document.getElementById('user-dropdown-options');
        if (!optionsContainer) return;
        
        // Only show loading if we're actually loading
        if (isLoading) {
            optionsContainer.innerHTML = '<div class="user-dropdown-empty">Loading users...</div>';
            return;
        }
        
        // Clear container for fresh population
        optionsContainer.innerHTML = '';
        
        // If no users available after loading
        if (!users || users.length === 0) {
            optionsContainer.innerHTML = '<div class="user-dropdown-empty">No users available</div>';
            return;
        }
        
        // Populate with user options
        users.forEach(user => {
            const option = document.createElement('div');
            option.className = 'user-dropdown-option';
            if (currentUser && currentUser.name === user.name) {
                option.classList.add('selected');
            }
            
            option.innerHTML = `
                <div class="user-option-name">${user.name}</div>
            `;
            
            option.addEventListener('click', () => {
                if (onSelectUser) {
                    onSelectUser(user);
                }
            });
            
            optionsContainer.appendChild(option);
        });
    },
    
    /**
     * Update the displayed user name
     */
    updateUserDisplayName(userName) {
        const nameElement = document.getElementById('current-user-name');
        if (nameElement) {
            nameElement.textContent = userName || 'Select User';
        }
    },
    
    /**
     * Close the dropdown menu
     */
    closeDropdownMenu() {
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) {
            menu.style.display = 'none';
        }
    },
    
    /**
     * Auto-populate all user name fields on the page
     */
    autoPopulateAllUserFields(currentUser) {
        if (!currentUser) return;
        
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
            field.value = currentUser.name;
            field.readOnly = true;
            field.style.backgroundColor = 'rgba(78, 205, 196, 0.1)';
            field.style.cursor = 'not-allowed';
            field.title = 'Auto-populated with current user. Change user from the dropdown in the top right.';
            
            // Add visual indicator if there's a parent form group
            const formGroup = field.closest('.form-group') || field.closest('.user-input-group');
            if (formGroup && !formGroup.querySelector('.user-field-indicator')) {
                this.addFieldIndicator(field, currentUser);
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
    },
    
    /**
     * Show tooltip for user selection prompt
     */
    showTooltip(message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'user-select-tooltip';
        tooltip.textContent = message;
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
    }
};

// Make globally available
window.UserUI = UserUI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserUI;
}

console.log('UserUI module loaded');