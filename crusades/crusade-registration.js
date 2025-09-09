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
            const data = await UnifiedCache.getAllRows('forces');
            
            // Clear and populate select
            forceSelect.innerHTML = '<option value="">Select a force...</option>';
            
            // Add force options
            data.forEach(force => {
                if (force.force_key) {
                    const forceKey = force.force_key;
                    const userName = force.user_name;
                    const forceName = force.force_name;
                    const faction = force.faction;
                    
                    const displayName = `${forceName} (${userName})${faction ? ` - ${faction}` : ''}`;
                    
                    const option = document.createElement('option');
                    option.value = forceKey;
                    option.textContent = displayName;
                    option.setAttribute('data-force-key', forceKey);
                    option.setAttribute('data-force-name', forceName);
                    option.setAttribute('data-user-name', userName);
                    option.setAttribute('data-user-key', force.user_key);
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
            const userKey = selectedOption.getAttribute('data-user-key');
            
			const crusadeKey = this.crusadeData.crusade_key || this.crusadeData.key || this.crusadeKey;
            
            // Prepare registration data with keys
            const registrationData = {
                crusadeKey: crusadeKey,
                crusadeName: this.crusadeData['crusade_name'] || this.crusadeData['Crusade Name'],
                forceKey: forceKey,
                forceName: forceName,
                userName: userName,
                userKey: userKey
            };
            
            console.log('Registering with keys:', {
                crusadeKey: crusadeKey,
                forceKey: forceKey
            });
            
            // Submit registration
            await this.registerForce(registrationData);
            
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
    },

    /**
     * Register a force for a crusade (moved from CrusadeParticipantsTable)
     */
    async registerForce(registrationData) {
        const participantsUrl = TableDefs.xref_crusade_participants?.url;
        
        if (!participantsUrl) {
            throw new Error('Participants sheet URL not configured');
        }
        
        // Submit registration
        const response = await fetch(participantsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(registrationData).toString()
        });
        
        if (!response.ok) {
            throw new Error('Failed to register force');
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Clear the participants cache using UnifiedCache
            await UnifiedCache.clearCache('xref_crusade_participants');
        }
        
        return result;
    }
};

// Make ForceRegistration available globally
window.ForceRegistration = ForceRegistration;

// Global function for modal control (for onclick handlers)
function closeRegisterModal() {
    ForceRegistration.closeRegisterModal();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceRegistration;
}

console.log('ForceRegistration module loaded with key system support');