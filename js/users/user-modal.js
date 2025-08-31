// filename: user-modal.js
// Create user modal functionality for User Management System
// 40k Crusade Campaign Tracker

const UserModal = {
    /**
     * Show create user modal
     */
    showCreateUserModal(onUserCreated) {
        console.log('Showing create user modal');
        
        // Create modal HTML with improved structure
        const modalHtml = `
            <div id="create-user-modal" class="modal-overlay" tabindex="-1">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Create New User</h2>
                        <button class="modal-close-btn" onclick="UserModal.closeCreateUserModal()" aria-label="Close modal">&times;</button>
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
                                <button type="button" onclick="UserModal.closeCreateUserModal()" class="btn btn-secondary">Cancel</button>
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
        
        // Store the callback
        this.onUserCreatedCallback = onUserCreated;
        
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
            UserModal.closeCreateUserModal();
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
            
            // Use UserAPI to create the user
            if (typeof UserAPI !== 'undefined') {
                const result = await UserAPI.createUser(userData);
                console.log('User creation result:', result);
                
                // Close modal first
                this.closeCreateUserModal();
                
                // Call the callback with full user data
                if (this.onUserCreatedCallback) {
                    // Pass the userData since we know what was created
                    await this.onUserCreatedCallback(userData);
                }
                
                // Show success message
                if (typeof UserUI !== 'undefined') {
                    UserUI.showMessage(`User "${userData.name}" created and selected successfully!`, 'success');
                }
            } else {
                throw new Error('UserAPI module not loaded');
            }
            
        } catch (error) {
            console.error('Error creating user:', error);
            if (typeof UserUI !== 'undefined') {
                UserUI.showMessage('Failed to create user: ' + error.message, 'error');
            }
            
            // Reset button state on error
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnText.classList.remove('hidden');
            btnLoading.style.display = 'none';
            btnLoading.classList.remove('active');
        }
    }
};

// Make globally available
window.UserModal = UserModal;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserModal;
}

console.log('UserModal module loaded');