// filename: crusades/crusade-registration.js
// Force registration modal and logic for Crusade Details using Key System
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
        const registerBtn = CoreUtils.dom.getElement('register-force-btn');
        const form = CoreUtils.dom.getElement('register-force-form');
        
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
            const modal = CoreUtils.dom.getElement('register-force-modal');
            if (event.target === modal) {
                this.closeRegisterModal();
            }
        });
    },
    
    /**
     * Show registration modal
     */
    async showRegisterModal() {
        const modal = CoreUtils.dom.getElement('register-force-modal');
        const forceSelect = CoreUtils.dom.getElement('force-select');
        
        // Show modal immediately with loading state
        forceSelect.innerHTML = '<option value="">Loading forces...</option>';
        CoreUtils.dom.show(modal, 'flex');
        
        try {
            const data = await ForceTable.loadAvailableForces();
            
            // Clear and populate select
            forceSelect.innerHTML = '<option value="">Select a force...</option>';
            
            // Add force options (skip header row)
            // Use TableDefs for column mapping
            data.slice(1).forEach(row => {
                const forceKeyIndex = TableDefs.getColumnIndex('forces', 'force_key');
                const userNameIndex = TableDefs.getColumnIndex('forces', 'user_name');
                const forceNameIndex = TableDefs.getColumnIndex('forces', 'force_name');
                const factionIndex = TableDefs.getColumnIndex('forces', 'faction');
                
                if (row[forceKeyIndex]) {
                    const forceKey = row[forceKeyIndex];
                    const userName = row[userNameIndex];
                    const forceName = row[forceNameIndex];
                    const faction = row[factionIndex];
                    
                    const displayName = `${forceName} (${userName})${faction ? ` - ${faction}` : ''}`;
                    
                    const option = document.createElement('option');
                    option.value = forceKey;
                    option.textContent = displayName;
                    option.setAttribute('data-force-key', forceKey);
                    option.setAttribute('data-force-name', forceName);
                    option.setAttribute('data-user-name', userName);
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
        const form = CoreUtils.dom.getElement('register-force-form');
        const submitBtn = CoreUtils.dom.getElement('register-submit-btn');
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
            const forceSelect = CoreUtils.dom.getElement('force-select');
            const selectedOption = forceSelect.options[forceSelect.selectedIndex];
            const forceName = selectedOption.getAttribute('data-force-name');
            const userName = selectedOption.getAttribute('data-user-name');
            
            

			const crusadeKey = this.crusadeData.crusade_key || this.crusadeData.key || this.crusadeKey;
            
            // Prepare registration data with keys
            const registrationData = {
                crusadeKey: crusadeKey,
                crusadeName: this.crusadeData['crusade_name'] || this.crusadeData['Crusade Name'],
                forceKey: forceKey,
                forceName: forceName,
                userName: userName
            };
            
            console.log('Registering with keys:', {
                crusadeKey: crusadeKey,
                forceKey: forceKey
            });
            
            // Submit registration
            await CrusadeParticipantsTable.registerForce(registrationData);
            
            // Success
            this.showRegisterSuccess();
            this.closeRegisterModal();
            
            // Reload participating forces using the new table module
            if (window.CrusadeParticipantsTable && this.crusadeData) {
                const crusadeKey = this.crusadeData.crusade_key || this.crusadeData.key;
                if (crusadeKey) {
                    await CrusadeParticipantsTable.displayCrusadeParticipants('participating-forces-content', crusadeKey);
                }
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

console.log('ForceRegistration module loaded with key system support');