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
        this.isEditMode = false;
        this.existingArmyData = null;
        this.existingUnitKeys = [];
        this.init();
    }

    async init() {
        // Check if we're in edit mode first
        this.checkEditMode();

        // Load force context from URL (or existing army data if in edit mode)
        if (this.isEditMode) {
            await this.loadExistingArmyData();
        } else {
            this.loadForceContext();
        }

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

        // Initialize MFM version selector
        this.initializeMFMVersionSelector();

        // Note: We override handleSubmit method instead of adding event listener
        // to avoid conflicts with the base form class
    }

    checkEditMode() {
        const urlParams = CoreUtils.url.getAllParams();
        this.isEditMode = urlParams.edit === 'true' && urlParams.army_key;
        
        if (this.isEditMode) {
            console.log('Edit mode detected for army:', urlParams.army_key);
            this.updatePageTitleForEdit();
        }
    }

    updatePageTitleForEdit() {
        document.title = 'Edit Army List - 40k Crusade Campaign Tracker';
        
        // Update page title
        const pageTitle = CoreUtils.dom.getElement('page-title');
        if (pageTitle) {
            pageTitle.textContent = '✏️ Edit Army List';
        }
        
        // Update submit button text
        const submitBtnText = CoreUtils.dom.getElement('submit-btn-text');
        const submitBtnLoadingText = CoreUtils.dom.getElement('submit-btn-loading-text');
        if (submitBtnText) {
            submitBtnText.textContent = 'Update Army List';
        }
        if (submitBtnLoadingText) {
            submitBtnLoadingText.textContent = 'Updating...';
        }
        
        const header = CoreUtils.dom.getElement('force-context');
        if (header) {
            header.textContent = 'Loading army data...';
        }
    }

    async loadExistingArmyData() {
        try {
            const urlParams = CoreUtils.url.getAllParams();
            const armyKey = urlParams.army_key;
            
            if (!armyKey) {
                throw new Error('No army key provided for editing');
            }

            // Use UnifiedCache to get the army data
            this.existingArmyData = await UnifiedCache.getRowByKey('armies', armyKey);
            
            if (!this.existingArmyData) {
                throw new Error('Army not found or access denied');
            }

            // Create force context from existing army data
            this.forceContext = {
                forceKey: this.existingArmyData.force_key,
                forceName: this.existingArmyData.force_name,
                userName: this.existingArmyData.user_name,
                faction: this.existingArmyData.faction,
                detachment: this.existingArmyData.detachment || ''
            };

            this.populateForceContext();
            this.populateFormWithExistingData();
            this.updateNavigation();
            
            // Load existing unit relationships if this army has any
            await this.loadExistingUnitRelationships();
            
        } catch (error) {
            console.error('Error loading existing army data:', error);
            FormUtilities.showError(`Failed to load army data: ${error.message}`);
            CoreUtils.dom.hide(this.form);
        }
    }

    populateFormWithExistingData() {
        if (!this.existingArmyData) return;

        // Populate form fields with existing data
        const fields = {
            'army-name': this.existingArmyData.army_name,
            'points-value': this.existingArmyData.points_value,
            'notes': this.existingArmyData.notes,
            'army-list-text': this.existingArmyData.army_list_text
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = CoreUtils.dom.getElement(id);
            if (element && value) {
                element.value = value;
            }
        });

        // Set MFM version if available
        if (this.existingArmyData.mfm_version && window.MFMVersionSelector) {
            // Set MFM version after a short delay to ensure the selector is initialized
            setTimeout(() => {
                window.MFMVersionSelector.setSelectedVersion('army-mfm-version', this.existingArmyData.mfm_version);
            }, 500);
        }

        // Update header text
        const header = CoreUtils.dom.getElement('force-context');
        if (header) {
            header.textContent = `Editing army list: ${this.existingArmyData.army_name}`;
        }
    }

    async loadExistingUnitRelationships() {
        try {
            const armyKey = this.existingArmyData.army_key;
            console.log('Loading unit relationships for army:', armyKey);

            // Use UnifiedCache to get all xref_army_units data, then filter by army_key
            const allRelationships = await UnifiedCache.getAllRows('xref_army_units');
            
            // Filter to get only relationships for this army
            const armyRelationships = allRelationships.filter(rel => rel.army_key === armyKey);
            
            if (armyRelationships && armyRelationships.length > 0) {
                console.log('Found existing unit relationships:', armyRelationships);
                this.existingUnitKeys = armyRelationships.map(rel => rel.unit_key);
                
                // If we have existing units, we should detect the entry mode
                // For now, let's assume if there are unit relationships, it was created in picker mode
                this.detectEntryModeFromExistingData();
            } else {
                console.log('No existing unit relationships found');
                this.existingUnitKeys = [];
            }
            
        } catch (error) {
            console.error('Error loading existing unit relationships:', error);
            this.existingUnitKeys = [];
        }
    }

    detectEntryModeFromExistingData() {
        // If we have existing unit relationships, this army was likely created with picker mode
        // Switch to picker mode and populate the selected units
        if (this.existingUnitKeys && this.existingUnitKeys.length > 0) {
            console.log('Detected picker mode from existing unit relationships');
            
            // Switch to picker mode
            const pickerModeRadio = CoreUtils.dom.getElement('entry-mode-picker');
            if (pickerModeRadio) {
                pickerModeRadio.checked = true;
                this.switchToPickerMode();
            }
        }
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

    initializeMFMVersionSelector() {
        const container = CoreUtils.dom.getElement('mfm-version-selector-container');
        if (!container) {
            console.warn('MFM version selector container not found');
            return;
        }

        // Generate and insert the HTML
        const html = window.MFMVersionSelector.generateHTML(
            'army-mfm-version', 
            false, 
            'Munitorum Field Manual version used (optional)'
        );
        container.innerHTML = html;

        // Initialize the component
        window.MFMVersionSelector.initialize('army-mfm-version', (version) => {
            console.log('MFM version changed to:', version);
            // Reload units with the new MFM version context
            this.reloadUnitsWithMFMVersion(version);
        });
    }

    async reloadUnitsWithMFMVersion(mfmVersion) {
        if (!this.forceContext.forceKey) {
            console.warn('No force key available for reloading units');
            return;
        }

        try {
            // Reload units with the new MFM version context
            const units = await UnifiedCache.getUnitsWithMFMVersion(mfmVersion, {
                force_key: this.forceContext.forceKey
            });

            this.availableUnits = units || [];
            console.log(`Reloaded ${this.availableUnits.length} units with MFM version ${mfmVersion}`);
            
            // Update the UI if we're in picker mode
            if (this.entryMode === 'picker') {
                // Since we calculate points on-demand, we just need to refresh the UI
                this.populateAvailableUnits(); // Recreate DOM elements with new points
                this.populateSelectedUnits(); // Recreate selected units with new points
                this.updateSummary(); // Update points totals with new MFM version
            }
        } catch (error) {
            console.error('Error reloading units with MFM version:', error);
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
        
        // Note: We preserve selectedUnits when switching to text mode
        // so users can switch back and forth between modes
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
        
        // If we have existing unit keys, populate selected units first
        if (this.existingUnitKeys && this.existingUnitKeys.length > 0) {
            this.populateSelectedUnitsFromExisting();
        } else {
            // Populate selected units normally
            this.populateSelectedUnits();
        }
        
        // Only populate available units if we have data loaded
        if (this.availableUnits && this.availableUnits.length > 0) {
            this.populateAvailableUnits();
        } else {
            // If no units loaded yet, show loading message
            const availableList = CoreUtils.dom.getElement('available-units-list');
            if (availableList) {
                availableList.innerHTML = '<div class="unit-item">Loading units...</div>';
            }
        }
        
        this.updateSummary();
        this.updateNavigationButtons();
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
            // Get the current MFM version from the selector
            const mfmVersion = window.MFMVersionSelector.getSelectedVersion('army-mfm-version');
            
            // Load units with MFM version context - this will override points based on the selected MFM version
            const units = await UnifiedCache.getUnitsWithMFMVersion(mfmVersion, {
                force_key: this.forceContext.forceKey
            });

            this.availableUnits = units || [];
            console.log(`Loaded ${this.availableUnits.length} units for picker with MFM version ${mfmVersion}`);
            
            // If we're currently in picker mode, populate the available units
            if (this.entryMode === 'picker') {
                this.populateAvailableUnits();
                // Also try to populate selected units from existing relationships
                if (this.existingUnitKeys && this.existingUnitKeys.length > 0) {
                    this.populateSelectedUnitsFromExisting();
                }
            }
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

        // Filter out units that are already selected
        const selectedUnitKeys = new Set(this.selectedUnits.map(unit => unit.unit_key));
        const availableUnits = this.availableUnits.filter(unit => !selectedUnitKeys.has(unit.unit_key));

        if (availableUnits.length === 0) {
            availableList.innerHTML = '<div class="unit-item">All units have been selected</div>';
            return;
        }

        availableUnits.forEach(unit => {
            const unitItem = this.createUnitItem(unit, 'available');
            availableList.appendChild(unitItem);
        });

        // Setup search functionality
        this.setupUnitSearch();
    }

    populateSelectedUnits() {
        const selectedList = CoreUtils.dom.getElement('selected-units-list');
        if (!selectedList) return;

        selectedList.innerHTML = '';

        if (this.selectedUnits.length === 0) {
            selectedList.innerHTML = '<div class="unit-item">No units selected</div>';
            return;
        }

        this.selectedUnits.forEach(unit => {
            const unitItem = this.createUnitItem(unit, 'selected');
            selectedList.appendChild(unitItem);
        });
    }

    async populateSelectedUnitsFromExisting() {
        if (!this.existingUnitKeys || this.existingUnitKeys.length === 0) {
            this.populateSelectedUnits();
            return;
        }

        console.log('Populating selected units from existing relationships:', this.existingUnitKeys);

        // Clear current selected units
        this.selectedUnits = [];

        // Wait for available units to be loaded
        if (!this.availableUnits || this.availableUnits.length === 0) {
            console.log('Available units not loaded yet, waiting...');
            // Wait a bit for units to load, then try again
            setTimeout(() => this.populateSelectedUnitsFromExisting(), 500);
            return;
        }

        // Find units that match the existing unit keys
        const selectedUnits = [];
        this.existingUnitKeys.forEach(unitKey => {
            const unit = this.availableUnits.find(u => u.unit_key === unitKey);
            if (unit) {
                selectedUnits.push(unit);
                console.log('Found existing unit:', unit.unit_name);
            } else {
                console.warn('Could not find unit with key:', unitKey);
            }
        });

        this.selectedUnits = selectedUnits;
        console.log(`Loaded ${selectedUnits.length} existing units into selected list`);

        // Update the UI
        this.populateSelectedUnits();
        this.updateSummary();
    }

    createUnitItem(unit, type) {
        const item = document.createElement('div');
        item.className = 'unit-item';
        item.dataset.unitKey = unit.unit_key;
        item.dataset.unitName = unit.unit_name;
        
        // Calculate points dynamically based on current MFM version
        const points = this.calculateUnitPoints(unit);
        item.dataset.unitPoints = points;
        
        item.innerHTML = `
            <div class="unit-info">
                <div class="unit-name">${unit.unit_name || 'Unnamed Unit'}</div>
                <div class="unit-details">
                    ${unit.unit_type || 'Unknown Type'} • ${unit.data_sheet || 'Custom Unit'}
                </div>
            </div>
            <div class="unit-points">${points}pts</div>
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
            // If this is the first unit, clear the "No units selected" text
            if (this.selectedUnits.length === 1) {
                selectedList.innerHTML = '';
            }
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
        
        // If no units are selected, show "No units selected" message
        const selectedList = CoreUtils.dom.getElement('selected-units-list');
        if (selectedList && this.selectedUnits.length === 0) {
            selectedList.innerHTML = '<div class="unit-item">No units selected</div>';
        }
        
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

    /**
     * Calculate points for a unit based on current MFM version
     * @param {Object} unit - The unit object
     * @returns {number} Points value for the unit
     */
    calculateUnitPoints(unit) {
        if (!unit) return 0;
        
        // Get current MFM version
        const mfmVersion = window.MFMVersionSelector.getSelectedVersion('army-mfm-version');
        
        // If no MFM version selected, use the unit's stored points
        if (!mfmVersion || mfmVersion === '') {
            return parseInt(unit.points) || 0;
        }
        
        // Try to get points from MFM data for this version
        try {
            if (typeof window.MFM_UNITS_UPDATED !== 'undefined' && unit.data_sheet) {
                const factionKey = this.forceContext.faction.toUpperCase();
                const factionData = window.MFM_UNITS_UPDATED.factions[factionKey];
                
                if (factionData && factionData.units[unit.data_sheet]) {
                    const mfmUnit = factionData.units[unit.data_sheet];
                    const pointsKey = `mfm_${mfmVersion.replace('.', '_')}_points`;
                    
                    // Find matching variant based on model count
                    const modelCount = parseInt(unit.model_count) || 1;
                    const matchingVariant = mfmUnit.variants.find(variant => 
                        parseInt(variant.modelCount) === modelCount
                    );
                    
                    if (matchingVariant && matchingVariant[pointsKey] !== undefined) {
                        return parseInt(matchingVariant[pointsKey]) || 0;
                    }
                }
            }
        } catch (error) {
            console.warn('Error calculating MFM points for unit:', unit.unit_name, error);
        }
        
        // Fallback to stored points
        return parseInt(unit.points) || 0;
    }

    updateSummary() {
        const totalUnits = this.selectedUnits.length;
        const totalPoints = this.selectedUnits.reduce((sum, unit) => {
            return sum + this.calculateUnitPoints(unit);
        }, 0);

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
            formData.pointsValue = this.selectedUnits.reduce((sum, unit) => {
                return sum + this.calculateUnitPoints(unit);
            }, 0);
        }

        // Get MFM version from the selector and convert to snake_case
        formData.mfm_version = window.MFMVersionSelector.getSelectedVersion('army-mfm-version');

        // Convert camelCase field names to snake_case to match GAS script expectations
        const convertedData = {
            ...formData,
            // Convert field names to match GAS script expectations
            force_key: this.forceContext.forceKey,
            force_name: this.forceContext.forceName,
            user_name: this.forceContext.userName,
            army_name: formData.armyName,
            points_value: formData.pointsValue,
            army_list_text: formData.armyListText,
            faction: this.forceContext.faction,
            detachment: this.forceContext.detachment
        };

        // Remove the camelCase versions to avoid confusion
        delete convertedData.forceKey;
        delete convertedData.forceName;
        delete convertedData.userName;
        delete convertedData.armyName;
        delete convertedData.pointsValue;
        delete convertedData.armyListText;
        delete convertedData.mfmVersion;

        return convertedData;
    }

    showSuccess() {
        // Override base form success handling for edit vs create mode
        if (this.isEditMode) {
            this.showEditSuccessMessage();
        } else {
            this.showCreateSuccessMessage();
        }
    }

    showEditSuccessMessage() {
        const successTitle = CoreUtils.dom.getElement('success-title');
        const successDescription = CoreUtils.dom.getElement('success-description');
        const addAnotherBtn = CoreUtils.dom.getElement('add-another-btn');
        
        if (successTitle) {
            successTitle.textContent = '✅ Army List Updated Successfully!';
        }
        if (successDescription) {
            successDescription.textContent = 'Your army list has been updated in the database.';
        }
        if (addAnotherBtn) {
            // Hide "Add Another" button for edit mode
            addAnotherBtn.style.display = 'none';
        }
        
        // Show success message
        CoreUtils.dom.hide(this.form);
        CoreUtils.dom.show('success-message');
    }

    showCreateSuccessMessage() {
        const addAnotherBtn = CoreUtils.dom.getElement('add-another-btn');
        if (addAnotherBtn) {
            // Show "Add Another" button for create mode
            addAnotherBtn.style.display = 'inline-block';
        }
        
        // Show success message
        CoreUtils.dom.hide(this.form);
        CoreUtils.dom.show('success-message');
    }

    async submitToGoogleSheets(data) {
        if (!this.config.submitUrl) {
            throw new Error('Submit URL not configured');
        }

        try {
            // Show a more prominent loading message
            const actionText = this.isEditMode ? 'Updating army list...' : 'Creating army list...';
            this.showLoadingMessage(actionText);
            
            // Add operation type and army key for edit mode
            if (this.isEditMode) {
                data.operation = 'edit';
                data.army_key = this.existingArmyData.army_key;
                data.user_key = this.existingArmyData.user_key;
                console.log('Edit mode data being sent:', data);
            }
            
            const response = await fetch(this.config.submitUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(data).toString()
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || this.config.errorMessage);
            }

            // If in picker mode, save the unit relationships (non-blocking)
            if (this.entryMode === 'picker') {
                // For edit mode, use existing army key; for create mode, use result.key
                const armyKey = this.isEditMode ? this.existingArmyData.army_key : result.key;
                if (armyKey) {
                    // Save relationships in background - don't block the success flow
                    // This will handle both cases: units selected and no units selected
                    this.saveUnitRelationships(armyKey).catch(error => {
                        console.warn('Unit relationships could not be saved (army was still saved successfully):', error);
                    });
                } else {
                    console.warn('Could not find army key for unit relationships:', result);
                }
            }

            // Clear specified caches (like the base class does)
            await this.clearCachesOnSuccess();
            
            // Hide loading message on success
            this.hideLoadingMessage();
            
            return result;
        } catch (error) {
            // Hide loading message on error
            this.hideLoadingMessage();
            // Re-throw the error so the base class can handle it properly
            throw error;
        }
    }

    async saveUnitRelationships(armyKey) {
        if (!armyKey) {
            return;
        }

        try {
            const xrefUrl = CrusadeConfig.getSheetUrl('xref_army_units');
            const unitKeys = this.selectedUnits.map(unit => unit.unit_key);

            if (this.isEditMode) {
                // For edit mode, we need to update existing relationships
                // First, delete existing relationships for this army
                await this.deleteExistingUnitRelationships(armyKey);
            }

            // Then create new relationships (or skip if no units selected)
            if (unitKeys.length > 0) {
                const response = await fetch(xrefUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        armyKey: armyKey,
                        unitKeys: JSON.stringify(unitKeys)
                    }).toString()
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save unit relationships');
                }
                
                console.log('Unit relationships saved successfully');
            } else {
                console.log('No units selected, skipping unit relationships save');
            }
            
            // Clear the xref_army_units cache since we've modified the data
            if (typeof UnifiedCache !== 'undefined') {
                try {
                    await UnifiedCache.clearCache('xref_army_units');
                    console.log('Cleared xref_army_units cache after update');
                } catch (cacheError) {
                    console.warn('Failed to clear xref_army_units cache:', cacheError);
                }
            }
        } catch (error) {
            console.error('Error saving unit relationships:', error);
            // Don't throw here - the army was already saved successfully
            // Just log the error for debugging
        }
    }

    async deleteExistingUnitRelationships(armyKey) {
        try {
            const xrefUrl = CrusadeConfig.getSheetUrl('xref_army_units');
            
            const response = await fetch(xrefUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    operation: 'cascade_delete',
                    parent_table: 'armies',
                    parent_key: armyKey
                }).toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete existing unit relationships');
            }
            
            console.log('Existing unit relationships deleted successfully');
            
            // Clear the xref_army_units cache since we've modified the data
            if (typeof UnifiedCache !== 'undefined') {
                try {
                    await UnifiedCache.clearCache('xref_army_units');
                    console.log('Cleared xref_army_units cache after delete');
                } catch (cacheError) {
                    console.warn('Failed to clear xref_army_units cache:', cacheError);
                }
            }
        } catch (error) {
            console.error('Error deleting existing unit relationships:', error);
            throw error; // Re-throw this one as it's critical for edit mode
        }
    }

    showLoadingMessage(message = 'Processing...') {
        // Create or show loading overlay
        let loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner-large"></div>
                    <p class="loading-message">${message}</p>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        } else {
            const messageEl = loadingOverlay.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
            loadingOverlay.style.display = 'flex';
        }
    }

    hideLoadingMessage() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    generateArmyListText() {
        if (this.selectedUnits.length === 0) {
            return 'No units selected';
        }

        let armyText = `Army List: ${CoreUtils.dom.getElement('army-name')?.value || 'Unnamed Army'}\n`;
        armyText += `Faction: ${this.forceContext.faction}\n`;
        armyText += `Detachment: ${this.forceContext.detachment || 'Not specified'}\n`;
        armyText += `Total Points: ${this.selectedUnits.reduce((sum, unit) => {
            return sum + this.calculateUnitPoints(unit);
        }, 0)}\n\n`;
        armyText += 'Units:\n';

        this.selectedUnits.forEach((unit, index) => {
            const points = this.calculateUnitPoints(unit);
            armyText += `${index + 1}. ${unit.unit_name} (${points}pts)\n`;
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