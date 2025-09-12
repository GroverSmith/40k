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

        // Setup MFM integration
        await UnitFormUtilities.setupMFMIntegration(this.form, this.forceContext.faction);

        // Populate form with existing data
        this.populateForm();

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

            // Load force context from unit data
            this.forceContext = {
                forceKey: this.unitData.force_key,
                forceName: this.unitData.force_name,
                userName: this.unitData.user_name,
                userKey: this.unitData.user_key,
                faction: this.unitData.faction
            };

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

        const unitKeyField = CoreUtils.dom.getElement('unit-key');
        if (unitKeyField) {
            unitKeyField.value = this.unitKey || '';
        }
    }

    updateNavigation() {
        const forceUrl = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        const backButton = CoreUtils.dom.getElement('back-button');
        if (backButton) {
            backButton.href = forceUrl;
        }
    }

    populateForm() {
        if (!this.unitData) return;

        // Populate basic fields
        const nameField = CoreUtils.dom.getElement('unit-name');
        if (nameField) nameField.value = this.unitData.unit_name || '';

        const dataSheetField = CoreUtils.dom.getElement('data-sheet');
        if (dataSheetField) dataSheetField.value = this.unitData.data_sheet || '';

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

        // Determine MFM mode based on data
        const hasMFMVersion = this.unitData.mfm_version && String(this.unitData.mfm_version).trim() !== '';
        const presetRadio = CoreUtils.dom.getElement('mfm-preset');
        const customRadio = CoreUtils.dom.getElement('mfm-custom');

        if (hasMFMVersion && presetRadio) {
            presetRadio.checked = true;
            UnitFormUtilities.switchToDropdownMode();
            UnitFormUtilities.hideUnitTypeField();
            UnitFormUtilities.hidePointsField();
            await UnitFormUtilities.loadMFMData(this.forceContext.faction);
            
            // Set the data sheet value after loading
            if (dataSheetField && dataSheetField.tagName === 'SELECT') {
                dataSheetField.value = this.unitData.data_sheet || '';
            }
        } else if (customRadio) {
            customRadio.checked = true;
            UnitFormUtilities.switchToTextInputMode();
            UnitFormUtilities.showUnitTypeField();
            UnitFormUtilities.showPointsField();
        }
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
        if (formData.unitVariant && window.EMBEDDED_MFM_DATA && this.forceContext?.faction) {
            const factionKey = this.forceContext.faction.toUpperCase();
            const faction = window.EMBEDDED_MFM_DATA.factions[factionKey];
            if (faction && faction.units[formData.dataSheet]) {
                const unit = faction.units[formData.dataSheet];
                const variantIndex = parseInt(formData.unitVariant);
                if (variantIndex >= 0 && variantIndex < unit.variants.length) {
                    variantInfo = unit.variants[variantIndex];
                }
            }
        }

        return {
            ...formData,
            forceKey: this.forceContext.forceKey,
            forceName: this.forceContext.forceName,
            userKey: this.forceContext.userKey,
            faction: this.forceContext.faction,
            mfmVersion: mfmVersion,
            variantInfo: variantInfo,
            wargear: formData.wargear || '',
            notes: formData.notes || ''
        };
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (this.isSubmitting) {
            console.log('Already submitting, please wait');
            return;
        }

        this.setLoadingState(true);

        try {
            // Validate form
            if (this.config.validateOnSubmit && !this.validateForm()) {
                throw new Error('Please fix the form errors and try again.');
            }

            // Gather form data
            const formData = this.gatherFormData();

            // Submit to Google Sheets
            await this.submitToGoogleSheets(formData);

            // Clear specified caches
            this.clearCachesOnSuccess();

            // Show success
            this.showSuccess();

            // Redirect to unit details page
            setTimeout(() => {
                window.location.href = `../units/unit-details.html?unit_key=${encodeURIComponent(this.unitKey)}`;
            }, 1500);

        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
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
