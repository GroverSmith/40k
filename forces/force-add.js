// filename: forces/force-add.js
// Simplified Force Form using base class
// 40k Crusade Campaign Tracker

class ForceForm extends BaseForm {
    constructor() {
        super('add-force-form', {
            submitUrl: TableDefs.forces?.url,
            successMessage: 'Force created successfully!',
            errorMessage: 'Failed to create force',
            clearCacheOnSuccess: ['forces', 'users'],
            lockUserField: true,
            redirectUrl: '../index.html',
            redirectDelay: 2000
        });

        this.init();
    }

    init() {
        // Initialize base functionality
        this.initBase();

        // Setup MFM data handling
        this.setupMFMDataHandling();
        

        // Override loading state for force-specific messaging
        this.setupForceLoadingState();
    }

    /**
     * Setup force-specific loading state
     */
    setupForceLoadingState() {
        // Store original setLoadingState method
        const originalSetLoadingState = this.setLoadingState.bind(this);
        
        // Override with force-specific implementation
        this.setLoadingState = (isLoading) => {
            // Call original method for basic functionality
            originalSetLoadingState(isLoading);
            
            // Add force-specific loading overlay
            this.toggleForceLoadingOverlay(isLoading);
        };
    }

    /**
     * Toggle force-specific loading overlay
     */
    toggleForceLoadingOverlay(isLoading) {
        let overlay = document.getElementById('force-loading-overlay');
        
        if (isLoading) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'force-loading-overlay';
                overlay.className = 'form-loading-overlay';
                overlay.innerHTML = `
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Creating your force...</p>
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

    setupMFMDataHandling() {
        const factionSelect = document.getElementById('faction');
        const detachmentSelect = document.getElementById('detachment');
        const customDetachmentGroup = document.getElementById('custom-detachment-group');
        const customDetachmentInput = document.getElementById('custom-detachment');

        if (!factionSelect || !detachmentSelect || !customDetachmentGroup || !customDetachmentInput) return;

        // Check if MFM data is available
        if (typeof window.MFM_DETACHMENTS_UPDATED === 'undefined') {
            console.warn('MFM detachments data not available. Using fallback faction list.');
            this.populateFallbackFactions();
            return;
        }

        // Populate factions from MFM data
        this.populateFactionsFromMFM();

        // Handle faction selection
        factionSelect.addEventListener('change', (e) => {
            const selectedFaction = e.target.value;
            this.populateDetachmentsForFaction(selectedFaction);
        });

        // Handle detachment selection
        detachmentSelect.addEventListener('change', (e) => {
            const selectedDetachment = e.target.value;
            if (selectedDetachment === 'custom') {
                // Show custom detachment input
                customDetachmentGroup.style.display = 'block';
                customDetachmentInput.required = true;
            } else {
                // Hide custom detachment input
                customDetachmentGroup.style.display = 'none';
                customDetachmentInput.required = false;
                customDetachmentInput.value = '';
            }
        });
    }

    populateFactionsFromMFM() {
        const factionSelect = document.getElementById('faction');
        if (!factionSelect) return;

        const mfmData = window.MFM_DETACHMENTS_UPDATED;
        if (!mfmData || !mfmData.factions) return;

        // Clear existing options except the first one
        factionSelect.innerHTML = '<option value="">Select faction...</option>';

        // Sort factions alphabetically by name
        const sortedFactions = Object.entries(mfmData.factions)
            .sort(([,a], [,b]) => a.name.localeCompare(b.name));

        sortedFactions.forEach(([factionKey, factionData]) => {
            const option = document.createElement('option');
            option.value = factionData.name;
            option.textContent = factionData.name;
            factionSelect.appendChild(option);
        });
    }

    populateDetachmentsForFaction(factionName) {
        const detachmentSelect = document.getElementById('detachment');
        const customDetachmentGroup = document.getElementById('custom-detachment-group');
        const customDetachmentInput = document.getElementById('custom-detachment');

        if (!detachmentSelect) return;

        // Clear existing options
        detachmentSelect.innerHTML = '<option value="">Select detachment...</option>';

        // Hide custom detachment input
        customDetachmentGroup.style.display = 'none';
        customDetachmentInput.required = false;
        customDetachmentInput.value = '';

        if (!factionName) return;

        const mfmData = window.MFM_DETACHMENTS_UPDATED;
        if (!mfmData || !mfmData.factions) return;

        // Find the faction by name
        const factionEntry = Object.entries(mfmData.factions)
            .find(([, factionData]) => factionData.name === factionName);

        if (!factionEntry) return;

        const [, factionData] = factionEntry;

        // Add detachments for this faction
        if (factionData.detachments) {
            Object.values(factionData.detachments).forEach(detachment => {
                const option = document.createElement('option');
                option.value = detachment.name;
                option.textContent = detachment.name;
                detachmentSelect.appendChild(option);
            });
        }

        // Add custom detachment option
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'Custom Detachment';
        detachmentSelect.appendChild(customOption);
    }

    populateFallbackFactions() {
        const factionSelect = document.getElementById('faction');
        if (!factionSelect) return;

        // Fallback faction list if MFM data is not available
        const fallbackFactions = [
            'Adepta Sororitas', 'Adeptus Custodes', 'Adeptus Mechanicus', 'Aeldari',
            'Agents of the Imperium', 'Astra Militarum', 'Blood Angels', 'Chaos Daemons',
            'Chaos Knights', 'Chaos Space Marines', 'Dark Angels', 'Death Guard',
            'Drukhari', 'Genestealer Cults', 'Grey Knights', 'Imperial Knights',
            'Leagues of Votann', 'Necrons', 'Orks', 'Space Marines', 'Space Wolves',
            'T\'au Empire', 'Thousand Sons', 'Tyranids', 'World Eaters'
        ];

        fallbackFactions.forEach(faction => {
            const option = document.createElement('option');
            option.value = faction;
            option.textContent = faction;
            factionSelect.appendChild(option);
        });
    }


    getHighestMFMVersion() {
        // Check if MFM data is available
        if (typeof window.MFM_BASE === 'undefined' || !window.MFM_BASE['mfm-versions']) {
            console.log('MFM data not available, using fallback version 3.3');
            return '3.3'; // Fallback to latest known version
        }

        const mfmVersions = window.MFM_BASE['mfm-versions'];
        const versions = Object.keys(mfmVersions).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        
        const highestVersion = versions.length > 0 ? versions[versions.length - 1] : '3.3';
        console.log('Using highest MFM version:', highestVersion);
        return highestVersion;
    }


    validateSpecificField(field, value) {
        // Force name validation
        if (field.id === 'force-name' && value) {
            if (value.length < 3) {
                return {
                    isValid: false,
                    errorMessage: 'Force name must be at least 3 characters.'
                };
            }
            if (value.length > 50) {
                return {
                    isValid: false,
                    errorMessage: 'Force name must be no more than 50 characters.'
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

        // Generate force key using current user name
        const forceKey = KeyUtils.generateForceKey(
            formData.forceName,
            currentUser.name
        );

        // Handle custom detachment
        let detachmentValue = formData.detachment || '';
        if (detachmentValue === 'custom') {
            const customDetachmentInput = document.getElementById('custom-detachment');
            if (customDetachmentInput && customDetachmentInput.value.trim()) {
                detachmentValue = customDetachmentInput.value.trim();
            } else {
                detachmentValue = '';
            }
        }

        // Map form field names to expected API field names
        return {
            key: forceKey,
            user_key: currentUser.key,           // Required by Google Apps Script
            user_name: currentUser.name,         // Get user name from current user
            force_name: formData.forceName,      // Map forceName to force_name
            faction: formData.faction,
            detachment: detachmentValue,
            supply_limit: 1000,  // Fixed default value
            mfm_version: this.getHighestMFMVersion(),  // Default to highest version
            notes: formData.notes || '',
            timestamp: formData.timestamp
        };
    }

    async clearCachesOnSuccess() {
        // Call the base form's method first
        await super.clearCachesOnSuccess();
        
        // Also manually clear forces and requisitions cache using UnifiedCache
        if (typeof UnifiedCache !== 'undefined') {
            try {
                await UnifiedCache.clearCache('forces');
            } catch (error) {
                console.warn('Failed to clear forces cache:', error);
            }
            
            try {
                await UnifiedCache.clearCache('requisitions');
            } catch (error) {
                console.warn('Failed to clear requisitions cache (may not exist yet):', error);
            }
        }
    }

    /**
     * Override handleSubmit to create initial requisition after force creation
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
            const result = await this.submitToGoogleSheets(formData);

            // Create initial requisition if force was created successfully
            if (result.success && result.key) {
                await this.createInitialRequisition(result.key);
            }

            // Clear specified caches
            await this.clearCachesOnSuccess();

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
     * Create initial requisition for the newly created force
     */
    async createInitialRequisition(forceKey) {
        try {
            // Check if RequisitionForm is available
            if (typeof RequisitionForm === 'undefined') {
                console.warn('RequisitionForm not available, skipping initial requisition creation');
                return;
            }

            // Check if the static method is available
            if (typeof RequisitionForm.createInitialForceCreationRequisition !== 'function') {
                console.warn('RequisitionForm.createInitialForceCreationRequisition not available, skipping initial requisition creation');
                return;
            }

            // Check if requisitions table is configured
            if (!TableDefs.requisitions || !TableDefs.requisitions.url) {
                console.warn('Requisitions table not configured, skipping initial requisition creation');
                return;
            }

            console.log('Creating initial requisition for force:', forceKey);
            
            // Create the initial force creation requisition
            await RequisitionForm.createInitialForceCreationRequisition(forceKey);
            
            console.log('Initial requisition created successfully');
            
        } catch (error) {
            console.error('Error creating initial requisition:', error);
            // Don't fail the force creation if requisition creation fails
            // Just log the error and continue
            // The force creation was successful, so we don't want to rollback
        }
    }
}

// Global functions for backward compatibility
function resetForm() {
    if (window.forceForm) {
        window.forceForm.reset();
    }
}

function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.forceForm = new ForceForm();
});