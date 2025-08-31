// filename: js/core/form-utilities.js
// Consolidated form utilities to eliminate duplication
// 40k Crusade Campaign Tracker

const FormUtilities = {
    /**
     * Setup character counter for textarea
     */
    setupCharacterCounter(textareaId, counterId, config = {}) {
        const textarea = document.getElementById(textareaId);
        const counter = document.getElementById(counterId);

        if (!textarea || !counter) {
            console.warn(`Character counter elements not found: ${textareaId}, ${counterId}`);
            return;
        }

        const maxChars = config.maxCharacters || 50000;
        const minChars = config.minCharacters || 0;

        const updateCount = () => {
            const length = textarea.value.length;
            counter.textContent = length.toLocaleString();

            // Update color based on length
            if (length > maxChars) {
                counter.style.color = 'var(--color-error)';
                counter.parentElement.style.borderColor = 'var(--color-error)';
            } else if (length < minChars) {
                counter.style.color = 'var(--color-warning)';
                counter.parentElement.style.borderColor = 'var(--color-border)';
            } else {
                counter.style.color = 'var(--color-secondary)';
                counter.parentElement.style.borderColor = 'var(--color-border)';
            }
        };

        textarea.addEventListener('input', updateCount);
        textarea.addEventListener('paste', () => setTimeout(updateCount, 10));
        updateCount(); // Initial count

        return updateCount; // Return for manual updates
    },

    /**
     * Reset form to initial state
     */
    resetForm(formId, options = {}) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Reset specific fields if provided, otherwise reset all
        if (options.fieldsToReset && Array.isArray(options.fieldsToReset)) {
            options.fieldsToReset.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = '';
            });
        } else {
            form.reset();
        }

        // Show form if hidden
        form.style.display = 'block';

        // Hide messages
        this.hideAllMessages();

        // Clear validation states
        this.clearValidationStates(form);

        // Scroll to top
        if (options.scrollToTop !== false) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Trigger any custom reset handlers
        if (options.onReset && typeof options.onReset === 'function') {
            options.onReset();
        }
    },

    /**
     * Hide all message elements
     */
    hideAllMessages() {
        const messages = document.querySelectorAll('.message, .alert, #success-message, #error-message');
        messages.forEach(msg => {
            msg.style.display = 'none';
        });
    },

    /**
     * Show success message
     */
    showSuccess(message, duration = 5000) {
        // Try multiple possible success containers
        let container = document.getElementById('success-message');
        if (!container) {
            container = document.querySelector('.message.success');
        }

        if (container) {
            const textEl = container.querySelector('p, #success-text') || container;
            if (textEl !== container) {
                textEl.textContent = message;
            }
            container.style.display = 'block';

            if (duration > 0) {
                setTimeout(() => {
                    container.style.display = 'none';
                }, duration);
            }
        } else {
            // Fallback to alert if no success container
            console.log('Success:', message);
            alert(message);
        }
    },

    /**
     * Show error message
     */
    showError(message, duration = 8000) {
        // Try multiple possible error containers
        let container = document.getElementById('error-message');
        if (!container) {
            container = document.querySelector('.message.error');
        }

        if (container) {
            const textEl = container.querySelector('#error-text, p') || container;
            if (textEl !== container) {
                textEl.textContent = message;
            }
            container.style.display = 'block';

            if (duration > 0) {
                setTimeout(() => {
                    container.style.display = 'none';
                }, duration);
            }
        } else {
            // Fallback to console if no error container
            console.error('Error:', message);
        }
    },

    /**
     * Clear all validation states from form
     */
    clearValidationStates(form) {
        // Remove error classes
        form.querySelectorAll('.has-error, .error, .has-success, .success').forEach(el => {
            el.classList.remove('has-error', 'error', 'has-success', 'success');
        });

        // Remove field error messages
        form.querySelectorAll('.field-error, .form-error').forEach(el => {
            el.remove();
        });

        // Reset border colors
        form.querySelectorAll('input, select, textarea').forEach(field => {
            field.style.borderColor = '';
        });
    },

    /**
     * Setup loading state for button
     */
    setButtonLoading(button, isLoading) {
        if (!button) return;

        const textEl = button.querySelector('.btn-text') || button;
        const loadingEl = button.querySelector('.btn-loading');

        if (isLoading) {
            button.disabled = true;
            button.classList.add('btn-loading');
            if (textEl !== button) textEl.style.display = 'none';
            if (loadingEl) loadingEl.style.display = 'inline-flex';
        } else {
            button.disabled = false;
            button.classList.remove('btn-loading');
            if (textEl !== button) textEl.style.display = 'inline-flex';
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }
};

// Make globally available
window.FormUtilities = FormUtilities;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormUtilities;
}