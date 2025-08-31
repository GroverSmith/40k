// filename: army-list-form.js
// Army List Form - Extends BaseForm for army list submissions
// 40k Crusade Campaign Tracker - Updated to use force context from URL

class ArmyListForm extends BaseForm {
    constructor() {
        super('army-list-form', {
            submitUrl: CrusadeConfig ? CrusadeConfig.getSheetUrl('armyLists') : '',
            successMessage: 'Army list submitted successfully!',
            errorMessage: 'Failed to submit army list',
            maxCharacters: 50000,
            minCharacters: 50
        });
        
        this.forceContext = null;
        this.init();
    }
    
    init() {
        console.log('Army List Form initialized');
        
        // Get force context from URL parameters
        this.loadForceContext();
        
        // Initialize base form functionality
        this.initBase();
        
        // Set up character counter for army list text
        const armyTextArea = document.getElementById('army-list-text');
        if (armyTextArea) {
            armyTextArea.addEventListener('input', () => this.updateCharacterCount());
            armyTextArea.addEventListener('paste', () => {
                setTimeout(() => this.updateCharacterCount(), 10);
            });
            
            // Initialize character counter
            this.updateCharacterCount();
        }
    }
    
    loadForceContext() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Extract force information
        this.forceContext = {
            forceKey: urlParams.get('forceKey'),
            forceName: urlParams.get('forceName'),
            userName: urlParams.get('userName'),
            faction: urlParams.get('faction'),
            detachment: urlParams.get('detachment') || ''
        };
        
        console.log('Force context loaded:', this.forceContext);
        
        // Validate force context
        if (!this.forceContext.forceKey || !this.forceContext.forceName) {
            console.error('No force context provided');
            this.showError('No force selected. Please access this form from a force details page.');
            document.getElementById('army-list-form').style.display = 'none';
            return;
        }
        
        // Populate hidden fields
        document.getElementById('force-key').value = this.forceContext.forceKey;
        document.getElementById('force-name').value = this.forceContext.forceName;
        document.getElementById('user-name').value = this.forceContext.userName;
        document.getElementById('faction').value = this.forceContext.faction;
        document.getElementById('detachment').value = this.forceContext.detachment;
        
        // Update display fields
        document.getElementById('display-force-name').textContent = this.forceContext.forceName;
        document.getElementById('display-user-name').textContent = this.forceContext.userName;
        document.getElementById('display-faction').textContent = this.forceContext.faction;
        document.getElementById('display-detachment').textContent = this.forceContext.detachment || 'Not specified';
        
        // Update header context
        document.getElementById('force-context').textContent = 
            `Adding army list for ${this.forceContext.forceName}`;
        
        // Update back button
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.href = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        }
        
        // Update success message back button
        const backToForceBtn = document.getElementById('back-to-force-btn');
        if (backToForceBtn) {
            backToForceBtn.href = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        }
    }
    
    /**
     * Override to skip user name population since it's handled by force context
     */
    autoPopulateUserName() {
        // Skip the base class implementation
        // User name is already set from force context
        console.log('User name already set from force context:', this.forceContext?.userName);
    }
    
    updateCharacterCount() {
        const textarea = document.getElementById('army-list-text');
        const counter = document.getElementById('char-count');
        const length = textarea.value.length;
        
        counter.textContent = length.toLocaleString();
        
        if (length > this.config.maxCharacters) {
            counter.style.color = '#ff6b6b';
            counter.parentElement.style.borderColor = '#ff6b6b';
        } else if (length < this.config.minCharacters) {
            counter.style.color = '#ffaa00';
            counter.parentElement.style.borderColor = '#4a4a4a';
        } else {
            counter.style.color = '#4ecdc4';
            counter.parentElement.style.borderColor = '#4a4a4a';
        }
    }
    
    /**
     * Override to add specific field validation
     */
    validateSpecificField(field, value) {
        if (field.id === 'army-list-text' && value) {
            if (value.length < this.config.minCharacters) {
                return {
                    isValid: false,
                    errorMessage: `Army list must be at least ${this.config.minCharacters} characters long.`
                };
            } else if (value.length > this.config.maxCharacters) {
                return {
                    isValid: false,
                    errorMessage: `Army list must be no more than ${this.config.maxCharacters.toLocaleString()} characters long.`
                };
            }
        }
        
        if (field.id === 'points-value' && value) {
            const points = parseInt(value);
            if (points < 0 || points > 5000) {
                return {
                    isValid: false,
                    errorMessage: 'Points must be between 0 and 5000.'
                };
            }
        }
        
        return { isValid: true };
    }
    
    /**
     * Override to gather army list specific data
     */
    gatherFormData() {
        const form = document.getElementById(this.formId);
        const formData = new FormData(form);
        
        return {
            timestamp: new Date().toISOString(),
            forceKey: formData.get('forceKey').trim(),
            userName: formData.get('userName').trim(),
            forceName: formData.get('forceName').trim(),
            armyName: formData.get('armyName').trim(),
            faction: formData.get('faction').trim(),
            detachment: formData.get('detachment').trim(),
            mfmVersion: formData.get('mfmVersion').trim(),
            pointsValue: formData.get('pointsValue') || '',
            notes: formData.get('notes').trim(),
            armyListText: formData.get('armyListText').trim()
        };
    }
    
    /**
     * Override to return correct instance name
     */
    getFormInstanceName() {
        return 'armyListForm';
    }
}

// Global utility functions
function resetForm() {
    const form = document.getElementById('army-list-form');
    if (form) {
        // Only reset the fields that user can edit
        document.getElementById('army-name').value = '';
        document.getElementById('mfm-version').value = '';
        document.getElementById('points-value').value = '';
        document.getElementById('notes').value = '';
        document.getElementById('army-list-text').value = '';
        
        form.style.display = 'block';
    }
    
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    if (armyListForm) {
        armyListForm.updateCharacterCount();
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
    document.getElementById('army-list-form').style.display = 'block';
}

// Initialize the form when page loads
let armyListForm;
document.addEventListener('DOMContentLoaded', () => {
    armyListForm = new ArmyListForm();
    console.log('Army List Form page initialized');
});

// Make globally available
window.ArmyListForm = ArmyListForm;