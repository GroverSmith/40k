// filename: armies/army-add.js
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
        this.forceContext = CoreUtils.url.getAllParams();
        this.forceContext.detachment = this.forceContext.detachment || '';

        if (!this.forceContext.forceKey || !this.forceContext.forceName) {
            FormUtilities.showError('No force selected. Please access this form from a force details page.');
            CoreUtils.dom.hide(this.form);
            return;
        }

        this.populateForceContext();
        this.updateNavigation();
    }

    populateForceContext() {
        const fields = ['force-key', 'force-name', 'user-name', 'faction', 'detachment'];
        fields.forEach(id => {
            const element = CoreUtils.dom.getElement(id);
            if (element) element.value = this.forceContext[id.replace('-', '')] || '';
        });

        setElementTexts({
            'display-force-name': this.forceContext.forceName,
            'display-user-name': this.forceContext.userName,
            'display-faction': this.forceContext.faction,
            'display-detachment': this.forceContext.detachment || 'Not specified',
            'force-context': `Adding army list for ${this.forceContext.forceName}`
        });
    }

    updateNavigation() {
        const forceUrl = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        ['back-button', 'back-to-force-btn'].forEach(id => {
            const element = CoreUtils.dom.getElement(id);
            if (element) element.href = forceUrl;
        });
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