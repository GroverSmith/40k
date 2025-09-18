// filename: units/unit-form-utils.js
// Shared utilities for unit forms (add and edit)

class UnitFormUtilities {
    /**
     * Setup MFM integration for unit forms
     */
    static async setupMFMIntegration(form, faction) {
        // Set the current faction for the form
        this.setCurrentFaction(faction);
        
        const presetRadio = CoreUtils.dom.getElement('mfm-preset');
        const customRadio = CoreUtils.dom.getElement('mfm-custom');
        const presetContainer = CoreUtils.dom.getElement('mfm-preset-container');
        const customContainer = CoreUtils.dom.getElement('mfm-custom-container');

        // Setup version selector if available (with retry mechanism)
        this.setupVersionSelector();
        
        // Retry setup if MFM data wasn't ready initially
        if (typeof window.MFM_BASE === 'undefined' || typeof window.MFM_UNITS_UPDATED === 'undefined') {
            setTimeout(() => {
                this.setupVersionSelector();
            }, 100);
            
            // Additional retry after a longer delay
            setTimeout(() => {
                this.setupVersionSelector();
            }, 500);
        }

        if (presetRadio && customRadio && presetContainer && customContainer) {
            presetRadio.addEventListener('change', () => {
                if (presetRadio.checked) {
                    CoreUtils.dom.show(presetContainer);
                    CoreUtils.dom.hide(customContainer);
                    this.switchToDropdownMode();
                    this.hideUnitTypeField();
                    this.hidePointsField();
                    this.loadMFMData(faction, this.getSelectedVersion());
                }
            });

            customRadio.addEventListener('change', () => {
                if (customRadio.checked) {
                    CoreUtils.dom.hide(presetContainer);
                    CoreUtils.dom.show(customContainer);
                    this.switchToTextInputMode();
                    this.showUnitTypeField();
                    this.showPointsField();
                    // Clear unit type when switching to custom mode
                    const unitTypeField = CoreUtils.dom.getElement('unit-type');
                    if (unitTypeField) {
                        unitTypeField.value = '';
                    }
                }
            });
        }

        // Load MFM data on page load if preset is selected
        if (presetRadio && presetRadio.checked) {
            this.hideUnitTypeField();
            this.hidePointsField();
            this.loadMFMData(faction, this.getSelectedVersion());
        } else {
            this.showUnitTypeField();
            this.showPointsField();
        }
    }

    /**
     * Setup version selector dropdown
     */
    static setupVersionSelector() {
        const versionSelect = CoreUtils.dom.getElement('mfm-version-preset');
        if (!versionSelect) {
            console.warn('Version selector element not found');
            return;
        }
        
        if (typeof window.MFM_BASE === 'undefined' || typeof window.MFM_UNITS_UPDATED === 'undefined') {
            console.warn('MFM_BASE or MFM_UNITS_UPDATED not available, keeping static options');
            return;
        }

        console.log('Setting up dynamic version selector');
        
        // Clear existing options
        versionSelect.innerHTML = '';

        // Populate with available versions from MFM_BASE
        const mfmVersions = window.MFM_BASE['mfm-versions'];
        const versions = Object.keys(mfmVersions).map(versionKey => {
            const versionData = mfmVersions[versionKey];
            return {
                value: versionKey,
                displayName: `MFM ${versionKey} (${versionData.date})`
            };
        }).sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
        
        console.log('Available versions from MFM_BASE:', versions);
        console.log('Defaulting to highest version:', versions.length > 0 ? versions[versions.length - 1].value : 'none');
        
        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version.value;
            option.textContent = version.displayName;
            versionSelect.appendChild(option);
        });
        
        // Set default selection to the highest available version
        if (versions.length > 0) {
            versionSelect.value = versions[versions.length - 1].value;
        }

        // Add change listener
        versionSelect.addEventListener('change', () => {
            const presetRadio = CoreUtils.dom.getElement('mfm-preset');
            if (presetRadio && presetRadio.checked) {
                // Reload data with new version - faction will be passed from the calling context
                // We'll trigger a custom event that the calling code can listen to
                const event = new CustomEvent('mfmVersionChanged', {
                    detail: { version: this.getSelectedVersion() }
                });
                document.dispatchEvent(event);
            }
        });
    }

    /**
     * Get currently selected version
     */
    static getSelectedVersion() {
        const versionSelect = CoreUtils.dom.getElement('mfm-version-preset');
        if (versionSelect && versionSelect.value) {
            return versionSelect.value;
        }
        
        // Fallback: try to get the highest available version from MFM_BASE
        if (typeof window.MFM_BASE !== 'undefined' && window.MFM_BASE['mfm-versions']) {
            const versions = Object.keys(window.MFM_BASE['mfm-versions'])
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            return versions.length > 0 ? versions[versions.length - 1] : '3.2';
        }
        
        return '3.2'; // Ultimate fallback
    }

    /**
     * Get current faction (helper method)
     */
    static getCurrentFaction() {
        // Try to get faction from the current form context
        // This is a simplified approach - the faction should be passed explicitly in most cases
        return this.currentFaction || null;
    }

    /**
     * Set current faction for the form
     */
    static setCurrentFaction(faction) {
        this.currentFaction = faction;
    }

    /**
     * Load MFM data and populate data sheet options
     */
    static async loadMFMData(faction, version = '3.2') {
        const dataSheetField = CoreUtils.dom.getElement('data-sheet');
        if (dataSheetField && dataSheetField.tagName === 'SELECT') {
            dataSheetField.innerHTML = '<option value="">-- Loading MFM data... --</option>';
            dataSheetField.disabled = true;
        }

        try {
            // Use the new MFM units data structure
            if (typeof window.MFM_UNITS_UPDATED !== 'undefined') {
                this.mfmData = window.MFM_UNITS_UPDATED;
                // Set for backward compatibility
                window.EMBEDDED_MFM_DATA = this.mfmData;
                this.populateDataSheetOptions(faction, version);
            } else {
                throw new Error('MFM units data not available');
            }
        } catch (error) {
            console.error('Error loading MFM data:', error);
            if (dataSheetField && dataSheetField.tagName === 'SELECT') {
                dataSheetField.innerHTML = '<option value="">-- Error loading MFM data --</option>';
                dataSheetField.disabled = false;
            }
            FormUtilities.showError('Failed to load MFM data. Please try again or use custom version.');
        }
    }

    /**
     * Populate data sheet options from MFM data
     */
    static populateDataSheetOptions(faction, version = '3.2') {
        if (!this.mfmData || !faction) {
            return;
        }

        const dataSheetField = CoreUtils.dom.getElement('data-sheet');
        if (!dataSheetField || dataSheetField.tagName !== 'SELECT') {
            return;
        }

        // Clear existing options except the first one
        dataSheetField.innerHTML = '<option value="">-- Select Data Sheet --</option>';
        dataSheetField.disabled = false;

        // Find the faction in MFM data
        const factionKey = faction.toUpperCase();
        const factionData = this.mfmData.factions[factionKey];

        if (!factionData) {
            console.warn(`Faction "${factionKey}" not found in MFM data`);
            dataSheetField.innerHTML = '<option value="">-- Faction not found in MFM data --</option>';
            return;
        }

        // Populate with units from the faction
        const units = Object.keys(factionData.units).sort();
        units.forEach(unitName => {
            const unit = factionData.units[unitName];
            const option = document.createElement('option');
            option.value = unitName;
            
            // Create point cost display using version-specific points
            let pointCosts = '';
            if (unit.variants && unit.variants.length > 0) {
                // Get unique point costs for the selected version and sort them
                const pointsKey = `mfm_${version.replace('.', '_')}_points`;
                const uniquePoints = [...new Set(unit.variants.map(v => v[pointsKey]).filter(p => p !== undefined))].sort((a, b) => a - b);
                if (uniquePoints.length > 0) {
                    pointCosts = ` (${uniquePoints.join(', ')} pts)`;
                }
            }
            
            option.textContent = unitName + pointCosts;
            dataSheetField.appendChild(option);
        });

        // Add change listener to handle data sheet selection
        dataSheetField.addEventListener('change', (e) => {
            this.handleDataSheetSelection(e.target.value, faction, version);
            this.updateUnitTypeFromMFM(e.target.value, faction);
        });

        // Setup searchable dropdown functionality
        this.setupSearchableDropdown(dataSheetField, units);
    }

    /**
     * Setup searchable dropdown functionality
     */
    static setupSearchableDropdown(selectElement, allOptions) {
        const container = selectElement.closest('.searchable-dropdown-container');
        const searchInput = CoreUtils.dom.getElement('data-sheet-search');
        
        if (!container || !searchInput || !allOptions || allOptions.length < 10) {
            // Don't show search for small lists
            return;
        }

        // Show search input for large lists
        container.classList.add('show-search');
        
        // Store original options data (not elements)
        const originalOptions = Array.from(selectElement.options).slice(1).map(option => ({
            value: option.value,
            text: option.textContent
        }));

        // Add search input event listeners
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            // Clear current options except the first one
            selectElement.innerHTML = '<option value="">-- Select Data Sheet --</option>';
            
            if (searchTerm === '') {
                // Show all options
                originalOptions.forEach(option => {
                    const newOption = document.createElement('option');
                    newOption.value = option.value;
                    newOption.textContent = option.text;
                    selectElement.appendChild(newOption);
                });
            } else {
                // Filter options based on search term
                const filteredOptions = originalOptions.filter(option => 
                    option.text.toLowerCase().includes(searchTerm)
                );
                
                filteredOptions.forEach(option => {
                    const newOption = document.createElement('option');
                    newOption.value = option.value;
                    newOption.textContent = option.text;
                    selectElement.appendChild(newOption);
                });
                
                // If no matches, show a message
                if (filteredOptions.length === 0) {
                    const noResultsOption = document.createElement('option');
                    noResultsOption.value = '';
                    noResultsOption.textContent = '-- No units found --';
                    noResultsOption.disabled = true;
                    selectElement.appendChild(noResultsOption);
                }
            }
            
            // Re-add the change listener to the new options
            selectElement.addEventListener('change', (e) => {
                this.handleDataSheetSelection(e.target.value, this.getCurrentFaction(), this.getSelectedVersion());
                this.updateUnitTypeFromMFM(e.target.value, this.getCurrentFaction());
            });
        });

        // Focus search input when container is clicked
        container.addEventListener('click', (e) => {
            if (e.target === selectElement || e.target === container) {
                searchInput.focus();
            }
        });
    }

    /**
     * Handle data sheet selection and show variants if available
     */
    static handleDataSheetSelection(unitName, faction, version = '3.2') {
        if (!this.mfmData || !faction || !unitName) {
            this.hideVariantDropdown();
            return;
        }

        const factionKey = faction.toUpperCase();
        const factionData = this.mfmData.factions[factionKey];
        
        if (!factionData || !factionData.units[unitName]) {
            this.hideVariantDropdown();
            return;
        }

        const unit = factionData.units[unitName];
        
        // Show variant dropdown if unit has multiple variants
        if (unit.variants.length > 1) {
            this.showVariantDropdown(unit.variants, version);
        } else {
            this.hideVariantDropdown();
            // Auto-populate points for single variant
            if (unit.variants.length === 1) {
                this.updatePointsFromVariant(unit.variants[0], version);
            }
        }
    }

    /**
     * Show variant dropdown with options
     */
    static showVariantDropdown(variants, version = '3.2') {
        const variantGroup = CoreUtils.dom.getElement('variant-group');
        const variantSelect = CoreUtils.dom.getElement('unit-variant');
        
        if (!variantGroup || !variantSelect) {
            return;
        }

        // Clear existing options
        variantSelect.innerHTML = '<option value="">-- Select Variant --</option>';
        
        // Populate with variants using version-specific points
        const pointsKey = `mfm_${version.replace('.', '_')}_points`;
        variants.forEach((variant, index) => {
            const option = document.createElement('option');
            option.value = index;
            const points = variant[pointsKey] || 'N/A';
            option.textContent = `${variant.modelCount} models - ${points} pts`;
            variantSelect.appendChild(option);
        });

        // Show the variant group
        CoreUtils.dom.show(variantGroup);
        variantSelect.required = true;

        // Add change listener for variant selection
        variantSelect.addEventListener('change', (e) => {
            const variantIndex = parseInt(e.target.value);
            if (variantIndex >= 0 && variantIndex < variants.length) {
                this.updatePointsFromVariant(variants[variantIndex], version);
            }
        });
    }

    /**
     * Hide variant dropdown
     */
    static hideVariantDropdown() {
        const variantGroup = CoreUtils.dom.getElement('variant-group');
        const variantSelect = CoreUtils.dom.getElement('unit-variant');
        
        if (variantGroup) {
            CoreUtils.dom.hide(variantGroup);
        }
        
        if (variantSelect) {
            variantSelect.required = false;
            variantSelect.innerHTML = '<option value="">-- Select Variant --</option>';
        }
    }

    /**
     * Update points field from variant data
     */
    static updatePointsFromVariant(variant, version = '3.2') {
        const pointsField = CoreUtils.dom.getElement('points');
        if (pointsField && variant) {
            const pointsKey = `mfm_${version.replace('.', '_')}_points`;
            pointsField.value = variant[pointsKey] || '';
        }
    }

    /**
     * Update unit type field from MFM data when a data sheet is selected
     */
    static updateUnitTypeFromMFM(unitName, faction) {
        if (!this.mfmData || !faction || !unitName) {
            return;
        }

        const factionKey = faction.toUpperCase();
        const factionData = this.mfmData.factions[factionKey];
        
        if (!factionData || !factionData.units[unitName]) {
            return;
        }

        const unit = factionData.units[unitName];
        const unitTypeField = CoreUtils.dom.getElement('unit-type');
        
        if (unitTypeField && unit.unitType) {
            unitTypeField.value = unit.unitType;
        }
    }

    /**
     * Create and insert the unit type group component
     */
    static createUnitTypeGroupComponent(containerId) {
        const container = CoreUtils.dom.getElement(containerId);
        if (!container) {
            console.warn(`Container with id '${containerId}' not found`);
            return;
        }

        // Define the unit types
        const unitTypes = [
            { value: '', text: '-- Select Type --' },
            { value: 'Epic Hero', text: 'Epic Hero' },
            { value: 'Character', text: 'Character' },
            { value: 'Battleline', text: 'Battleline' },            
            { value: 'Vehicle', text: 'Vehicle' },
            { value: 'Monster', text: 'Monster' },
            { value: 'Infantry', text: 'Infantry' },
            { value: 'Mounted', text: 'Mounted' },
            { value: 'Titanic', text: 'Titanic' },
            { value: 'Fortification', text: 'Fortification' },
            { value: 'Other', text: 'Other' }
        ];

        // Create the HTML structure
        const html = `
            <div class="form-group" id="unit-type-group" style="display: none;">
                <label for="unit-type">Unit Type</label>
                <select id="unit-type" name="type">
                    ${unitTypes.map(type => `<option value="${type.value}">${type.text}</option>`).join('')}
                </select>
                <small class="help-text">Select the unit type for custom units</small>
            </div>
        `;

        // Insert the HTML
        container.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Show unit type field
     */
    static showUnitTypeField() {
        const unitTypeGroup = CoreUtils.dom.getElement('unit-type-group');
        if (unitTypeGroup) {
            CoreUtils.dom.show(unitTypeGroup);
        }
    }

    /**
     * Hide unit type field
     */
    static hideUnitTypeField() {
        const unitTypeGroup = CoreUtils.dom.getElement('unit-type-group');
        if (unitTypeGroup) {
            CoreUtils.dom.hide(unitTypeGroup);
        }
    }

    /**
     * Show points field
     */
    static showPointsField() {
        const pointsGroup = CoreUtils.dom.getElement('points-group');
        if (pointsGroup) {
            CoreUtils.dom.show(pointsGroup);
        }
    }

    /**
     * Hide points field
     */
    static hidePointsField() {
        const pointsGroup = CoreUtils.dom.getElement('points-group');
        if (pointsGroup) {
            CoreUtils.dom.hide(pointsGroup);
        }
    }

    /**
     * Switch data sheet field to dropdown mode
     */
    static switchToDropdownMode() {
        const currentField = CoreUtils.dom.getElement('data-sheet');
        
        // Create dropdown if it doesn't exist or if current field is not a select
        if (currentField.tagName !== 'SELECT') {
            const select = document.createElement('select');
            select.id = 'data-sheet';
            select.name = 'dataSheet';
            select.required = true;
            select.innerHTML = '<option value="">-- Select Data Sheet --</option>';
            
            // Replace the current field
            currentField.parentElement.replaceChild(select, currentField);
        }
    }

    /**
     * Switch data sheet field to text input mode
     */
    static switchToTextInputMode() {
        const currentField = CoreUtils.dom.getElement('data-sheet');
        
        // Create text input if current field is a select
        if (currentField.tagName === 'SELECT') {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'data-sheet';
            input.name = 'dataSheet';
            input.required = true;
            input.placeholder = 'e.g., Space Marine Captain, Intercessor Squad, Predator Destructor';
            
            // Replace the current field
            currentField.parentElement.replaceChild(input, currentField);
        }
        
        // Hide variant dropdown when switching to custom mode
        this.hideVariantDropdown();
    }

    /**
     * Validate unit-specific fields
     */
    static validateUnitField(field, value) {
        if (field.id === 'unit-name' && value) {
            if (value.length < 2) {
                return {
                    isValid: false,
                    errorMessage: 'Unit name must be at least 2 characters.'
                };
            }
            if (value.length > 100) {
                return {
                    isValid: false,
                    errorMessage: 'Unit name must be no more than 100 characters.'
                };
            }
        }

        if (field.id === 'power-level' && value) {
            const pl = parseInt(value);
            if (pl < 1 || pl > 50) {
                return {
                    isValid: false,
                    errorMessage: 'Power level must be between 1 and 50.'
                };
            }
        }

        if (field.id === 'points-cost' && value) {
            const points = parseInt(value);
            if (points < 5 || points > 2000) {
                return {
                    isValid: false,
                    errorMessage: 'Points must be between 5 and 2000.'
                };
            }
        }

        if (field.id === 'experience-points' && value) {
            const xp = parseInt(value);
            if (xp < 0 || xp > 100) {
                return {
                    isValid: false,
                    errorMessage: 'Experience points must be between 0 and 100.'
                };
            }
        }

        return { isValid: true };
    }

    /**
     * Setup battlefield role specific fields
     */
    static setupBattlefieldRoleFields() {
        const roleSelect = CoreUtils.dom.getElement('battlefield-role');
        if (!roleSelect) return;

        const characterFields = CoreUtils.dom.getElement('character-fields');

        roleSelect.addEventListener('change', (e) => {
            const isCharacter = e.target.value === 'HQ';

            if (characterFields) {
                if (isCharacter) {
                    CoreUtils.dom.show(characterFields);
                } else {
                    CoreUtils.dom.hide(characterFields);
                    // Clear character fields
                    characterFields.querySelectorAll('input, select, textarea').forEach(field => {
                        field.value = '';
                    });
                }
            }
        });
    }
}

// Make globally available
window.UnitFormUtilities = UnitFormUtilities;
