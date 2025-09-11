// filename: units/unit-add.js

// 40k Crusade Campaign Tracker

class UnitForm extends BaseForm {
    constructor() {
        super('add-unit-form', {
            submitUrl: TableDefs.units?.url,
            successMessage: 'Unit added successfully!',
            errorMessage: 'Failed to add unit',
            clearCacheOnSuccess: ['units'],
            redirectUrl: null // Will be set dynamically
        });

        this.forceContext = null;
        this.mfmData = null;
        this.init().catch(error => {
            console.error('Error initializing UnitForm:', error);
        });
    }

    async init() {
        // Load force context from URL
        await this.loadForceContext();

        // Initialize base functionality
        this.initBase();

        // Setup battlefield role specific fields
        this.setupBattlefieldRoleFields();


        // Setup MFM integration
        this.setupMFMIntegration();
    }

    async loadForceContext() {
        this.forceContext = CoreUtils.url.getAllParams();

        if (!this.forceContext.forceKey) {
            FormUtilities.showError('No force selected. Please access this form from a force details page.');
            CoreUtils.dom.hide(this.form);
            return;
        }

        // Load force data from cache using the forceKey
        try {
            const forceData = await UnifiedCache.getRowByKey('forces', this.forceContext.forceKey);
            if (!forceData) {
                FormUtilities.showError('Force not found. Please check the force key and try again.');
                CoreUtils.dom.hide(this.form);
                return;
            }

            // Populate force context with data from cache
            this.forceContext = {
                forceKey: this.forceContext.forceKey,
                forceName: forceData.force_name,
                userName: forceData.user_name,
                userKey: forceData.user_key,
                faction: forceData.faction
            };

            this.config.redirectUrl = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
            this.populateForceContext();
            this.updateNavigation();
        } catch (error) {
            console.error('Error loading force data:', error);
            FormUtilities.showError('Failed to load force data. Please try again.');
            CoreUtils.dom.hide(this.form);
        }
    }

    populateForceContext() {
        // Set force name display and link
        const forceNameEl = CoreUtils.dom.getElement('force-name');
        if (forceNameEl) {
            forceNameEl.textContent = this.forceContext.forceName;
            forceNameEl.href = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        }

        // Set hidden fields
        const forceKeyField = CoreUtils.dom.getElement('force-key');
        if (forceKeyField) {
            forceKeyField.value = this.forceContext.forceKey || '';
        }

        const userKeyField = CoreUtils.dom.getElement('user-key');
        if (userKeyField) {
            userKeyField.value = this.forceContext.userKey || '';
        }

        const contextEl = CoreUtils.dom.getElement('force-context');
        if (contextEl) {
            contextEl.textContent = `Adding unit to ${this.forceContext.forceName}`;
        }
    }

    updateNavigation() {
        const forceUrl = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        ['back-button', 'back-to-force-btn'].forEach(id => {
            const element = CoreUtils.dom.getElement(id);
            if (element) element.href = forceUrl;
        });
    }

    setupBattlefieldRoleFields() {
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


    setupMFMIntegration() {
        // Setup MFM mode toggle
        const presetRadio = CoreUtils.dom.getElement('mfm-preset');
        const customRadio = CoreUtils.dom.getElement('mfm-custom');
        const presetContainer = CoreUtils.dom.getElement('mfm-preset-container');
        const customContainer = CoreUtils.dom.getElement('mfm-custom-container');

        if (presetRadio && customRadio && presetContainer && customContainer) {
            presetRadio.addEventListener('change', () => {
                if (presetRadio.checked) {
                    CoreUtils.dom.show(presetContainer);
                    CoreUtils.dom.hide(customContainer);
                    this.switchToDropdownMode();
                    this.hideUnitTypeField();
                    this.hidePointsField();
                    this.loadMFMData();
                }
            });

            customRadio.addEventListener('change', () => {
                if (customRadio.checked) {
                    CoreUtils.dom.hide(presetContainer);
                    CoreUtils.dom.show(customContainer);
                    this.switchToTextInputMode();
                    this.showUnitTypeField();
                    this.showPointsField();
                }
            });
        }

        // Load MFM data on page load if preset is selected
        if (presetRadio && presetRadio.checked) {
            this.hideUnitTypeField();
            this.hidePointsField();
            this.loadMFMData();
        } else {
            this.showUnitTypeField();
            this.showPointsField();
        }
    }

    async loadMFMData() {
        const dataSheetField = CoreUtils.dom.getElement('data-sheet');
        if (dataSheetField && dataSheetField.tagName === 'SELECT') {
            dataSheetField.innerHTML = '<option value="">-- Loading MFM data... --</option>';
            dataSheetField.disabled = true;
        }

        try {
            // Check if embedded data is available
            if (typeof window.EMBEDDED_MFM_DATA !== 'undefined') {
                this.mfmData = window.EMBEDDED_MFM_DATA;
                this.populateDataSheetOptions();
            } else {
                // Fallback to fetch if embedded data is not available
                const response = await fetch('../mfm/mfm-3_2.json');
                if (!response.ok) {
                    throw new Error(`Failed to load MFM data: ${response.status}`);
                }
                
                this.mfmData = await response.json();
                this.populateDataSheetOptions();
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

    populateDataSheetOptions() {
        if (!this.mfmData || !this.forceContext?.faction) {
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
        const factionKey = this.forceContext.faction.toUpperCase();
        const faction = this.mfmData.factions[factionKey];

        if (!faction) {
            console.warn(`Faction "${factionKey}" not found in MFM data`);
            dataSheetField.innerHTML = '<option value="">-- Faction not found in MFM data --</option>';
            return;
        }

        // Populate with units from the faction
        const units = Object.keys(faction.units).sort();
        units.forEach(unitName => {
            const unit = faction.units[unitName];
            const option = document.createElement('option');
            option.value = unitName;
            
            // Create point cost display
            let pointCosts = '';
            if (unit.variants && unit.variants.length > 0) {
                // Get unique point costs and sort them
                const uniquePoints = [...new Set(unit.variants.map(v => v.points))].sort((a, b) => a - b);
                pointCosts = ` (${uniquePoints.join(', ')} pts)`;
            }
            
            option.textContent = unitName + pointCosts;
            dataSheetField.appendChild(option);
        });

        // Add change listener to handle data sheet selection
        dataSheetField.addEventListener('change', (e) => {
            this.handleDataSheetSelection(e.target.value);
        });
    }

    handleDataSheetSelection(unitName) {
        if (!this.mfmData || !this.forceContext?.faction || !unitName) {
            this.hideVariantDropdown();
            return;
        }

        const factionKey = this.forceContext.faction.toUpperCase();
        const faction = this.mfmData.factions[factionKey];
        
        if (!faction || !faction.units[unitName]) {
            this.hideVariantDropdown();
            return;
        }

        const unit = faction.units[unitName];
        
        // Show variant dropdown if unit has multiple variants
        if (unit.variants.length > 1) {
            this.showVariantDropdown(unit.variants);
        } else {
            this.hideVariantDropdown();
            // Auto-populate points for single variant
            if (unit.variants.length === 1) {
                this.updatePointsFromVariant(unit.variants[0]);
            }
        }
    }

    showVariantDropdown(variants) {
        const variantGroup = CoreUtils.dom.getElement('variant-group');
        const variantSelect = CoreUtils.dom.getElement('unit-variant');
        
        if (!variantGroup || !variantSelect) {
            return;
        }

        // Clear existing options
        variantSelect.innerHTML = '<option value="">-- Select Variant --</option>';
        
        // Populate with variants
        variants.forEach((variant, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${variant.modelCount} models - ${variant.points} pts`;
            variantSelect.appendChild(option);
        });

        // Show the variant group
        CoreUtils.dom.show(variantGroup);
        variantSelect.required = true;

        // Add change listener for variant selection
        variantSelect.addEventListener('change', (e) => {
            const variantIndex = parseInt(e.target.value);
            if (variantIndex >= 0 && variantIndex < variants.length) {
                this.updatePointsFromVariant(variants[variantIndex]);
            }
        });
    }

    hideVariantDropdown() {
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

    updatePointsFromVariant(variant) {
        const pointsField = CoreUtils.dom.getElement('points');
        if (pointsField && variant) {
            pointsField.value = variant.points;
        }
    }

    updatePointsFromMFM(unitName) {
        // This method is kept for backward compatibility
        this.handleDataSheetSelection(unitName);
    }

    showUnitTypeField() {
        const unitTypeGroup = CoreUtils.dom.getElement('unit-type-group');
        if (unitTypeGroup) {
            CoreUtils.dom.show(unitTypeGroup);
        }
    }

    hideUnitTypeField() {
        const unitTypeGroup = CoreUtils.dom.getElement('unit-type-group');
        if (unitTypeGroup) {
            CoreUtils.dom.hide(unitTypeGroup);
        }
    }

    showPointsField() {
        const pointsGroup = CoreUtils.dom.getElement('points-group');
        if (pointsGroup) {
            CoreUtils.dom.show(pointsGroup);
        }
    }

    hidePointsField() {
        const pointsGroup = CoreUtils.dom.getElement('points-group');
        if (pointsGroup) {
            CoreUtils.dom.hide(pointsGroup);
        }
    }

    switchToDropdownMode() {
        const dataSheetContainer = CoreUtils.dom.getElement('data-sheet').parentElement;
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

    switchToTextInputMode() {
        const dataSheetContainer = CoreUtils.dom.getElement('data-sheet').parentElement;
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

    clearDataSheetOptions() {
        const dataSheetField = CoreUtils.dom.getElement('data-sheet');
        if (dataSheetField) {
            if (dataSheetField.tagName === 'SELECT') {
                dataSheetField.innerHTML = '<option value="">-- Select Data Sheet --</option>';
            } else {
                dataSheetField.value = '';
            }
            dataSheetField.disabled = false;
        }
        
        // Hide variant dropdown when clearing data sheet options
        this.hideVariantDropdown();
    }

    validateSpecificField(field, value) {
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

    gatherFormData() {
        const formData = super.gatherFormData();

        // Generate unit key
        const unitKey = KeyUtils.generateUnitKey(
            this.forceContext.forceKey,
            formData.name
        );

        // Set default rank since we no longer track XP
        let rank = 'Battle-ready';

        // Handle MFM version
        let mfmVersion = '';
        const mfmMode = formData.mfmMode;
        if (mfmMode === 'preset') {
            mfmVersion = formData.mfmVersion || '3.2';
        } else if (mfmMode === 'custom') {
            mfmVersion = formData.mfmVersionCustom || '';
        }

        // Get variant information if available
        let variantInfo = null;
        if (formData.unitVariant && this.mfmData && this.forceContext?.faction) {
            const factionKey = this.forceContext.faction.toUpperCase();
            const faction = this.mfmData.factions[factionKey];
            if (faction && faction.units[formData.dataSheet]) {
                const unit = faction.units[formData.dataSheet];
                const variantIndex = parseInt(formData.unitVariant);
                if (variantIndex >= 0 && variantIndex < unit.variants.length) {
                    variantInfo = unit.variants[variantIndex];
                }
            }
        }

        return {
            key: unitKey,
            ...formData,
            forceKey: this.forceContext.forceKey,
            forceName: this.forceContext.forceName,
            userKey: this.forceContext.userKey,
            faction: this.forceContext.faction,
            rank: rank,
            mfmVersion: mfmVersion,
            variantInfo: variantInfo,
            wargear: formData.wargear || '',
            notes: formData.notes || ''
        };
    }
}

// Global functions for backward compatibility
function resetForm() {
    if (window.unitForm) {
        window.unitForm.reset();
    }
}

function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.unitForm = new UnitForm();
});