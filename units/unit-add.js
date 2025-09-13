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
        UnitFormUtilities.setupBattlefieldRoleFields();

        // Setup MFM integration
        await UnitFormUtilities.setupMFMIntegration(this.form, this.forceContext.faction);
        
        // Listen for MFM version changes
        document.addEventListener('mfmVersionChanged', (event) => {
            this.handleMFMVersionChange(event.detail.version);
        });
        
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

    async handleMFMVersionChange(version) {
        // Reload MFM data with the new version
        await UnitFormUtilities.loadMFMData(this.forceContext.faction, version);
    }


















    validateSpecificField(field, value) {
        return UnitFormUtilities.validateUnitField(field, value);
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