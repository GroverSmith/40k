// Army List Form - Handle form submission to Google Sheets API
// 40k Crusade Campaign Tracker

class ArmyListForm {
    constructor() {
        this.config = {
            // Google Sheets Configuration
            forceSheetUrl: 'https://script.google.com/macros/s/AKfycbw81ZEFEAzOrfvOxWBHHT17kGqLrk3g-VpXuDeUbK_8YehP1dNe8FEUMf6PuDzZ4JnH/exec',
            armyListSheetUrl: 'https://script.google.com/macros/s/AKfycbyDp0u1_BAGU3oaxQrmzTfgvkAV-OnTzBojrEj0dbh01wWO8XK_67C9HlyNhImYmZiC/exec', // You'll need to create a Google Apps Script for army lists
            
            // Form validation settings
            maxCharacters: 50000,  // Maximum characters allowed in army list text
            minCharacters: 50      // Minimum characters required
        };
        
        this.init();
    }
    
    init() {
        console.log('Army List Form initialized');
        
        // Load available forces for the dropdown
        this.loadForceOptions();
        
        // Set up form event listeners
        this.setupEventListeners();
        
        // Initialize character counter
        this.updateCharacterCount();
    }
    
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('army-list-form');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Character counter for army list text
        const armyTextArea = document.getElementById('army-list-text');
        armyTextArea.addEventListener('input', () => this.updateCharacterCount());
        armyTextArea.addEventListener('paste', () => {
            // Update character count after paste with small delay
            setTimeout(() => this.updateCharacterCount(), 10);
        });
        
        // Auto-resize textarea
        armyTextArea.addEventListener('input', () => this.autoResizeTextarea(armyTextArea));
        
        // Validate form inputs on change
        const requiredInputs = form.querySelectorAll('[required]');
        requiredInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    async loadForceOptions() {
        try {
            console.log('Loading force options...');
            const response = await fetch(this.config.forceSheetUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch force data');
            }
            
            const data = await response.json();
            const forceSelect = document.getElementById('force-name');
            
            // Clear existing options except the first one
            forceSelect.innerHTML = '<option value="">Select your force...</option>';
            
            // Add each force as an option (skip header row)
            data.slice(1).forEach(row => {
                if (row[2]) { // Force name is in column 2
                    const option = document.createElement('option');
                    option.value = row[2];
                    option.textContent = row[2];
                    forceSelect.appendChild(option);
                }
            });
            
            console.log(`Loaded ${data.length - 1} force options`);
            
        } catch (error) {
            console.error('Error loading force options:', error);
            
            // Show error and provide manual entry option
            const forceSelect = document.getElementById('force-name');
            forceSelect.innerHTML = `
                <option value="">Select your force...</option>
                <option value="">--- Could not load forces ---</option>
            `;
            
            // Add a text input as fallback
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
        
        // Replace select with text input
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.id = 'force-name';
        textInput.name = 'forceName';
        textInput.required = true;
        textInput.placeholder = 'Enter your Crusade Force name...';
        textInput.className = forceSelect.className;
        
        forceSelect.parentNode.replaceChild(textInput, forceSelect);
        
        // Update help text
        const helpText = formGroup.querySelector('.help-text');
        helpText.textContent = 'Enter the name of your Crusade Force.';
        
        textInput.focus();
    }
    
    updateCharacterCount() {
        const textarea = document.getElementById('army-list-text');
        const counter = document.getElementById('char-count');
        const length = textarea.value.length;
        
        counter.textContent = length.toLocaleString();
        
        // Update counter color based on length
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
    
    autoResizeTextarea(textarea) {
        // Auto-resize textarea based on content
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 300), 600);
        textarea.style.height = newHeight + 'px';
    }
    
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // Remove existing error styling
        this.clearFieldError(field);
        
        // Required field validation
        if (field.required && !value) {
            isValid = false;
            errorMessage = 'This field is required.';
        }
        
        // Specific field validations
        if (field.id === 'user-name' && value) {
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'Name must be at least 2 characters long.';
            }
        }
        
        if (field.id === 'army-list-text' && value) {
            if (value.length < this.config.minCharacters) {
                isValid = false;
                errorMessage = `Army list must be at least ${this.config.minCharacters} characters long.`;
            } else if (value.length > this.config.maxCharacters) {
                isValid = false;
                errorMessage = `Army list must be no more than ${this.config.maxCharacters.toLocaleString()} characters long.`;
            }
        }
        
        if (field.id === 'points-value' && value) {
            const points = parseInt(value);
            if (points < 0 || points > 5000) {
                isValid = false;
                errorMessage = 'Points must be between 0 and 5000.';
            }
        }
        
        // Show error if invalid
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        field.style.borderColor = '#ff6b6b';
        
        // Create or update error message
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('small');
            errorElement.className = 'field-error';
            errorElement.style.color = '#ff6b6b';
            errorElement.style.fontSize = '0.85em';
            errorElement.style.marginTop = '5px';
            errorElement.style.display = 'block';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }
    
    clearFieldError(field) {
        field.style.borderColor = '#4a4a4a';
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        console.log('Form submission started');
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            // Validate form
            const isValid = this.validateForm();
            if (!isValid) {
                throw new Error('Please fix the form errors and try again.');
            }
            
            // Gather form data
            const formData = this.gatherFormData();
            console.log('Form data gathered:', formData);
            
            // Submit to Google Sheets
            await this.submitToGoogleSheets(formData);
            
            // Show success message
            this.showSuccess();
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    validateForm() {
        const form = document.getElementById('army-list-form');
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    gatherFormData() {
        const form = document.getElementById('army-list-form');
        const formData = new FormData(form);
        
        return {
            timestamp: new Date().toISOString(), // Auto-populated
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
    
    async submitToGoogleSheets(data) {
        // Google Apps Script can be finicky with CORS, so we'll use a form submission approach
        // This bypasses CORS issues entirely
        
        if (!this.config.armyListSheetUrl) {
            throw new Error('Google Sheets integration not yet configured. Please set up the Apps Script endpoint.');
        }
        
        // Create a hidden form to submit the data
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = this.config.armyListSheetUrl;
        form.target = 'army-list-submit-frame'; // Submit to hidden iframe
        form.style.display = 'none';
        
        // Add all data as hidden inputs
        Object.entries(data).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value || '';
            form.appendChild(input);
        });
        
        // Create a hidden iframe to capture the response
        let iframe = document.getElementById('army-list-submit-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.name = 'army-list-submit-frame';
            iframe.id = 'army-list-submit-frame';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }
        
        // Add the form to the page and submit it
        document.body.appendChild(form);
        
        // Return a promise that resolves when the form submission is complete
        return new Promise((resolve, reject) => {
            // Set a timeout in case something goes wrong
            const timeout = setTimeout(() => {
                reject(new Error('Form submission timeout - please try again'));
            }, 30000); // 30 second timeout
            
            // Listen for the iframe to load (indicating form submission complete)
            iframe.onload = () => {
                clearTimeout(timeout);
                
                try {
                    // Try to read the response from the iframe
                    const response = iframe.contentWindow.document.body.textContent;
                    const result = JSON.parse(response);
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Unknown error occurred'));
                    }
                } catch (error) {
                    // If we can't read the response (due to CORS), assume success
                    // This is common with Google Apps Script
                    console.log('Could not read iframe response (likely due to CORS), assuming success');
                    resolve({
                        success: true,
                        message: 'Army list submitted successfully'
                    });
                }
                
                // Clean up
                document.body.removeChild(form);
            };
            
            // Handle iframe errors
            iframe.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Form submission failed'));
                document.body.removeChild(form);
            };
            
            // Submit the form
            form.submit();
        });
    }
    
    setLoadingState(isLoading) {
        const submitBtn = document.getElementById('submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }
    
    showSuccess() {
        document.getElementById('army-list-form').style.display = 'none';
        document.getElementById('success-message').style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
        
        // Scroll to success message
        document.getElementById('success-message').scrollIntoView({ behavior: 'smooth' });
    }
    
    showError(message) {
        document.getElementById('error-text').textContent = message;
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('success-message').style.display = 'none';
        
        // Scroll to error message
        document.getElementById('error-message').scrollIntoView({ behavior: 'smooth' });
    }
}

// Global utility functions
function resetForm() {
    document.getElementById('army-list-form').reset();
    document.getElementById('army-list-form').style.display = 'block';
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    // Reset character counter
    armyListForm.updateCharacterCount();
    
    // Clear any field errors
    const errorElements = document.querySelectorAll('.field-error');
    errorElements.forEach(element => element.remove());
    
    const fields = document.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.style.borderColor = '#4a4a4a';
    });
    
    // Scroll back to top
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