// filename: units/unit-edit.js
// Edit unit form functionality

class UnitEditForm extends BaseForm {
    constructor() {
        super('edit-unit-form', {
            submitUrl: TableDefs.units?.url,
            successMessage: 'Unit updated successfully!',
            errorMessage: 'Failed to update unit',
            clearCacheOnSuccess: ['units'],
            redirectUrl: null // Will be set dynamically
        });

        this.unitKey = null;
        this.unitData = null;
        this.forceContext = null;
        this.mfmData = null;
        this.init().catch(error => {
            console.error('Error initializing UnitEditForm:', error);
        });
    }

    async init() {
        // Load unit key from URL
        this.unitKey = CoreUtils.url.getParam('unit_key');
        
        if (!this.unitKey) {
            FormUtilities.showError('No unit key provided. Please access this form from a unit details page.');
            CoreUtils.dom.hide(this.form);
            return;
        }

        // Load unit data
        await this.loadUnitData();

        // Initialize base functionality
        this.initBase();

        // Setup battlefield role specific fields
        UnitFormUtilities.setupBattlefieldRoleFields();

        // Load shared components
        UnitFormUtilities.createUnitTypeGroupComponent('unit-type-container');

        // Populate form with existing data
        await this.populateForm();

        // Setup MFM integration for points updating (after form is populated)
        await this.setupMFMIntegration();

        // Setup action buttons
        this.setupActionButtons();
    }

    async loadUnitData() {
        try {
            // Load unit data from cache
            this.unitData = await UnifiedCache.getRowByKey('units', this.unitKey);
            
            if (!this.unitData) {
                FormUtilities.showError('Unit not found. Please check the unit key and try again.');
                CoreUtils.dom.hide(this.form);
                return;
            }

            // Load force data to get faction information
            const forceData = await UnifiedCache.getRowByKey('forces', this.unitData.force_key);
            console.log('Force data loaded:', forceData);
            
            // Load force context from unit data and force data
            this.forceContext = {
                forceKey: this.unitData.force_key,
                forceName: this.unitData.force_name,
                userName: this.unitData.user_name,
                userKey: this.unitData.user_key,
                faction: forceData?.faction || null
            };
            
            console.log('Force context created:', this.forceContext);

            this.config.redirectUrl = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
            this.populateForceContext();
            this.updateNavigation();

        } catch (error) {
            console.error('Error loading unit data:', error);
            FormUtilities.showError('Failed to load unit data. Please try again.');
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
    }

    async setupMFMIntegration() {
        const presetRadio = CoreUtils.dom.getElement('mfm-preset');
        const customRadio = CoreUtils.dom.getElement('mfm-custom');
        const presetContainer = CoreUtils.dom.getElement('mfm-preset-container');
        const customContainer = CoreUtils.dom.getElement('mfm-custom-container');
        const pointsField = CoreUtils.dom.getElement('points');

        // Setup version selector
        UnitFormUtilities.setupVersionSelector();
        
        // Retry setup if bundle wasn't ready initially
        if (typeof window.MFM_UNITS_BUNDLE === 'undefined') {
            setTimeout(() => {
                UnitFormUtilities.setupVersionSelector();
            }, 100);
            
            setTimeout(() => {
                UnitFormUtilities.setupVersionSelector();
            }, 500);
        }

        if (presetRadio && customRadio && presetContainer && customContainer && pointsField) {
            presetRadio.addEventListener('change', () => {
                console.log('MFM preset radio changed, checked:', presetRadio.checked);
                if (presetRadio.checked) {
                    CoreUtils.dom.show(presetContainer);
                    CoreUtils.dom.hide(customContainer);
                    pointsField.readOnly = true;
                    pointsField.classList.add('readonly');
                    // Update points immediately when switching to MFM preset
                    console.log('Calling updatePointsFromMFM from radio change');
                    this.updatePointsFromMFM();
                }
            });

            customRadio.addEventListener('change', () => {
                if (customRadio.checked) {
                    CoreUtils.dom.hide(presetContainer);
                    CoreUtils.dom.show(customContainer);
                    pointsField.readOnly = false;
                    pointsField.classList.remove('readonly');
                }
            });

            // Listen for MFM version changes
            document.addEventListener('mfmVersionChanged', (event) => {
                // Only update points if MFM preset is selected
                if (presetRadio.checked) {
                    this.handleMFMVersionChange(event.detail.version);
                }
            });

            // Also add direct listener to version selector
            const versionSelect = CoreUtils.dom.getElement('mfm-version-preset');
            if (versionSelect) {
                versionSelect.addEventListener('change', () => {
                    console.log('Version selector changed to:', versionSelect.value, 'preset checked:', presetRadio.checked);
                    if (presetRadio.checked) {
                        console.log('Calling handleMFMVersionChange');
                        this.handleMFMVersionChange(versionSelect.value);
                    }
                });
            }

            // Update points on initial load if MFM preset is already selected
            if (presetRadio.checked) {
                console.log('MFM preset is checked on initial load, calling updatePointsFromMFM');
                this.updatePointsFromMFM();
            } else {
                console.log('MFM preset is not checked on initial load');
            }
        }
    }

    async handleMFMVersionChange(version) {
        console.log('handleMFMVersionChange called with version:', version);
        // Reload MFM data with the new version and update points
        await this.updatePointsFromMFM(version);
    }

    async updatePointsFromMFM(version = null) {
        console.log('updatePointsFromMFM called with version:', version);
        
        if (!this.unitData || !this.unitData.data_sheet || !this.forceContext.faction) {
            console.log('Missing required data for MFM points update:', {
                hasUnitData: !!this.unitData,
                dataSheet: this.unitData?.data_sheet,
                faction: this.forceContext?.faction
            });
            return;
        }

        try {
            const mfmVersion = version || UnitFormUtilities.getSelectedVersion();
            console.log('Updating points from MFM:', {
                version: mfmVersion,
                faction: this.forceContext.faction,
                dataSheet: this.unitData.data_sheet
            });
            
            // Test if we can access the points field
            const pointsField = CoreUtils.dom.getElement('points');
            console.log('Points field found:', !!pointsField);
            if (pointsField) {
                console.log('Current points field value:', pointsField.value);
            }
            
            // Load MFM data directly without trying to populate dropdown
            let mfmData = null;
            if (typeof window.MFM_UNITS_BUNDLE !== 'undefined') {
                mfmData = await window.MFM_UNITS_BUNDLE.loadVersion(mfmVersion);
                console.log('MFM data loaded from bundle:', !!mfmData);
            } else {
                console.log('MFM_UNITS_BUNDLE not available');
            }
            
            if (mfmData && this.unitData.data_sheet) {
                const factionKey = this.forceContext.faction.toUpperCase();
                const factionData = mfmData.factions[factionKey];
                console.log('Faction data found:', !!factionData, 'for faction:', factionKey);
                
                // Try exact match first
                let unit = factionData?.units[this.unitData.data_sheet];
                let matchedUnitName = this.unitData.data_sheet;
                
                // If not found, try case-insensitive match
                if (!unit && factionData) {
                    const availableUnits = Object.keys(factionData.units);
                    const lowerDataSheet = this.unitData.data_sheet.toLowerCase();
                    
                    for (const unitName of availableUnits) {
                        if (unitName.toLowerCase() === lowerDataSheet) {
                            unit = factionData.units[unitName];
                            matchedUnitName = unitName;
                            console.log('Found case-insensitive match:', unitName);
                            break;
                        }
                    }
                }
                
                // If still not found, try fuzzy matching for common variations
                if (!unit && factionData) {
                    const availableUnits = Object.keys(factionData.units);
                    const dataSheet = this.unitData.data_sheet;
                    
                    // Common variations to check
                    const variations = [
                        dataSheet.replace(/Defkilla/g, 'Deffkilla'), // Fix missing 'f'
                        dataSheet.replace(/Deffkilla/g, 'Defkilla'), // Fix extra 'f'
                        dataSheet.replace(/Space Marine/g, 'Space Marines'), // Fix plural
                        dataSheet.replace(/Space Marines/g, 'Space Marine'), // Fix singular
                    ];
                    
                    for (const variation of variations) {
                        if (factionData.units[variation]) {
                            unit = factionData.units[variation];
                            matchedUnitName = variation;
                            console.log('Found fuzzy match:', variation);
                            break;
                        }
                    }
                }
                
                if (unit) {
                    console.log('Unit found:', matchedUnitName, 'with variants:', unit.variants?.length || 0);
                    
                    if (unit.variants && unit.variants.length > 0) {
                        // Use the first variant's points as default
                        const points = unit.variants[0].points;
                        console.log('Setting points to:', points);
                        
                        if (pointsField) {
                            pointsField.value = points;
                            console.log('Points field updated. New value:', pointsField.value);
                            
                            // Trigger change event to ensure any listeners are notified
                            pointsField.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    } else {
                        console.log('No variants found for unit:', matchedUnitName);
                    }
                } else {
                    console.log('Unit not found in MFM data:', {
                        factionKey,
                        dataSheet: this.unitData.data_sheet,
                        availableUnits: factionData ? Object.keys(factionData.units) : 'No faction data'
                    });
                }
            } else {
                console.log('MFM data not available or no data sheet');
            }
        } catch (error) {
            console.error('Error updating points from MFM:', error);
        }
    }

    updateNavigation() {
        const forceUrl = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        const backButton = CoreUtils.dom.getElement('back-button');
        if (backButton) {
            backButton.href = forceUrl;
        }
    }

    async populateForm() {
        if (!this.unitData) return;

        // Populate basic fields
        const nameField = CoreUtils.dom.getElement('unit-name');
        if (nameField) nameField.value = this.unitData.unit_name || '';

        // Populate read-only data sheet field
        const dataSheetValue = CoreUtils.dom.getElement('data-sheet-value');
        if (dataSheetValue) {
            const dataSheetName = this.unitData.data_sheet || 'Not specified';
            const points = this.unitData.points;
            
            if (points && points !== '' && dataSheetName !== 'Not specified') {
                dataSheetValue.textContent = `${dataSheetName} (${points} pts)`;
            } else {
                dataSheetValue.textContent = dataSheetName;
            }
        }

        const typeField = CoreUtils.dom.getElement('unit-type');
        if (typeField) typeField.value = this.unitData.unit_type || '';

        const pointsField = CoreUtils.dom.getElement('points');
        if (pointsField) pointsField.value = this.unitData.points || '';

        const wargearField = CoreUtils.dom.getElement('wargear');
        if (wargearField) wargearField.value = this.unitData.wargear || '';

        const enhancementsField = CoreUtils.dom.getElement('enhancements');
        if (enhancementsField) enhancementsField.value = this.unitData.enhancements || '';

        const relicsField = CoreUtils.dom.getElement('relics');
        if (relicsField) relicsField.value = this.unitData.relics || '';

        const battleTraitsField = CoreUtils.dom.getElement('battle-traits');
        if (battleTraitsField) battleTraitsField.value = this.unitData.battle_traits || '';

        const battleScarsField = CoreUtils.dom.getElement('battle-scars');
        if (battleScarsField) battleScarsField.value = this.unitData.battle_scars || '';

        const battleCountField = CoreUtils.dom.getElement('battle-count');
        if (battleCountField) battleCountField.value = this.unitData.battle_count || '';

        const xpField = CoreUtils.dom.getElement('xp');
        if (xpField) xpField.value = this.unitData.xp || '';

        const rankField = CoreUtils.dom.getElement('rank');
        if (rankField) rankField.value = this.unitData.rank || '';

        const killCountField = CoreUtils.dom.getElement('kill-count');
        if (killCountField) killCountField.value = this.unitData.kill_count || '';

        const timesKilledField = CoreUtils.dom.getElement('times-killed');
        if (timesKilledField) timesKilledField.value = this.unitData.times_killed || '';

        const descriptionField = CoreUtils.dom.getElement('description');
        if (descriptionField) descriptionField.value = this.unitData.description || '';

        const notableHistoryField = CoreUtils.dom.getElement('notable-history');
        if (notableHistoryField) notableHistoryField.value = this.unitData.notable_history || '';

        const notesField = CoreUtils.dom.getElement('notes');
        if (notesField) notesField.value = this.unitData.notes || '';
    }

    setupActionButtons() {
        const cancelBtn = CoreUtils.dom.getElement('cancel-edit-btn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.location.href = `../units/unit-details.html?unit_key=${encodeURIComponent(this.unitKey)}`;
            });
        }
    }


    validateSpecificField(field, value) {
        return UnitFormUtilities.validateUnitField(field, value);
    }

    gatherFormData() {
        const formData = super.gatherFormData();

        // Add unit key for update operation
        formData.unitKey = this.unitKey;

        // Get data sheet from read-only field (extract name without points cost)
        const dataSheetValue = CoreUtils.dom.getElement('data-sheet-value');
        if (dataSheetValue) {
            const displayText = dataSheetValue.textContent;
            // Extract just the data sheet name (remove points cost if present)
            const match = displayText.match(/^(.+?)\s*\(\d+\s*pts\)$/);
            formData.dataSheet = match ? match[1].trim() : displayText;
        }

        // Handle MFM version - use existing value from unit data
        const mfmVersion = this.unitData.mfm_version;

        return {
            ...formData,
            operation: 'edit',
            unit_key: this.unitKey,
            user_key: this.forceContext.userKey,
            force_key: this.unitData.force_key, // Use original force_key from unit data
            forceKey: this.forceContext.forceKey,
            forceName: this.forceContext.forceName,
            faction: this.forceContext.faction,
            mfmVersion: mfmVersion,
            // Preserve all original unit data fields
            unit_name: formData.name || this.unitData.unit_name,
            data_sheet: formData.dataSheet || this.unitData.data_sheet,
            unit_type: formData.type || this.unitData.unit_type,
            mfm_version: mfmVersion || this.unitData.mfm_version,
            points: formData.points || this.unitData.points,
            crusade_points: formData.crusadePoints || this.unitData.crusade_points,
            wargear: formData.wargear || this.unitData.wargear,
            enhancements: formData.enhancements || this.unitData.enhancements,
            relics: formData.relics || this.unitData.relics,
            battle_traits: formData.battleTraits || this.unitData.battle_traits,
            battle_scars: formData.battleScars || this.unitData.battle_scars,
            battle_count: formData.battleCount || this.unitData.battle_count,
            xp: formData.xp || this.unitData.xp,
            rank: formData.rank || this.unitData.rank,
            kill_count: formData.killCount || this.unitData.kill_count,
            times_killed: formData.timesKilled || this.unitData.times_killed,
            description: formData.description || this.unitData.description,
            notable_history: formData.notableHistory || this.unitData.notable_history,
            notes: formData.notes || this.unitData.notes
        };
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (this.isSubmitting) {
            return;
        }

        const submitBtn = CoreUtils.dom.getElement('submit-btn');
        const btnText = CoreUtils.dom.getElement('.btn-text');
        const btnLoading = CoreUtils.dom.getElement('.btn-loading');

        try {
            // Show loading state
            if (submitBtn && btnText && btnLoading) {
                submitBtn.disabled = true;
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-block';
            } else {
                // Fallback: replace button content directly
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `
                        <div class="loading-spinner"></div>
                        Updating Unit...
                    `;
                }
            }

            // Validate form
            if (this.config.validateOnSubmit && !this.validateForm()) {
                throw new Error('Please fix the form errors and try again.');
            }

            // Gather form data
            const formData = this.gatherFormData();

            // Submit to Google Sheets
            await this.submitToGoogleSheets(formData);

            // Show success state
            if (btnText && btnLoading) {
                btnLoading.innerHTML = `
                    <div class="loading-spinner" style="display: none;"></div>
                    <span style="color: green;">✓</span>
                    Updated Successfully!
                `;
            }

            // Clear specified caches
            this.clearCachesOnSuccess();

            // Show success
            this.showSuccess();

            // Redirect to unit details page
            setTimeout(() => {
                window.location.href = `../units/unit-details.html?key=${encodeURIComponent(this.unitKey)}`;
            }, 1500);

        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
            
            // Restore button state on error
            if (submitBtn && btnText && btnLoading) {
                submitBtn.disabled = false;
                btnText.style.display = 'inline-block';
                btnLoading.style.display = 'none';
            } else if (submitBtn) {
                // Fallback: restore original button text
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="btn-text">Update Unit</span>';
            }
        }
    }
}

// Global functions for backward compatibility
function resetForm() {
    if (window.unitEditForm) {
        window.unitEditForm.reset();
    }
}

function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.unitEditForm = new UnitEditForm();
});
