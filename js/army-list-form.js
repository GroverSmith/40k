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
			
			// Get current user name
			const currentUser = UserManager.getCurrentUserName();
			console.log('Current user:', currentUser);
			
			if (!currentUser) {
				forceSelect.innerHTML += '<option value="">Please select a user first</option>';
				return;
			}
			
			// Add each force as an option (skip header row)
			// Column structure after Key addition: 0=Key, 1=User Name, 2=Force Name, 3=Faction, etc.
			let forcesFound = 0;
			data.slice(1).forEach(row => {
				const userName = row[1];  // User Name is column 1
				const forceName = row[2]; // Force Name is column 2
				const forceKey = row[0];  // Key is column 0
				
				// Only show forces belonging to current user
				if (forceName && userName && userName === currentUser) {
					const option = document.createElement('option');
					option.value = forceKey; // Use key as value for proper linking
					option.textContent = forceName;
					option.dataset.forceName = forceName; // Store force name as data attribute
					forceSelect.appendChild(option);
					forcesFound++;
				}
			});
			
			console.log(`Loaded ${forcesFound} forces for user ${currentUser}`);
			
			if (forcesFound === 0) {
				forceSelect.innerHTML += '<option value="">No forces found for your user</option>';
			}
			
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
		
		// Get the selected force option
		const forceSelect = document.getElementById('force-name');
		const selectedOption = forceSelect.options[forceSelect.selectedIndex];
		
		// Get force key and name
		const forceKey = formData.get('forceName').trim(); // This is actually the key now
		const forceName = selectedOption ? (selectedOption.dataset.forceName || selectedOption.textContent) : forceKey;
		
		return {
			timestamp: new Date().toISOString(),
			userName: formData.get('userName').trim(),
			forceKey: forceKey,  // Send the key
			forceName: forceName, // Send the actual force name
			armyName: formData.get('armyName').trim(),
			faction: formData.get('faction').trim(),
			detachment: formData.get('detachment').trim(),
			mfmVersion: formData.get('mfmVersion').trim(),
			pointsValue: formData.get('pointsValue') || '',
			notes: formData.get('notes').trim(),
			armyListText: formData.get('armyListText').trim()
		};
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