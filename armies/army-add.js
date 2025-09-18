// filename: armies/army-add.js
// Simplified Army List Form using base class
// 40k Crusade Campaign Tracker

class ArmyListForm extends BaseForm {
    constructor() {
        super('army-list-form', {
            submitUrl: CrusadeConfig.getSheetUrl('armies'),
            successMessage: 'Army list submitted successfully!',
            errorMessage: 'Failed to submit army list',
            maxCharacters: 50000,
            minCharacters: 50,
            clearCacheOnSuccess: ['armies'],
            lockUserField: true
        });

        this.forceContext = null;
        this.entryMode = 'text'; // 'text' or 'picker'
        this.availableUnits = [];
        this.selectedUnits = [];
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

        // Setup entry mode toggle
        this.setupEntryModeToggle();

        // Load units for picker mode
        this.loadUnitsForPicker();
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
        // Skip validation for hidden fields in picker mode
        if (this.entryMode === 'picker' && (field.id === 'army-list-text' || field.id === 'points-value')) {
            return { isValid: true };
        }

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

    validateForm() {
        // Custom validation for picker mode
        if (this.entryMode === 'picker') {
            if (this.selectedUnits.length === 0) {
                FormUtilities.showError('Please select at least one unit for your army list.');
                return false;
            }
        }

        return super.validateForm();
    }

    setupEntryModeToggle() {
        const textModeRadio = CoreUtils.dom.getElement('entry-mode-text');
        const pickerModeRadio = CoreUtils.dom.getElement('entry-mode-picker');
        
        if (textModeRadio && pickerModeRadio) {
            textModeRadio.addEventListener('change', () => {
                if (textModeRadio.checked) {
                    this.switchToTextMode();
                }
            });
            
            pickerModeRadio.addEventListener('change', () => {
                if (pickerModeRadio.checked) {
                    this.switchToPickerMode();
                }
            });
        }
    }

    switchToTextMode() {
        this.entryMode = 'text';
        CoreUtils.dom.show('army-list-text-section');
        CoreUtils.dom.show('points-value-section');
        CoreUtils.dom.hide('unit-picker-section');
        
        // Make army list text required
        const armyListText = CoreUtils.dom.getElement('army-list-text');
        if (armyListText) {
            armyListText.required = true;
        }
        
        // Clear selected units when switching to text mode
        this.selectedUnits = [];
    }

    switchToPickerMode() {
        this.entryMode = 'picker';
        CoreUtils.dom.hide('army-list-text-section');
        CoreUtils.dom.hide('points-value-section');
        CoreUtils.dom.show('unit-picker-section');
        
        // Make army list text not required
        const armyListText = CoreUtils.dom.getElement('army-list-text');
        if (armyListText) {
            armyListText.required = false;
        }
        
        // Populate available units
        this.populateAvailableUnits();
    }

    async loadUnitsForPicker() {
        if (!this.forceContext.forceKey) {
            console.warn('No force key available for loading units');
            return;
        }

        // Wait for UnifiedCache to be available
        if (!window.UnifiedCache) {
            console.warn('UnifiedCache not available yet, retrying in 100ms');
            setTimeout(() => this.loadUnitsForPicker(), 100);
            return;
        }

        try {
            // Load units from the force - force refresh to ensure we get latest data
            const allUnits = await UnifiedCache.getAllRows('units', true);
            const units = allUnits.filter(unit => unit.force_key === this.forceContext.forceKey);

            this.availableUnits = units || [];
            console.log('Loaded units for picker:', this.availableUnits.length);
        } catch (error) {
            console.error('Error loading units for picker:', error);
            this.availableUnits = [];
        }
    }

    populateAvailableUnits() {
        const availableList = CoreUtils.dom.getElement('available-units-list');
        if (!availableList) return;

        availableList.innerHTML = '';

        if (this.availableUnits.length === 0) {
            availableList.innerHTML = '<div class="unit-item">No units available in this force</div>';
            return;
        }

        this.availableUnits.forEach(unit => {
            const unitItem = this.createUnitItem(unit, 'available');
            availableList.appendChild(unitItem);
        });

        // Setup search functionality
        this.setupUnitSearch();
    }

    createUnitItem(unit, type) {
        const item = document.createElement('div');
        item.className = 'unit-item';
        item.dataset.unitKey = unit.unit_key;
        item.dataset.unitName = unit.unit_name;
        item.dataset.unitPoints = unit.points || 0;
        
        item.innerHTML = `
            <div class="unit-info">
                <div class="unit-name">${unit.unit_name || 'Unnamed Unit'}</div>
                <div class="unit-details">
                    ${unit.unit_type || 'Unknown Type'} • ${unit.data_sheet || 'Custom Unit'}
                </div>
            </div>
            <div class="unit-points">${unit.points || 0}pts</div>
        `;

        // Add click handler
        item.addEventListener('click', () => {
            if (type === 'available') {
                this.selectUnit(unit);
            } else {
                this.deselectUnit(unit);
            }
        });

        return item;
    }

    selectUnit(unit) {
        // Remove from available
        const availableItem = document.querySelector(`#available-units-list [data-unit-key="${unit.unit_key}"]`);
        if (availableItem) {
            availableItem.remove();
        }

        // Add to selected
        this.selectedUnits.push(unit);
        const selectedList = CoreUtils.dom.getElement('selected-units-list');
        if (selectedList) {
            const selectedItem = this.createUnitItem(unit, 'selected');
            selectedList.appendChild(selectedItem);
        }

        this.updateSummary();
        this.updateNavigationButtons();
    }

    deselectUnit(unit) {
        // Remove from selected
        const selectedItem = document.querySelector(`#selected-units-list [data-unit-key="${unit.unit_key}"]`);
        if (selectedItem) {
            selectedItem.remove();
        }

        // Add back to available
        this.selectedUnits = this.selectedUnits.filter(u => u.unit_key !== unit.unit_key);
        const availableList = CoreUtils.dom.getElement('available-units-list');
        if (availableList) {
            const availableItem = this.createUnitItem(unit, 'available');
            availableList.appendChild(availableItem);
        }

        this.updateSummary();
        this.updateNavigationButtons();
    }

    setupUnitSearch() {
        const searchInput = CoreUtils.dom.getElement('unit-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const availableList = CoreUtils.dom.getElement('available-units-list');
            if (!availableList) return;

            const items = availableList.querySelectorAll('.unit-item');
            items.forEach(item => {
                const unitName = item.dataset.unitName.toLowerCase();
                if (unitName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    updateSummary() {
        const totalUnits = this.selectedUnits.length;
        const totalPoints = this.selectedUnits.reduce((sum, unit) => sum + (parseInt(unit.points) || 0), 0);

        const unitsCountElement = CoreUtils.dom.getElement('total-units-count');
        const pointsCountElement = CoreUtils.dom.getElement('total-points-count');
        
        if (unitsCountElement) unitsCountElement.textContent = totalUnits;
        if (pointsCountElement) pointsCountElement.textContent = totalPoints;
    }

    updateNavigationButtons() {
        const addBtn = CoreUtils.dom.getElement('add-unit-btn');
        const removeBtn = CoreUtils.dom.getElement('remove-unit-btn');
        
        // For now, buttons are controlled by individual unit selection
        // This could be enhanced for bulk operations
        if (addBtn) addBtn.disabled = true;
        if (removeBtn) removeBtn.disabled = true;
    }

    gatherFormData() {
        const formData = super.gatherFormData();

        // If in picker mode, generate army list text from selected units
        if (this.entryMode === 'picker') {
            formData.armyListText = this.generateArmyListText();
            formData.pointsValue = this.selectedUnits.reduce((sum, unit) => sum + (parseInt(unit.points) || 0), 0);
        }

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

    generateArmyListText() {
        if (this.selectedUnits.length === 0) {
            return 'No units selected';
        }

        let armyText = `Army List: ${CoreUtils.dom.getElement('army-name')?.value || 'Unnamed Army'}\n`;
        armyText += `Faction: ${this.forceContext.faction}\n`;
        armyText += `Detachment: ${this.forceContext.detachment || 'Not specified'}\n`;
        armyText += `Total Points: ${this.selectedUnits.reduce((sum, unit) => sum + (parseInt(unit.points) || 0), 0)}\n\n`;
        armyText += 'Units:\n';

        this.selectedUnits.forEach((unit, index) => {
            armyText += `${index + 1}. ${unit.unit_name} (${unit.points || 0}pts)\n`;
            if (unit.unit_type) {
                armyText += `   Type: ${unit.unit_type}\n`;
            }
            if (unit.data_sheet) {
                armyText += `   Data Sheet: ${unit.data_sheet}\n`;
            }
            if (unit.wargear) {
                armyText += `   Wargear: ${unit.wargear}\n`;
            }
            armyText += '\n';
        });

        return armyText;
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