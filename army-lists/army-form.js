// filename: army-form.js
// Simplified Army List Form using base class
// 40k Crusade Campaign Tracker

class ArmyListForm extends BaseForm {
    constructor() {
        super('army-list-form', {
            submitUrl: CrusadeConfig.getSheetUrl('armyLists'),
            successMessage: 'Army list submitted successfully!',
            errorMessage: 'Failed to submit army list',
            maxCharacters: 50000,
            minCharacters: 50,
            clearCacheOnSuccess: ['armyLists'],
            lockUserField: true
        });

        this.forceContext = null;
        this.init();
    }

    init() {
        // Load force context from URL
        this.loadForceContext();

        // Initialize base functionality
        this.initBase();

        // Setup character counter for army list text
        FormUtilities.setupCharacterCounter('army-list-text', 'char-count', {
            maxCharacters: this.config.maxCharacters,
            minCharacters: this.config.minCharacters
        });
    }

    loadForceContext() {
        const urlParams = new URLSearchParams(window.location.search);

        this.forceContext = {
            forceKey: urlParams.get('forceKey'),
            forceName: urlParams.get('forceName'),
            userName: urlParams.get('userName'),
            faction: urlParams.get('faction'),
            detachment: urlParams.get('detachment') || ''
        };

        if (!this.forceContext.forceKey || !this.forceContext.forceName) {
            FormUtilities.showError('No force selected. Please access this form from a force details page.');
            this.form.style.display = 'none';
            return;
        }

        // Populate hidden and display fields
        this.populateForceContext();

        // Update navigation
        this.updateNavigation();
    }

    populateForceContext() {
        // Set hidden fields
        document.getElementById('force-key').value = this.forceContext.forceKey;
        document.getElementById('force-name').value = this.forceContext.forceName;
        document.getElementById('user-name').value = this.forceContext.userName;
        document.getElementById('faction').value = this.forceContext.faction;
        document.getElementById('detachment').value = this.forceContext.detachment;

        // Update display
        document.getElementById('display-force-name').textContent = this.forceContext.forceName;
        document.getElementById('display-user-name').textContent = this.forceContext.userName;
        document.getElementById('display-faction').textContent = this.forceContext.faction;
        document.getElementById('display-detachment').textContent = this.forceContext.detachment || 'Not specified';

        document.getElementById('force-context').textContent =
            `Adding army list for ${this.forceContext.forceName}`;
    }

    updateNavigation() {
        const forceUrl = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;

        const backButton = document.getElementById('back-button');
        if (backButton) backButton.href = forceUrl;

        const backToForceBtn = document.getElementById('back-to-force-btn');
        if (backToForceBtn) backToForceBtn.href = forceUrl;
    }

    validateSpecificField(field, value) {
        if (field.id === 'army-list-text' && value) {
            if (value.length < this.config.minCharacters) {
                return {
                    isValid: false,
                    errorMessage: `Army list must be at least ${this.config.minCharacters} characters.`
                };
            }
            if (value.length > this.config.maxCharacters) {
                return {
                    isValid: false,
                    errorMessage: `Army list must be no more than ${this.config.maxCharacters.toLocaleString()} characters.`
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

    gatherFormData() {
        const formData = super.gatherFormData();

        // Ensure force context is included
        return {
            ...formData,
            forceKey: this.forceContext.forceKey,
            forceName: this.forceContext.forceName,
            userName: this.forceContext.userName,
            faction: this.forceContext.faction,
            detachment: this.forceContext.detachment
        };
    }
}

// Global functions for backward compatibility
function resetForm() {
    if (window.armyListForm) {
        window.armyListForm.reset();
    }
}

function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.armyListForm = new ArmyListForm();
});