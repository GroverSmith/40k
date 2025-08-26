// filename: army-list-form.js
// Army List Form - Extends BaseForm for army list submissions
// 40k Crusade Campaign Tracker

class ArmyListForm extends BaseForm {
    constructor() {
        super('army-list-form', {
            submitUrl: CrusadeConfig ? CrusadeConfig.getSheetUrl('armyLists') : '',
            successMessage: 'Army list submitted successfully!',
            errorMessage: 'Failed to submit army list',
            maxCharacters: 50000,
            minCharacters: 50
        });
        
        this.init();
    }
    
    init() {
        console.log('Army List Form initialized');
        
        // Initialize base form functionality
        this.initBase();
        
        // Load available forces for dropdown
        this.loadForceOptions();
        
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
    
    async loadForceOptions() {
        try {
            console.log('Loading force options...');
            
            const forceSheetUrl = CrusadeConfig.getSheetUrl('forces');
            if (!forceSheetUrl) {
                throw new Error('Forces sheet URL not configured');
            }
            
            console.log('Fetching forces from:', forceSheetUrl);
            const response = await fetch(forceSheetUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch force data');
            }
            
            const data = await response.json();
            const forceSelect = document.getElementById('force-name');
            
            forceSelect.innerHTML = '<option value="">Select your force...</option>';
            
            console.log('Force data received:', data);
            
            // Add each force as an option (skip header row)
            data.slice(1).forEach(row => {
                if (row[1]) { // Force name is in column 1
                    const option = document.createElement('option');
                    option.value = row[1];
                    option.textContent = row[1];
                    forceSelect.appendChild(option);
                }
            });
            
            console.log(`Loaded ${data.length - 1} force options`);
            
        } catch (error) {
            console.error('Error loading force options:', error);
            
            const forceSelect = document.getElementById('force-name');
            forceSelect.innerHTML = `
                <option value="">Select your force...</option>
                <option value="">--- Could not load forces ---</option>
            `;
            
            this.addManualForceEntry();
        }
    }
    
    addManualForceEntry() {
        const formGroup = document.querySelector('#force-name').closest('.form-group');
        const helpText = formGroup.querySelector('.help-text');
        
        helpText.innerHTML = `
            <span style="color: #ff6b6b;">Unable to load forces automatically.</span> 
            <a href="#" onclick="armyListForm.showManualEntry()" style="color: #4ecdc4;">Enter force name manually</a>
        `;
    }
    
    showManualEntry() {
        const forceSelect = document.getElementById('force-name');
        const formGroup = forceSelect.closest('.form-group');
        
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.id = 'force-name';
        textInput.name = 'forceName';
        textInput.required = true;
        textInput.placeholder = 'Enter your Crusade Force name...';
        textInput.className = forceSelect.className;
        
        forceSelect.parentNode.replaceChild(textInput, forceSelect);
        
        const helpText = formGroup.querySelector('.help-text');
        helpText.textContent = 'Enter the name of your Crusade Force.';
        
        textInput.focus();
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
        form.reset();
        form.style.display = 'block';
    }
    
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    if (armyListForm) {
        armyListForm.updateCharacterCount();
        armyListForm.autoPopulateUserName();
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