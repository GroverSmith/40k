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

        // Only initialize if the form exists
        if (this.form) {
            this.init();
        }
    }

    // Standard requisition events with RP changes
    static get STANDARD_EVENTS() {
        return [
            { event_name: 'Initial Force Creation', rp_change: 5, max_multiplier: 1 },
            { event_name: 'Battle Fought', rp_change: 1, max_multiplier: 1 },            
            { event_name: 'Increase Supply Limit', rp_change: -1, max_multiplier: 1 },
            { event_name: 'Renowned Heroes', rp_change: -1, max_multiplier: 3 },
            { event_name: 'Rearm and Resupply', rp_change: -1, max_multiplier: 1 },
            { event_name: 'Legendary Veterans', rp_change: -3, max_multiplier: 1 },
            { event_name: 'Repair and Recuperate', rp_change: -1, max_multiplier: 5 },
            { event_name: 'Fresh Recruits', rp_change: -1, max_multiplier: 4 },
        ];
    }

    /**
     * Get a standard event by name
     * @param {string} eventName - The name of the event to find
     * @returns {Object|null} The standard event object or null if not found
     */
    static getStandardEvent(eventName) {
        return RequisitionForm.STANDARD_EVENTS.find(event => 
            event.event_name === eventName
        ) || null;
    }

    /**
     * Get all standard events with a specific RP change
     * @param {number} rpChange - The RP change to filter by
     * @returns {Array} Array of standard events with the specified RP change
     */
    static getStandardEventsByRPChange(rpChange) {
        return RequisitionForm.STANDARD_EVENTS.filter(event => 
            event.rp_change === rpChange
        );
    }

    /**
     * Get the initial force creation event
     * @returns {Object} The initial force creation event
     */
    static getInitialForceCreationEvent() {
        return RequisitionForm.STANDARD_EVENTS.find(event => 
            event.event_name === 'Initial Force Creation'
        );
    }

    /**
     * Create an initial force creation requisition
     * @param {string} forceKey - The force key to create the requisition for
     * @returns {Promise<Object>} The created requisition data
     */
    static async createInitialForceCreationRequisition(forceKey) {
        const initialEvent = RequisitionForm.getInitialForceCreationEvent();
        if (!initialEvent) {
            throw new Error('Initial force creation event not found');
        }

        const requisitionData = {
            force_key: forceKey,
            rp_change: initialEvent.rp_change,
            event_name: initialEvent.event_name,
            notes: initialEvent.description,
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch(TableDefs.requisitions?.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requisitionData)
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('Initial force creation requisition created:', result);
                return result;
            } else {
                throw new Error(result.error || 'Failed to create initial requisition');
            }
        } catch (error) {
            console.error('Error creating initial force creation requisition:', error);
            throw error;
        }
    }

    init() {
        // Initialize base functionality
        this.initBase();

        // Setup force selection
        this.setupForceSelection();

        // Setup standard events handling
        this.setupStandardEvents();

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

    setupStandardEvents() {
        const eventNameInput = document.getElementById('event-name');
        const rpChangeInput = document.getElementById('rp-change');

        if (!eventNameInput || !rpChangeInput) return;

        // Create a dropdown for standard events
        this.createStandardEventsDropdown();

        // Add event listener for standard event selection
        this.setupStandardEventHandlers();
    }

    createStandardEventsDropdown() {
        const eventNameInput = document.getElementById('event-name');
        if (!eventNameInput) return;

        // Create a container for the dropdown
        const container = eventNameInput.parentNode;
        
        // Create dropdown for standard events
        const standardEventsSelect = document.createElement('select');
        standardEventsSelect.id = 'standard-events';
        standardEventsSelect.className = 'form-control';
        standardEventsSelect.innerHTML = '<option value="">Select standard event...</option>';

        // Add standard events to dropdown
        RequisitionForm.STANDARD_EVENTS.forEach((event, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${event.event_name} (${event.rp_change > 0 ? '+' : ''}${event.rp_change} RP)`;
            standardEventsSelect.appendChild(option);
        });

        // Insert the dropdown before the event name input
        container.insertBefore(standardEventsSelect, eventNameInput);

        // Add help text
        const helpText = document.createElement('small');
        helpText.className = 'help-text';
        helpText.textContent = 'Select a standard event or enter a custom event name below.';
        container.insertBefore(helpText, eventNameInput);

        // Add label for the dropdown
        const label = document.createElement('label');
        label.setAttribute('for', 'standard-events');
        label.textContent = 'Standard Events';
        container.insertBefore(label, standardEventsSelect);
    }

    setupStandardEventHandlers() {
        const standardEventsSelect = document.getElementById('standard-events');
        const eventNameInput = document.getElementById('event-name');
        const rpChangeInput = document.getElementById('rp-change');

        if (!standardEventsSelect || !eventNameInput || !rpChangeInput) return;

        standardEventsSelect.addEventListener('change', (e) => {
            const selectedIndex = parseInt(e.target.value);
            
            if (selectedIndex >= 0 && selectedIndex < RequisitionForm.STANDARD_EVENTS.length) {
                const selectedEvent = RequisitionForm.STANDARD_EVENTS[selectedIndex];
                
                // Auto-fill the form fields
                eventNameInput.value = selectedEvent.event_name;
                rpChangeInput.value = selectedEvent.rp_change;
                
                // If it's a custom event, clear the RP change to let user specify
                if (selectedEvent.event_name === 'Custom Event') {
                    rpChangeInput.value = '';
                    rpChangeInput.focus();
                }
            } else {
                // Clear fields if no standard event selected
                eventNameInput.value = '';
                rpChangeInput.value = '';
            }
        });

        // Clear standard event selection when user types in event name
        eventNameInput.addEventListener('input', () => {
            if (eventNameInput.value && standardEventsSelect.value) {
                standardEventsSelect.value = '';
            }
        });

        // Clear standard event selection when user changes RP manually
        rpChangeInput.addEventListener('input', () => {
            if (rpChangeInput.value && standardEventsSelect.value) {
                standardEventsSelect.value = '';
            }
        });
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
                const nameA = a.force_name || a['Force Name'] || '';
                const nameB = b.force_name || b['Force Name'] || '';
                return nameA.localeCompare(nameB);
            });

            sortedForces.forEach(force => {
                const option = document.createElement('option');
                const forceKey = force.force_key || force.Key || force.key;
                const forceName = force.force_name || force['Force Name'] || force.ForceName || 'Unnamed Force';
                const userName = force.user_name || force['User Name'] || force.UserName || 'Unknown';
                
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

// Initialize only if the requisition form exists on this page
document.addEventListener('DOMContentLoaded', () => {
    const requisitionForm = document.getElementById('add-requisition-form');
    if (requisitionForm) {
        window.requisitionForm = new RequisitionForm();
    }
});
