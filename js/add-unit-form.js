// filename: js/add-unit-form.js
// Form handling for Add Unit page
// 40k Crusade Campaign Tracker

class AddUnitForm extends BaseForm {
    constructor() {
        super('add-unit-form', {
            submitUrl: CrusadeConfig.getSheetUrl('units'),
            requiredFields: ['userName', 'forceName', 'name', 'dataSheet', 'type'],
            successMessage: 'Unit added successfully!',
            errorMessage: 'Failed to add unit. Please try again.',
            redirectUrl: '../index.html'
        });
        
        this.forceKey = null;
        this.userKey = null;
    }
    
    /**
     * Initialize the form with additional setup
     */
    init() {
        // Call base initialization
        this.initBase();
        
        // Parse URL parameters
        this.parseUrlParams();
        
        // Set up XP change handler for auto-rank calculation
        this.setupXpHandler();
        
        // Auto-populate fields from URL
        this.autoPopulateFromUrl();
        
        // Set default MFM version to latest
        this.setDefaultMfmVersion();
    }
    
    /**
     * Parse URL parameters
     */
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        this.forceKey = urlParams.get('forceKey') || '';
        this.userKey = urlParams.get('userKey') || '';
        
        // Set hidden fields
        const forceKeyField = document.getElementById('force-key');
        const userKeyField = document.getElementById('user-key');
        
        if (forceKeyField) forceKeyField.value = this.forceKey;
        if (userKeyField) userKeyField.value = this.userKey;
        
        // Auto-populate visible fields
        const forceName = urlParams.get('forceName') || '';
        const userName = urlParams.get('userName') || '';
        
        const forceNameField = document.getElementById('force-name');
        const userNameField = document.getElementById('user-name');
        
        if (forceNameField && forceName) {
            forceNameField.value = forceName;
            forceNameField.readOnly = true;
        }
        
        if (userNameField && userName) {
            userNameField.value = userName;
            userNameField.readOnly = true;
        }
    }
    
    /**
     * Set default MFM version to the latest
     */
    setDefaultMfmVersion() {
        const mfmField = document.getElementById('mfm-version');
        if (mfmField && !mfmField.value) {
            // Set to August 2025 as the latest version
            mfmField.value = '2025.08';
        }
    }
    
    /**
     * Set up XP change handler for auto-rank calculation
     */
    setupXpHandler() {
        const xpField = document.getElementById('xp');
        const rankField = document.getElementById('rank');
        
        if (xpField && rankField) {
            xpField.addEventListener('input', () => {
                // Only auto-calculate if rank is not manually set
                if (!rankField.value || rankField.value === '') {
                    const xp = parseInt(xpField.value) || 0;
                    let autoRank = '';
                    
                    if (xp >= 51) {
                        autoRank = 'Legendary';
                    } else if (xp >= 31) {
                        autoRank = 'Heroic';
                    } else if (xp >= 16) {
                        autoRank = 'Veteran';
                    } else if (xp >= 6) {
                        autoRank = 'Blooded';
                    } else {
                        autoRank = 'Battle-ready';
                    }
                    
                    // Update the placeholder to show what will be auto-calculated
                    rankField.options[0].text = `-- Auto: ${autoRank} --`;
                }
            });
        }
    }
    
    /**
     * Auto-populate fields from URL parameters
     */
    autoPopulateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // If we have a faction from the force, we could pre-select common unit types
        const faction = urlParams.get('faction');
        if (faction) {
            console.log('Force faction:', faction);
            // Could add faction-specific defaults here
        }
    }
    
    /**
     * Validate specific fields for unit form
     */
    validateSpecificField(field, value) {
        const fieldName = field.name || field.id;
        
        switch(fieldName) {
            case 'name':
                if (value.length < 2) {
                    return {
                        isValid: false,
                        errorMessage: 'Unit name must be at least 2 characters.'
                    };
                }
                if (value.length > 100) {
                    return {
                        isValid: false,
                        errorMessage: 'Unit name must be less than 100 characters.'
                    };
                }
                break;
                
            case 'dataSheet':
                if (value.length < 2) {
                    return {
                        isValid: false,
                        errorMessage: 'Data sheet name must be at least 2 characters.'
                    };
                }
                break;
                
            case 'points':
                const points = parseInt(value);
                if (value && (isNaN(points) || points < 0 || points > 9999)) {
                    return {
                        isValid: false,
                        errorMessage: 'Points must be between 0 and 9999.'
                    };
                }
                break;
                
            case 'xp':
                const xp = parseInt(value);
                if (value && (isNaN(xp) || xp < 0)) {
                    return {
                        isValid: false,
                        errorMessage: 'XP must be 0 or greater.'
                    };
                }
                break;
        }
        
        return { isValid: true };
    }
    
    /**
     * Gather form data for submission
     */
    gatherFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            // Trim string values
            data[key] = typeof value === 'string' ? value.trim() : value;
        }
        
        // Ensure required hidden fields are included
        if (!data.userKey) {
            data.userKey = this.userKey || '';
        }
        if (!data.forceKey) {
            data.forceKey = this.forceKey || '';
        }
        
        // If rank is empty and XP is provided, it will be auto-calculated server-side
        if (!data.rank && data.xp) {
            console.log('Rank will be auto-calculated from XP:', data.xp);
        }
        
        // Convert numeric fields
        const numericFields = ['points', 'crusadePoints', 'battleCount', 'xp', 'killCount', 'timesKilled'];
        numericFields.forEach(field => {
            if (data[field]) {
                data[field] = parseInt(data[field]) || 0;
            }
        });
        
        console.log('Unit form data prepared:', data);
        return data;
    }
    
    /**
     * Override submit success to show unit-specific success message
     */
    showSuccess() {
        super.showSuccess();
        
        // Update success message with unit name if available
        const unitName = document.getElementById('unit-name').value;
        const successText = document.querySelector('#success-message p');
        if (successText && unitName) {
            successText.textContent = `${unitName} has been added to your force roster.`;
        }
        
        // Update the "Back" button to go to the force page if we have a force key
        if (this.forceKey) {
            const backBtn = document.querySelector('#success-message .btn-secondary');
            if (backBtn) {
                backBtn.href = `../forces/force-details.html?key=${encodeURIComponent(this.forceKey)}`;
                backBtn.textContent = 'Back to Force';
            }
        }
    }
    
    /**
     * Get form instance name for onclick handlers
     */
    getFormInstanceName() {
        return 'unitForm';
    }
}

// Initialize form when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.unitForm = new AddUnitForm();
    window.unitForm.init();
    console.log('Add Unit form initialized');
});