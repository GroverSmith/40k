// filename: army-list-form.js
// Army List Form - Handle form submission to Google Sheets API
// 40k Crusade Campaign Tracker

class ArmyListForm {
    constructor() {
        this.config = {
            // Google Sheets Configuration - Now using CrusadeConfig
            forceSheetUrl: CrusadeConfig ? CrusadeConfig.getSheetUrl('forces') : '',
            armyListSheetUrl: CrusadeConfig ? CrusadeConfig.getSheetUrl('armyLists') : '',
            
            // Form validation settings
            maxCharacters: 50000,  // Maximum characters allowed in army list text
            minCharacters: 50      // Minimum characters required
        };
        
        this.init();
    }
    
    init() {
        console.log('Army List Form initialized');
        
        // Load available forces for the dropdown
        this.loadForceOptions();
        
        // Set up form event listeners
        this.setupEventListeners();
        
        // Initialize character counter
        this.updateCharacterCount();
        
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
        const form = document.getElementById('army-list-form');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Character counter for army list text
        const armyTextArea = document.getElementById('army-list-text');
        armyTextArea.addEventListener('input', () => this.updateCharacterCount());
        armyTextArea.addEventListener('paste', () => {
            // Update character count after paste with small delay
            setTimeout(() => this.updateCharacterCount(), 10);
        });
        
        // Auto-resize textarea
        armyTextArea.addEventListener('input', () => this.autoResizeTextarea(armyTextArea));
        
        // Validate form inputs on change
        const requiredInputs = form.querySelectorAll('[required]');
        requiredInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    async loadForceOptions() {
        try {
            console.log('Loading force options...');
            
            // Get the URL from CrusadeConfig
            const forceSheetUrl = CrusadeConfig.getSheetUrl('forces');
            if (!forceSheetUrl) {
                throw new Error('Forces sheet URL not configured');
            }
            
            console.log('Fetching forces from:', forceSheetUrl);
            const response = await fetch(forceSheetUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch force data');
            }
            
            const data = await response.json();
            const forceSelect = document.getElementById('force-name');
            
            // Clear existing options except the first one
            forceSelect.innerHTML = '<option value="">Select your force...</option>';
            
            // Debug: log the data structure
            console.log('Force data received:', data);
            if (data.length > 0) {
                console.log('Headers:', data[0]);
                console.log('First data row:', data[1]);
            }
            
            // Add each force as an option (skip header row)
            // Force name is in column 1 based on the new sheet structure
            data.slice(1).forEach(row => {
                if (row[1]) { // Force name is in column 1
                    const option = document.createElement('option');
                    option.value = row[1];
                    option.textContent = row[1];
                    // Optionally show user name too: 
                    // option.textContent = `${row[1]} (${row[0]})`; // "Force Name (User Name)"
                    forceSelect.appendChild(option);
                }
            });
            
            console.log(`Loaded ${data.length - 1} force options`);
            
        } catch (error) {
            console.error('Error loading force options:', error);
            
            // Show error and provide manual entry option
            const forceSelect = document.getElementById('force-name');
            forceSelect.innerHTML = `
                <option value="">Select your force...</option>
                <option value="">--- Could not load forces ---</option>
            `;
            
            // Add a text input as fallback
            this.addManualForceEntry();
        }
    }
    
    addManualForceEntry() {
        const formGroup = document.querySelector('#force-name').closest('.form-group');
        const helpText = formGroup.querySelector('.help-text');
        
        helpText.innerHTML = `
            <span style="color: #ff6b6b;">Unable to load forces automatically.</span> 
            <a href="#" onclick="armyListForm.showManualEntry()" style="color: #4ecdc4;">Enter force name manually</a>
        `;
    }
    
    showManualEntry() {
        const forceSelect = document.getElementById('force-name');
        const formGroup = forceSelect.closest('.form-group');
        
        // Replace select with text input
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.id = 'force-name';
        textInput.name = 'forceName';
        textInput.required = true;
        textInput.placeholder = 'Enter your Crusade Force name...';
        textInput.className = forceSelect.className;
        
        forceSelect.parentNode.replaceChild(textInput, forceSelect);
        
        // Update help text
        const helpText = formGroup.querySelector('.help-text');
        helpText.textContent = 'Enter the name of your Crusade Force.';
        
        textInput.focus();
    }
    
    updateCharacterCount() {
        const textarea = document.getElementById('army-list-text');
        const counter = document.getElementById('char-count');
        const length = textarea.value.length;
        
        counter.textContent = length.toLocaleString();
        
        // Update counter color based on length
        if (length > this.config.maxCharacters) {
            counter.style.color = '#ff6b6b';
            counter.parentElement.style.borderColor = '#ff6b6b';
        } else if (length < this.config.minCharacters) {
            counter.style.color = '#ffaa00';
            counter.parentElement.style.borderColor = '#4a4a4a';
        } else {
            counter.style.color = '#4ecdc4';
            counter.parentElement.style.borderColor = '#4a4a4a';
        }
    }
    
    autoResizeTextarea(textarea) {
        // Auto-resize textarea based on content
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 300), 600);
        textarea.style.height = newHeight + 'px';
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
                    <span class="label">Submitting as:</span>
                    <strong>${user.name}</strong>
                </span>
                <a href="#" class="change-user-link" onclick="armyListForm.promptUserChange(event)">Change user</a>
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
            <a href="#" class="change-user-link" onclick="armyListForm.promptUserChange(event)">Select user</a>
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
        if (field.id === 'user-name' && value) {
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'Name must be at least 2 characters long.';
            }
        }
        
        if (field.id === 'army-list-text' && value) {
            if (value.length < this.config.minCharacters) {
                isValid = false;
                errorMessage = `Army list must be at least ${this.config.minCharacters} characters long.`;
            } else if (value.length > this.config.maxCharacters) {
                isValid = false;
                errorMessage = `Army list must be no more than ${this.config.maxCharacters.toLocaleString()} characters long.`;
            }
        }
        
        if (field.id === 'points-value' && value) {
            const points = parseInt(value);
            if (points < 0 || points > 5000) {
                isValid = false;
                errorMessage = 'Points must be between 0 and 5000.';
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
        const form = document.getElementById('army-list-form');
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
        const form = document.getElementById('army-list-form');
        const formData = new FormData(form);
        
        return {
            timestamp: new Date().toISOString(), // Auto-populated
            userName: formData.get('userName').trim(),
            forceName: formData.get('forceName').trim(),
            armyName: formData.get('armyName').trim(),
            faction: formData.get('faction').trim(),
            detachment: formData.get('detachment').trim(),
            mfmVersion: formData.get('mfmVersion').trim(),
            pointsValue: formData.get('pointsValue') || '',
            notes: formData.get('notes').trim(),
            armyListText: formData.get('armyListText').trim()
        };
    }
    
    async submitToGoogleSheets(data) {
        // Google Apps Script can be finicky with CORS, so we'll use a form submission approach
        // This bypasses CORS issues entirely
        
        if (!this.config.armyListSheetUrl) {
            throw new Error('Army Lists sheet URL not configured. Please check CrusadeConfig.');
        }
        
        // Create a hidden form to submit the data
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = this.config.armyListSheetUrl;
        form.target = 'army-list-submit-frame'; // Submit to hidden iframe
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
        let iframe = document.getElementById('army-list-submit-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.name = 'army-list-submit-frame';
            iframe.id = 'army-list-submit-frame';
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
                    // This is common with Google Apps Script
                    console.log('Could not read iframe response (likely due to CORS), assuming success');
                    resolve({
                        success: true,
                        message: 'Army list submitted successfully'
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
        document.getElementById('army-list-form').style.display = 'none';
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
    document.getElementById('army-list-form').reset();
    document.getElementById('army-list-form').style.display = 'block';
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    // Reset character counter
    armyListForm.updateCharacterCount();
    
    // Re-apply user auto-population
    armyListForm.autoPopulateUserName();
    
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
    document.getElementById('army-list-form').style.display = 'block';
}

// Initialize the form when page loads
let armyListForm;
document.addEventListener('DOMContentLoaded', () => {
    armyListForm = new ArmyListForm();
    console.log('Army List Form page initialized');
});