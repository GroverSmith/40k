// filename: add-force-form.js
// Add Force Form - Extends BaseForm for Crusade Force creation
// 40k Crusade Campaign Tracker

class AddForceForm extends BaseForm {
    constructor() {
        super('add-force-form', {
            submitUrl: CrusadeConfig ? CrusadeConfig.getSheetUrl('forces') : '',
            successMessage: 'Crusade Force created successfully!',
            errorMessage: 'Failed to create Crusade Force',
            minNameLength: 3,
            maxNameLength: 100,
            maxNotesLength: 2000
        });
        
        this.init();
    }
    
    init() {
        console.log('Add Force Form initialized');
        
        // Initialize base form functionality
        this.initBase();
    }
    
    /**
     * Override to add specific field validation
     */
    validateSpecificField(field, value) {
        if (field.id === 'force-name' && value) {
            if (value.length < this.config.minNameLength) {
                return {
                    isValid: false,
                    errorMessage: `Force name must be at least ${this.config.minNameLength} characters long.`
                };
            } else if (value.length > this.config.maxNameLength) {
                return {
                    isValid: false,
                    errorMessage: `Force name must be no more than ${this.config.maxNameLength} characters long.`
                };
            }
        }
        
        if (field.id === 'notes' && value) {
            if (value.length > this.config.maxNotesLength) {
                return {
                    isValid: false,
                    errorMessage: `Notes must be no more than ${this.config.maxNotesLength} characters long.`
                };
            }
        }
        
        return { isValid: true };
    }
    
    /**
     * Override to gather force specific data
     */
    gatherFormData() {
        const form = document.getElementById(this.formId);
        const formData = new FormData(form);
        
        return {
            userName: formData.get('userName').trim(),
            forceName: formData.get('forceName').trim(),
            faction: formData.get('faction').trim(),
            detachment: formData.get('detachment').trim() || '',
            notes: formData.get('notes').trim() || '',
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Override to return correct instance name
     */
    getFormInstanceName() {
        return 'addForceForm';
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
    addForceForm = new AddForceForm();
    console.log('Add Force Form page initialized');
});

// Make globally available
window.AddForceForm = AddForceForm;