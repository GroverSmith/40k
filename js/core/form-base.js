// filename: form-base.js
// Base form functionality shared across all forms
// 40k Crusade Campaign Tracker

class BaseForm {
    constructor(formId, config = {}) {
        this.formId = formId;
        this.form = document.getElementById(formId);
        this.config = {
            submitUrl: '',
            requiredFields: [],
            successMessage: 'Form submitted successfully!',
            errorMessage: 'Submission failed. Please try again.',
            redirectUrl: '../index.html',
            ...config
        };
        
        this.userChangeListenerAdded = false;
        this.isSubmitting = false;
    }
    
    /**
     * Initialize base form functionality
     */
    initBase() {
        if (!this.form) {
            console.error(`Form with ID '${this.formId}' not found`);
            return;
        }
        
        // Set up form submission handler
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Set up field validation
        this.setupFieldValidation();
        
        // Auto-resize textareas
        this.setupTextareaAutoResize();
        
        // Wait for UserManager and auto-populate
        this.waitForUserManager();
    }
    
    /**
     * Wait for UserManager to be available
     */
    waitForUserManager() {
        if (typeof UserManager !== 'undefined') {
            setTimeout(() => {
                this.autoPopulateUserName();
            }, 200);
        } else {
            setTimeout(() => {
                this.waitForUserManager();
            }, 100);
        }
    }
    
    /**
     * Auto-populate user name field
     */
    autoPopulateUserName() {
        const userNameField = document.getElementById('user-name');
        if (!userNameField) return;
        
        if (typeof UserManager === 'undefined') {
            console.log('UserManager not available yet');
            return;
        }
        
        const currentUser = UserManager.getCurrentUser();
        
        if (currentUser) {
            userNameField.value = currentUser.name;
            userNameField.readOnly = true;
            userNameField.style.display = 'none';
            userNameField.required = true;
            
            this.addUserFieldIndicator(currentUser);
            console.log('Auto-populated user name:', currentUser.name);
        } else {
            userNameField.style.display = '';
            userNameField.readOnly = false;
            userNameField.placeholder = 'Enter your name or select a user from top right';
            userNameField.title = 'Select a user from the dropdown in the top right for auto-population';
            
            this.addNoUserWarning();
        }
        
        // Listen for user changes
        if (!this.userChangeListenerAdded) {
            window.addEventListener('userChanged', (event) => {
                this.handleUserChange(event.detail.user);
            });
            this.userChangeListenerAdded = true;
        }
    }
    
    /**
     * Add user field indicator
     */
    addUserFieldIndicator(user) {
        const existingIndicator = document.querySelector('.user-field-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const formGroup = document.querySelector('#user-name').closest('.form-group');
        if (!formGroup) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'user-field-indicator selected';
        indicator.innerHTML = `
            <div class="user-display">
                <span class="indicator-icon">👤</span>
                <span class="indicator-text">
                    <span class="label">Submitting as:</span>
                    <strong>${user.name}</strong>
                </span>
                <a href="#" class="change-user-link" onclick="${this.getFormInstanceName()}.promptUserChange(event)">Change user</a>
            </div>
        `;
        
        const userNameField = document.getElementById('user-name');
        userNameField.parentNode.insertBefore(indicator, userNameField.nextSibling);
    }
    
    /**
     * Add no user warning
     */
    addNoUserWarning() {
        const existingWarning = document.querySelector('.user-field-indicator');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        const formGroup = document.querySelector('#user-name').closest('.form-group');
        if (!formGroup) return;
        
        const warning = document.createElement('div');
        warning.className = 'user-field-indicator warning';
        warning.innerHTML = `
            <span class="indicator-icon">⚠️</span>
            <span class="indicator-text">No user selected</span>
            <a href="#" class="change-user-link" onclick="${this.getFormInstanceName()}.promptUserChange(event)">Select user</a>
        `;
        
        const userNameField = document.getElementById('user-name');
        userNameField.parentNode.insertBefore(warning, userNameField.nextSibling);
    }
    
    /**
     * Handle user change
     */
    handleUserChange(user) {
        const userNameField = document.getElementById('user-name');
        if (!userNameField) return;
        
        if (user) {
            userNameField.value = user.name;
            userNameField.readOnly = true;
            userNameField.style.display = 'none';
            
            this.addUserFieldIndicator(user);
            this.clearFieldError(userNameField);
        } else {
            userNameField.value = '';
            userNameField.style.display = '';
            userNameField.readOnly = false;
            userNameField.placeholder = 'Enter your name or select a user from top right';
            
            this.addNoUserWarning();
        }
    }
    
    /**
     * Prompt user change
     */
    promptUserChange(event) {
        event.preventDefault();
        
        if (typeof UserManager !== 'undefined') {
            const dropdownTrigger = document.getElementById('user-dropdown-trigger');
            if (dropdownTrigger) {
                dropdownTrigger.click();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                this.showTooltip('Select a user from the dropdown above ↗️');
            } else if (UserManager.showCreateUserModal) {
                UserManager.showCreateUserModal();
            }
        }
    }
    
    /**
     * Setup field validation
     */
    setupFieldValidation() {
        const requiredInputs = this.form.querySelectorAll('[required]');
        requiredInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    /**
     * Setup textarea auto-resize
     */
    setupTextareaAutoResize() {
        const textareas = this.form.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));
        });
    }
    
    /**
     * Auto-resize textarea
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 600);
        textarea.style.height = newHeight + 'px';
    }
    
    /**
     * Validate field
     */
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        this.clearFieldError(field);
        
        if (field.required && !value) {
            isValid = false;
            errorMessage = 'This field is required.';
        }
        
        // Call child class validation if it exists
        if (this.validateSpecificField) {
            const specificValidation = this.validateSpecificField(field, value);
            if (!specificValidation.isValid) {
                isValid = false;
                errorMessage = specificValidation.errorMessage;
            }
        }
        
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }
    
    /**
     * Show field error
     */
    showFieldError(field, message) {
        field.style.borderColor = '#ff6b6b';
        
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
    
    /**
     * Clear field error
     */
    clearFieldError(field) {
        field.style.borderColor = '#4a4a4a';
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    /**
     * Handle form submission
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) {
            console.log('Already submitting, please wait');
            return;
        }
        
        console.log('Form submission started');
        this.setLoadingState(true);
        
        try {
            const isValid = this.validateForm();
            if (!isValid) {
                throw new Error('Please fix the form errors and try again.');
            }
            
            const formData = this.gatherFormData();
            console.log('Form data gathered:', formData);
            
            await this.submitToGoogleSheets(formData);
            
            this.showSuccess();
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    /**
     * Validate entire form
     */
    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * Submit to Google Sheets via hidden form
     */
    async submitToGoogleSheets(data) {
        if (!this.config.submitUrl) {
            throw new Error('Submit URL not configured');
        }
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = this.config.submitUrl;
        form.target = `${this.formId}-submit-frame`;
        form.style.display = 'none';
        
        Object.entries(data).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value || '';
            form.appendChild(input);
        });
        
        let iframe = document.getElementById(`${this.formId}-submit-frame`);
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.name = `${this.formId}-submit-frame`;
            iframe.id = `${this.formId}-submit-frame`;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }
        
        document.body.appendChild(form);
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Form submission timeout - please try again'));
            }, 30000);
            
            iframe.onload = () => {
                clearTimeout(timeout);
                
                try {
                    const response = iframe.contentWindow.document.body.textContent;
                    const result = JSON.parse(response);
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Unknown error occurred'));
                    }
                } catch (error) {
                    console.log('Could not read iframe response (likely due to CORS), assuming success');
                    resolve({ success: true });
                }
                
                document.body.removeChild(form);
            };
            
            iframe.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Form submission failed'));
                document.body.removeChild(form);
            };
            
            form.submit();
        });
    }
    
    /**
     * Set loading state
     */
    setLoadingState(isLoading) {
        this.isSubmitting = isLoading;
        const submitBtn = document.getElementById('submit-btn');
        if (!submitBtn) return;
        
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (isLoading) {
            submitBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'flex';
        } else {
            submitBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }
    
    /**
     * Show success message
     */
    showSuccess() {
        if (this.form) this.form.style.display = 'none';
        const successEl = document.getElementById('success-message');
        const errorEl = document.getElementById('error-message');
        
        if (successEl) successEl.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const errorTextEl = document.getElementById('error-text');
        const errorEl = document.getElementById('error-message');
        const successEl = document.getElementById('success-message');
        
        if (errorTextEl) errorTextEl.textContent = message;
        if (errorEl) errorEl.style.display = 'block';
        if (successEl) successEl.style.display = 'none';
        if (errorEl) errorEl.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Show tooltip
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
    
    /**
     * Get form instance name for onclick handlers
     * Override this in child classes
     */
    getFormInstanceName() {
        return 'formInstance';
    }
    
    /**
     * Gather form data - override in child classes
     */
    gatherFormData() {
        throw new Error('gatherFormData must be implemented in child class');
    }
}

// Make globally available
window.BaseForm = BaseForm;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseForm;
}

console.log('BaseForm module loaded');