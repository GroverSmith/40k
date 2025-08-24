// filename: add-force-form.js
// Add Force Form - Handle Crusade Force creation
// 40k Crusade Campaign Tracker

class AddForceForm {
    constructor() {
        this.config = {
            // Google Sheets Configuration - Uses the new Forces sheet
            forceSheetUrl: CrusadeConfig ? CrusadeConfig.getSheetUrl('forces') : '',
            
            // Form validation settings
            minNameLength: 3,
            maxNameLength: 100,
            maxNotesLength: 2000
        };
        
        this.userChangeListenerAdded = false;
        this.init();
    }
    
    init() {
        console.log('Add Force Form initialized');
        
        // Set up form event listeners
        this.setupEventListeners();
        
        // Wait for UserManager to be ready, then auto-populate user name
        this.waitForUserManager();
    }
    
    waitForUserManager() {
        // Check if UserManager exists and is ready
        if (typeof UserManager !== 'undefined') {
            // Give UserManager a moment to load the saved user
            setTimeout(() => {
                this.autoPopulateUserName();
            }, 200);
        } else {
            // UserManager not loaded yet, wait and try again
            setTimeout(() => {
                this.waitForUserManager();
            }, 100);
        }
    }
    
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('add-force-form');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Auto-resize textareas
        const textareas = form.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));
        });
        
        // Validate form inputs on change
        const requiredInputs = form.querySelectorAll('[required]');
        requiredInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    autoPopulateUserName() {
        const userNameField = document.getElementById('user-name');
        if (!userNameField) return;
        
        // Check if UserManager is available
        if (typeof UserManager === 'undefined') {
            console.log('UserManager not available yet');
            return;
        }
        
        // Check if UserManager has loaded the current user
        const currentUser = UserManager.getCurrentUser();
        
        if (currentUser) {
            // User is selected - hide the input field and show indicator
            userNameField.value = currentUser.name;
            userNameField.readOnly = true;
            userNameField.style.display = 'none'; // Hide the input field
            userNameField.required = true; // Still required for form validation
            
            // Add a visual indicator showing the selected user
            this.addUserFieldIndicator(currentUser);
            
            console.log('Auto-populated user name:', currentUser.name);
        } else {
            // No user selected - show input field and warning
            userNameField.style.display = ''; // Show the input field
            userNameField.readOnly = false;
            userNameField.style.backgroundColor = '';
            userNameField.style.cursor = '';
            userNameField.placeholder = 'Enter your name or select a user from top right';
            userNameField.title = 'Select a user from the dropdown in the top right for auto-population';
            
            this.addNoUserWarning();
        }
        
        // Listen for user changes (only add listener once)
        if (!this.userChangeListenerAdded) {
            window.addEventListener('userChanged', (event) => {
                this.handleUserChange(event.detail.user);
            });
            this.userChangeListenerAdded = true;
        }
    }
    
    addUserFieldIndicator(user) {
        // Remove any existing indicator
        const existingIndicator = document.querySelector('.user-field-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const formGroup = document.querySelector('#user-name').closest('.form-group');
        if (!formGroup) return;
        
        // Create indicator element that replaces the input field visually
        const indicator = document.createElement('div');
        indicator.className = 'user-field-indicator selected';
        indicator.innerHTML = `
            <div class="user-display">
                <span class="indicator-icon">👤</span>
                <span class="indicator-text">
                    <span class="label">Creating as:</span>
                    <strong>${user.name}</strong>
                </span>
                <a href="#" class="change-user-link" onclick="addForceForm.promptUserChange(event)">Change user</a>
            </div>
        `;
        
        // Insert after the input field (which is now hidden)
        const userNameField = document.getElementById('user-name');
        userNameField.parentNode.insertBefore(indicator, userNameField.nextSibling);
    }
    
    addNoUserWarning() {
        // Remove any existing warning
        const existingWarning = document.querySelector('.user-field-indicator');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        const formGroup = document.querySelector('#user-name').closest('.form-group');
        if (!formGroup) return;
        
        // Create warning element
        const warning = document.createElement('div');
        warning.className = 'user-field-indicator warning';
        warning.innerHTML = `
            <span class="indicator-icon">⚠️</span>
            <span class="indicator-text">No user selected</span>
            <a href="#" class="change-user-link" onclick="addForceForm.promptUserChange(event)">Select user</a>
        `;
        
        // Insert after the input field
        const userNameField = document.getElementById('user-name');
        userNameField.parentNode.insertBefore(warning, userNameField.nextSibling);
    }
    
    handleUserChange(user) {
        const userNameField = document.getElementById('user-name');
        if (!userNameField) return;
        
        if (user) {
            // User selected - hide input and show indicator
            userNameField.value = user.name;
            userNameField.readOnly = true;
            userNameField.style.display = 'none'; // Hide the input field
            
            this.addUserFieldIndicator(user);
            this.clearFieldError(userNameField);
        } else {
            // No user - show input field
            userNameField.value = '';
            userNameField.style.display = ''; // Show the input field
            userNameField.readOnly = false;
            userNameField.style.backgroundColor = '';
            userNameField.style.cursor = '';
            userNameField.placeholder = 'Enter your name or select a user from top right';
            
            this.addNoUserWarning();
        }
    }
    
    promptUserChange(event) {
        event.preventDefault();
        
        // Trigger the user dropdown to open
        if (typeof UserManager !== 'undefined') {
            const dropdownTrigger = document.getElementById('user-dropdown-trigger');
            if (dropdownTrigger) {
                dropdownTrigger.click();
                
                // Scroll to top so user can see the dropdown
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                // Show a temporary tooltip
                this.showTooltip('Select a user from the dropdown above ↗️');
            } else {
                // UserManager not initialized on this page, show create user modal
                if (UserManager.showCreateUserModal) {
                    UserManager.showCreateUserModal();
                }
            }
        }
    }
    
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
        
        // Remove after 3 seconds
        setTimeout(() => {
            tooltip.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                }
            }, 300);
        }, 3000);
    }
    
    autoResizeTextarea(textarea) {
        // Auto-resize textarea based on content
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 300);
        textarea.style.height = newHeight + 'px';
    }
    
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // Remove existing error styling
        this.clearFieldError(field);
        
        // Required field validation
        if (field.required && !value) {
            isValid = false;
            errorMessage = 'This field is required.';
        }
        
        // Specific field validations
        if (field.id === 'force-name' && value) {
            if (value.length < this.config.minNameLength) {
                isValid = false;
                errorMessage = `Force name must be at least ${this.config.minNameLength} characters long.`;
            } else if (value.length > this.config.maxNameLength) {
                isValid = false;
                errorMessage = `Force name must be no more than ${this.config.maxNameLength} characters long.`;
            }
        }
        
        if (field.id === 'notes' && value) {
            if (value.length > this.config.maxNotesLength) {
                isValid = false;
                errorMessage = `Notes must be no more than ${this.config.maxNotesLength} characters long.`;
            }
        }
        
        // Show error if invalid
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        field.style.borderColor = '#ff6b6b';
        
        // Create or update error message
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('small');
            errorElement.className = 'field-error';
            errorElement.style.color = '#ff6b6b';
            errorElement.style.fontSize = '0.85em';
            errorElement.style.marginTop = '5px';
            errorElement.style.display = 'block';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }
    
    clearFieldError(field) {
        field.style.borderColor = '#4a4a4a';
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        console.log('Form submission started');
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            // Validate form
            const isValid = this.validateForm();
            if (!isValid) {
                throw new Error('Please fix the form errors and try again.');
            }
            
            // Gather form data
            const formData = this.gatherFormData();
            console.log('Form data gathered:', formData);
            
            // Submit to Google Sheets
            await this.submitToGoogleSheets(formData);
            
            // Show success message
            this.showSuccess();
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    validateForm() {
        const form = document.getElementById('add-force-form');
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    gatherFormData() {
        const form = document.getElementById('add-force-form');
        const formData = new FormData(form);
        
        // Simple data structure matching the sheet columns
        return {
            userName: formData.get('userName').trim(),
            forceName: formData.get('forceName').trim(),
            faction: formData.get('faction').trim(),
            detachment: formData.get('detachment').trim() || '', // Direct detachment field
            notes: formData.get('notes').trim() || '', // Direct notes field
            timestamp: new Date().toISOString()
        };
    }
    
    async submitToGoogleSheets(data) {
        if (!this.config.forceSheetUrl) {
            throw new Error('Google Sheets integration not configured. Please check CrusadeConfig.');
        }
        
        // Create a hidden form to submit the data
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = this.config.forceSheetUrl;
        form.target = 'force-submit-frame';
        form.style.display = 'none';
        
        // Add all data as hidden inputs
        Object.entries(data).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value || '';
            form.appendChild(input);
        });
        
        // Create a hidden iframe to capture the response
        let iframe = document.getElementById('force-submit-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.name = 'force-submit-frame';
            iframe.id = 'force-submit-frame';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }
        
        // Add the form to the page and submit it
        document.body.appendChild(form);
        
        // Return a promise that resolves when the form submission is complete
        return new Promise((resolve, reject) => {
            // Set a timeout in case something goes wrong
            const timeout = setTimeout(() => {
                reject(new Error('Form submission timeout - please try again'));
            }, 30000); // 30 second timeout
            
            // Listen for the iframe to load (indicating form submission complete)
            iframe.onload = () => {
                clearTimeout(timeout);
                
                try {
                    // Try to read the response from the iframe
                    const response = iframe.contentWindow.document.body.textContent;
                    const result = JSON.parse(response);
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Unknown error occurred'));
                    }
                } catch (error) {
                    // If we can't read the response (due to CORS), assume success
                    console.log('Could not read iframe response (likely due to CORS), assuming success');
                    resolve({
                        success: true,
                        message: 'Crusade Force created successfully'
                    });
                }
                
                // Clean up
                document.body.removeChild(form);
            };
            
            // Handle iframe errors
            iframe.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Form submission failed'));
                document.body.removeChild(form);
            };
            
            // Submit the form
            form.submit();
        });
    }
    
    setLoadingState(isLoading) {
        const submitBtn = document.getElementById('submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }
    
    showSuccess() {
        document.getElementById('add-force-form').style.display = 'none';
        document.getElementById('success-message').style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
        
        // Scroll to success message
        document.getElementById('success-message').scrollIntoView({ behavior: 'smooth' });
    }
    
    showError(message) {
        document.getElementById('error-text').textContent = message;
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('success-message').style.display = 'none';
        
        // Scroll to error message
        document.getElementById('error-message').scrollIntoView({ behavior: 'smooth' });
    }
}

// Global utility functions
function resetForm() {
    document.getElementById('add-force-form').reset();
    document.getElementById('add-force-form').style.display = 'block';
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    // Re-apply user auto-population
    addForceForm.autoPopulateUserName();
    
    // Clear any field errors
    const errorElements = document.querySelectorAll('.field-error');
    errorElements.forEach(element => element.remove());
    
    const fields = document.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.style.borderColor = '#4a4a4a';
    });
    
    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideMessages() {
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('add-force-form').style.display = 'block';
}

// Initialize the form when page loads
let addForceForm;
document.addEventListener('DOMContentLoaded', () => {
    addForceForm = new AddForceForm();
    console.log('Add Force Form page initialized');
});