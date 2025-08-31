// filename: js/add-force-form.js
// Form handler for Add Crusade Force with cache management
// 40k Crusade Campaign Tracker

class AddForceForm extends BaseForm {
    constructor() {
        super('add-force-form', {
            submitUrl: CrusadeConfig.getSheetUrl('forces'),
            successMessage: 'Crusade Force created successfully!',
            errorMessage: 'Failed to create Crusade Force. Please try again.',
            redirectUrl: '../index.html'
        });
        
        this.init();
    }
    
    init() {
        console.log('Initializing Add Force Form...');
        
        // Initialize base functionality
        this.initBase();
        
        // Additional force-specific initialization if needed
        this.setupFactionChangeHandler();
    }
    
    /**
     * Setup faction change handler for dynamic detachment options
     */
    setupFactionChangeHandler() {
        const factionSelect = document.getElementById('faction');
        if (factionSelect) {
            factionSelect.addEventListener('change', (e) => {
                this.handleFactionChange(e.target.value);
            });
        }
    }
    
    /**
     * Handle faction change (placeholder for future faction-specific logic)
     */
    handleFactionChange(faction) {
        console.log('Faction selected:', faction);
        // Future: Could load faction-specific detachments here
    }
    
    /**
     * Get form instance name for onclick handlers
     */
    getFormInstanceName() {
        return 'addForceForm';
    }
    
    /**
     * Gather form data for submission
     */
    gatherFormData() {
        const formData = new FormData(this.form);
        
        return {
            userName: formData.get('userName').trim(),
            forceName: formData.get('forceName').trim(),
            faction: formData.get('faction'),
            detachment: formData.get('detachment').trim(),
            notes: formData.get('notes').trim()
        };
    }
    
    /**
     * Validate specific fields for force creation
     */
    validateSpecificField(field, value) {
        const fieldName = field.name;
        
        if (fieldName === 'forceName') {
            if (value.length < 3) {
                return {
                    isValid: false,
                    errorMessage: 'Force name must be at least 3 characters long.'
                };
            }
            if (value.length > 100) {
                return {
                    isValid: false,
                    errorMessage: 'Force name must be less than 100 characters.'
                };
            }
        }
        
        if (fieldName === 'userName') {
            if (value.length < 2) {
                return {
                    isValid: false,
                    errorMessage: 'Player name must be at least 2 characters long.'
                };
            }
        }
        
        return { isValid: true };
    }
    
    /**
     * Override form submission to handle cache clearing
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
            
            // Clear ALL caches to ensure fresh data on main page
            this.clearAllForcesRelatedCaches();
            
            // Store success message in sessionStorage to show on main page
            sessionStorage.setItem('force_created', JSON.stringify({
                forceName: formData.forceName,
                timestamp: Date.now()
            }));
            
            // Redirect immediately to main page
            window.location.href = this.config.redirectUrl + '?refresh=' + Date.now();
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
            this.setLoadingState(false);
        }
        // Note: No finally block since we're redirecting on success
    }
    
    /**
     * Clear ALL forces-related caches to ensure fresh data loads
     */
    clearAllForcesRelatedCaches() {
        console.log('Clearing ALL forces-related caches...');
        
        // Method 1: Clear using CacheManager
        if (typeof CacheManager !== 'undefined') {
            CacheManager.clear('forces');
            CacheManager.clearType('forces');
            // Also clear all caches as a nuclear option
            const clearedCount = CacheManager.clearAll();
            console.log(`Cleared ${clearedCount} CacheManager entries`);
        }
        
        // Method 2: Clear using SheetsManager if available
        if (typeof SheetsManager !== 'undefined') {
            SheetsManager.clearAllCaches();
            console.log('Cleared all SheetsManager caches');
        }
        
        // Method 3: Clear ALL localStorage items related to sheets/forces
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.includes('sheets_cache') || 
                key.includes('force') || 
                key.includes('cache_') ||
                key === 'forces_cache_global'
            )) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('Removed localStorage key:', key);
        });
        
        console.log(`Total ${keysToRemove.length} cache entries cleared from localStorage`);
    }
}

// Global utility functions
function resetForm() {
    const form = document.getElementById('add-force-form');
    if (form) {
        form.reset();
        form.style.display = 'block';
    }
    
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    if (addForceForm) {
        addForceForm.autoPopulateUserName();
    }
    
    const errorElements = document.querySelectorAll('.field-error');
    errorElements.forEach(element => element.remove());
    
    const fields = document.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.style.borderColor = '#4a4a4a';
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideMessages() {
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('add-force-form').style.display = 'block';
}

// Initialize the form when page loads
let addForceForm;
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for all modules to load
    setTimeout(() => {
        addForceForm = new AddForceForm();
        console.log('Add Force Form page initialized');
    }, 100);
});

// Make globally available
window.AddForceForm = AddForceForm;
window.addForceForm = null; // Will be set on DOMContentLoaded