// filename: js/core/form-base.js
// Enhanced base form class with deduplication
// 40k Crusade Campaign Tracker

class BaseForm {
    constructor(formId, config = {}) {
        this.formId = formId;
        this.form = document.getElementById(formId);
        this.isSubmitting = false;

        this.config = {
            submitUrl: config.submitUrl || '',
            successMessage: config.successMessage || 'Form submitted successfully!',
            errorMessage: config.errorMessage || 'Submission failed. Please try again.',
            redirectUrl: config.redirectUrl || null,
            redirectDelay: config.redirectDelay || 2000,
            maxCharacters: config.maxCharacters || 50000,
            minCharacters: config.minCharacters || 0,
            validateOnBlur: config.validateOnBlur !== false,
            validateOnSubmit: config.validateOnSubmit !== false,
            scrollToError: config.scrollToError !== false,
            clearCacheOnSuccess: config.clearCacheOnSuccess || [],
            ...config
        };

        if (!this.form) {
            console.error(`Form with ID "${formId}" not found`);
            return;
        }
    }

    /**
     * Initialize base form functionality
     */
    initBase() {
        // Set up form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Set up field validation
        if (this.config.validateOnBlur) {
            this.setupFieldValidation();
        }

        // Auto-populate user name if UserManager is available
        if (window.UserManager) {
            this.autoPopulateUserName();
        }

        // Setup any character counters
        this.setupCharacterCounters();
    }

    /**
     * Setup character counters for textareas with counters
     */
    setupCharacterCounters() {
        this.form.querySelectorAll('textarea').forEach(textarea => {
            const counterId = textarea.dataset.counterId || `${textarea.id}-count`;
            const counter = document.getElementById(counterId);

            if (counter) {
                FormUtilities.setupCharacterCounter(textarea.id, counterId, {
                    maxCharacters: this.config.maxCharacters,
                    minCharacters: this.config.minCharacters
                });
            }
        });
    }

    /**
     * Auto-populate user name field
     */
    autoPopulateUserName() {
        const userField = this.form.querySelector('[name="userName"], #user-name');
        if (!userField) return;

        const currentUser = UserManager.getCurrentUser();
        if (currentUser && currentUser.name) {
            userField.value = currentUser.name;
            userField.setAttribute('title', 'Auto-populated from selected user');

            // Make read-only if specified
            if (this.config.lockUserField) {
                userField.readOnly = true;
                userField.classList.add('user-field-locked');
            }
        }
    }

    /**
     * Setup field validation
     */
    setupFieldValidation() {
        const fields = this.form.querySelectorAll('input, select, textarea');

        fields.forEach(field => {
            field.addEventListener('blur', () => {
                this.validateField(field);
            });

            // Clear error on input
            field.addEventListener('input', () => {
                this.clearFieldError(field);
            });
        });
    }

    /**
     * Validate single field
     */
    validateField(field) {
        // Skip if field is disabled or readonly
        if (field.disabled || field.readOnly) return true;

        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (field.required && !value) {
            isValid = false;
            errorMessage = 'This field is required.';
        }

        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address.';
            }
        }

        // Number validation
        if (field.type === 'number' && value) {
            const num = parseFloat(value);
            const min = parseFloat(field.min);
            const max = parseFloat(field.max);

            if (isNaN(num)) {
                isValid = false;
                errorMessage = 'Please enter a valid number.';
            } else if (!isNaN(min) && num < min) {
                isValid = false;
                errorMessage = `Value must be at least ${min}.`;
            } else if (!isNaN(max) && num > max) {
                isValid = false;
                errorMessage = `Value must be no more than ${max}.`;
            }
        }

        // Custom validation (override in subclass)
        const customValidation = this.validateSpecificField(field, value);
        if (customValidation && !customValidation.isValid) {
            isValid = false;
            errorMessage = customValidation.errorMessage;
        }

        // Display validation result
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.clearFieldError(field);
        }

        return isValid;
    }

    /**
     * Override in subclass for specific field validation
     */
    validateSpecificField(field, value) {
        return { isValid: true };
    }

    /**
     * Show field error
     */
    showFieldError(field, message) {
        // Add error class to field
        field.classList.add('error');
        field.style.borderColor = 'var(--color-error)';

        // Remove existing error message
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add error message
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error form-error';
        errorEl.textContent = message;
        errorEl.style.color = 'var(--color-error)';
        errorEl.style.fontSize = 'var(--font-sm)';
        errorEl.style.marginTop = '5px';
        field.parentElement.appendChild(errorEl);

        // Add error class to form group
        const formGroup = field.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('has-error');
        }
    }

    /**
     * Clear field error
     */
    clearFieldError(field) {
        field.classList.remove('error');
        field.style.borderColor = '';

        const errorEl = field.parentElement.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }

        const formGroup = field.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('has-error');
        }
    }

    /**
     * Validate entire form
     */
    validateForm() {
        let isValid = true;
        const fields = this.form.querySelectorAll('input, select, textarea');

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Scroll to first error
        if (!isValid && this.config.scrollToError) {
            const firstError = this.form.querySelector('.has-error, .error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return isValid;
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

        this.setLoadingState(true);

        try {
            // Validate form
            if (this.config.validateOnSubmit && !this.validateForm()) {
                throw new Error('Please fix the form errors and try again.');
            }

            // Gather form data
            const formData = this.gatherFormData();

            // Submit to Google Sheets
            await this.submitToGoogleSheets(formData);

            // Clear specified caches
            this.clearCachesOnSuccess();

            // Show success
            this.showSuccess();

            // Handle redirect or reset
            if (this.config.redirectUrl) {
                setTimeout(() => {
                    window.location.href = this.config.redirectUrl;
                }, this.config.redirectDelay);
            } else {
                this.form.style.display = 'none';
            }

        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Set loading state
     */
    setLoadingState(isLoading) {
        this.isSubmitting = isLoading;

        const submitBtn = this.form.querySelector('[type="submit"]');
        if (submitBtn) {
            FormUtilities.setButtonLoading(submitBtn, isLoading);
        }
    }

    /**
     * Submit to Google Sheets
     */
    async submitToGoogleSheets(data) {
        if (!this.config.submitUrl) {
            throw new Error('Submit URL not configured');
        }

        const response = await fetch(this.config.submitUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data).toString()
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || this.config.errorMessage);
        }

        return result;
    }

    /**
     * Gather form data (override in subclass)
     */
    gatherFormData() {
        const formData = new FormData(this.form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        // Add timestamp
        data.timestamp = new Date().toISOString();

        return data;
    }

    /**
     * Clear caches on success
     */
    clearCachesOnSuccess() {
        if (this.config.clearCacheOnSuccess && Array.isArray(this.config.clearCacheOnSuccess)) {
            this.config.clearCacheOnSuccess.forEach(cacheType => {
                if (typeof CacheManager !== 'undefined') {
                    CacheManager.clearType(cacheType);
                    console.log(`Cleared ${cacheType} cache`);
                }
            });
        }
    }

    /**
     * Show success message
     */
    showSuccess() {
        FormUtilities.showSuccess(this.config.successMessage);
    }

    /**
     * Show error message
     */
    showError(message) {
        FormUtilities.showError(message || this.config.errorMessage);
    }

    /**
     * Reset form
     */
    reset() {
        FormUtilities.resetForm(this.formId, {
            onReset: () => {
                // Trigger character counter updates
                this.setupCharacterCounters();
                // Re-populate user name
                this.autoPopulateUserName();
            }
        });
    }
}

// Make globally available
window.BaseForm = BaseForm;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseForm;
}