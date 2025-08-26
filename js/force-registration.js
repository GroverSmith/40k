// filename: force-registration.js
// Force registration modal and logic for Crusade Details
// 40k Crusade Campaign Tracker

const ForceRegistration = {
    crusadeData: null,
    
    /**
     * Initialize force registration
     */
    init(crusadeData) {
        this.crusadeData = crusadeData;
        this.setupEventHandlers();
    },
    
    /**
     * Setup event handlers for registration
     */
    setupEventHandlers() {
        const registerBtn = document.getElementById('register-force-btn');
        const form = document.getElementById('register-force-form');
        
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.showRegisterModal();
            });
        }
        
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForceRegistration();
            });
        }
        
        // Close modal on overlay click
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('register-force-modal');
            if (event.target === modal) {
                this.closeRegisterModal();
            }
        });
    },
    
    /**
     * Show registration modal
     */
    async showRegisterModal() {
        const modal = document.getElementById('register-force-modal');
        const forceSelect = document.getElementById('force-select');
        
        // Show modal immediately with loading state
        forceSelect.innerHTML = '<option value="">Loading forces...</option>';
        modal.style.display = 'flex';
        
        try {
            const data = await CrusadeData.loadAvailableForces();
            
            // Clear and populate select
            forceSelect.innerHTML = '<option value="">Select a force...</option>';
            
            // Add force options (skip header row)
            data.slice(1).forEach(row => {
                if (row[0] && row[1]) { // userName and forceName
                    const forceKey = KeyUtils.createForceKey(row[1], row[0], row[5]);
                    const displayName = `${row[1]} (${row[0]})${row[2] ? ` - ${row[2]}` : ''}`;
                    
                    const option = document.createElement('option');
                    option.value = forceKey;
                    option.textContent = displayName;
                    option.setAttribute('data-force-name', row[1]);
                    option.setAttribute('data-user-name', row[0]);
                    forceSelect.appendChild(option);
                }
            });
            
        } catch (error) {
            console.error('Error loading forces:', error);
            this.showRegisterError('Failed to load available forces: ' + error.message);
        }
    },
    
    /**
     * Handle force registration submission
     */
    async handleForceRegistration() {
        const form = document.getElementById('register-force-form');
        const submitBtn = document.getElementById('register-submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            
            const formData = new FormData(form);
            const forceKey = formData.get('forceKey');
            
            if (!forceKey) {
                throw new Error('Please select a force');
            }
            
            // Get force details from selected option
            const forceSelect = document.getElementById('force-select');
            const selectedOption = forceSelect.options[forceSelect.selectedIndex];
            const forceName = selectedOption.getAttribute('data-force-name') || KeyUtils.getForceNameFromKey(forceKey);
            const userName = selectedOption.getAttribute('data-user-name') || KeyUtils.getUserNameFromKey(forceKey);
            
            // Prepare registration data
            const registrationData = {
                crusadeName: this.crusadeData['Crusade Name'],
                crusadeForceKey: forceKey,
                forceName: forceName,
                userName: userName
            };
            
            // Submit registration
            await CrusadeData.registerForce(registrationData);
            
            // Success
            this.showRegisterSuccess();
            this.closeRegisterModal();
            
            // Reload participating forces
            if (typeof loadParticipatingForces === 'function') {
                loadParticipatingForces();
            }
            
        } catch (error) {
            console.error('Error registering force:', error);
            this.showRegisterError(error.message);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    },
    
    /**
     * Close registration modal
     */
    closeRegisterModal() {
        const modal = document.getElementById('register-force-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Show success message
     */
    showRegisterSuccess() {
        const message = document.getElementById('register-success-message');
        if (message) {
            message.style.display = 'block';
            
            setTimeout(() => {
                message.style.display = 'none';
            }, 5000);
        }
    },
    
    /**
     * Show error message
     */
    showRegisterError(errorText) {
        const message = document.getElementById('register-error-message');
        const errorTextEl = document.getElementById('register-error-text');
        
        if (errorTextEl) {
            errorTextEl.textContent = errorText;
        }
        
        if (message) {
            message.style.display = 'block';
            
            setTimeout(() => {
                message.style.display = 'none';
            }, 8000);
        }
    }
};

// Global function for modal control (for onclick handlers)
function closeRegisterModal() {
    ForceRegistration.closeRegisterModal();
}

// Make globally available
window.ForceRegistration = ForceRegistration;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceRegistration;
}

console.log('ForceRegistration module loaded');