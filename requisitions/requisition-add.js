// filename: requisitions/requisition-add.js
// Simplified Requisition Form using base class
// 40k Crusade Campaign Tracker

class RequisitionForm extends BaseForm {
    constructor() {
        super('add-requisition-form', {
            submitUrl: TableDefs.requisitions?.url,
            successMessage: 'Requisition recorded successfully!',
            errorMessage: 'Failed to record requisition',
            clearCacheOnSuccess: ['requisitions'],
            lockUserField: true,
            redirectUrl: '../index.html',
            redirectDelay: 2000
        });

        this.init();
    }

    init() {
        // Initialize base functionality
        this.initBase();

        // Setup force selection
        this.setupForceSelection();

        // Override loading state for requisition-specific messaging
        this.setupRequisitionLoadingState();
    }

    /**
     * Setup requisition-specific loading state
     */
    setupRequisitionLoadingState() {
        // Store original setLoadingState method
        const originalSetLoadingState = this.setLoadingState.bind(this);
        
        // Override with requisition-specific implementation
        this.setLoadingState = (isLoading) => {
            // Call original method for basic functionality
            originalSetLoadingState(isLoading);
            
            // Add requisition-specific loading overlay
            this.toggleRequisitionLoadingOverlay(isLoading);
        };
    }

    /**
     * Toggle requisition-specific loading overlay
     */
    toggleRequisitionLoadingOverlay(isLoading) {
        let overlay = document.getElementById('requisition-loading-overlay');
        
        if (isLoading) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'requisition-loading-overlay';
                overlay.className = 'form-loading-overlay';
                overlay.innerHTML = `
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Recording your requisition...</p>
                    </div>
                `;
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }

    setupForceSelection() {
        const forceSelect = document.getElementById('force-key');

        if (!forceSelect) return;

        // Load available forces
        this.loadAvailableForces();
    }

    async loadAvailableForces() {
        try {
            const forces = await UnifiedCache.getAllRows('forces');
            const forceSelect = document.getElementById('force-key');
            
            if (!forceSelect) return;

            // Clear existing options except the first one
            forceSelect.innerHTML = '<option value="">Select force...</option>';

            // Sort forces by name
            const sortedForces = forces.sort((a, b) => {
                const nameA = a.force_name || a.Force Name || '';
                const nameB = b.force_name || b.Force Name || '';
                return nameA.localeCompare(nameB);
            });

            sortedForces.forEach(force => {
                const option = document.createElement('option');
                const forceKey = force.force_key || force.Key || force.key;
                const forceName = force.force_name || force.Force Name || force.ForceName || 'Unnamed Force';
                const userName = force.user_name || force.User Name || force.UserName || 'Unknown';
                
                option.value = forceKey;
                option.textContent = `${forceName} (${userName})`;
                forceSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading available forces:', error);
            const forceSelect = document.getElementById('force-key');
            if (forceSelect) {
                forceSelect.innerHTML = '<option value="">Error loading forces</option>';
            }
        }
    }

    validateSpecificField(field, value) {
        // Event name validation
        if (field.id === 'event-name' && value) {
            if (value.length < 3) {
                return {
                    isValid: false,
                    errorMessage: 'Event name must be at least 3 characters.'
                };
            }
            if (value.length > 100) {
                return {
                    isValid: false,
                    errorMessage: 'Event name must be no more than 100 characters.'
                };
            }
        }

        // RP change validation
        if (field.id === 'rp-change' && value !== '') {
            const rpChange = parseInt(value);
            if (isNaN(rpChange)) {
                return {
                    isValid: false,
                    errorMessage: 'RP change must be a valid number.'
                };
            }
            if (rpChange < -100 || rpChange > 100) {
                return {
                    isValid: false,
                    errorMessage: 'RP change must be between -100 and 100.'
                };
            }
        }

        return { isValid: true };
    }

    gatherFormData() {
        const formData = super.gatherFormData();

        // Get current user for user_key and user_name
        const currentUser = UserManager.getCurrentUser();
        if (!currentUser || !currentUser.key) {
            throw new Error('No user selected. Please select a user from the dropdown above.');
        }

        // Map form field names to expected API field names
        return {
            force_key: formData.forceKey,
            rp_change: parseInt(formData.rpChange) || 0,
            event_name: formData.eventName,
            notes: formData.notes || '',
            timestamp: formData.timestamp
        };
    }

    async clearCachesOnSuccess() {
        // Call the base form's method first
        await super.clearCachesOnSuccess();
        
        // Also manually clear requisitions cache using UnifiedCache
        if (typeof UnifiedCache !== 'undefined') {
            await UnifiedCache.clearCache('requisitions');
        }
    }
}

// Global functions for backward compatibility
function resetForm() {
    if (window.requisitionForm) {
        window.requisitionForm.reset();
    }
}

function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.requisitionForm = new RequisitionForm();
});
