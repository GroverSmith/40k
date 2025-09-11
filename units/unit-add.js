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

        // Setup experience tracking
        this.setupExperienceTracking();
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

    setupExperienceTracking() {
        const xpField = document.getElementById('experience-points');
        const rankDisplay = document.getElementById('rank-display');

        if (!xpField || !rankDisplay) return;

        const updateRank = () => {
            const xp = parseInt(xpField.value) || 0;
            let rank = 'Battle-ready';

            if (xp >= 51) rank = 'Legendary';
            else if (xp >= 31) rank = 'Heroic';
            else if (xp >= 16) rank = 'Veteran';
            else if (xp >= 6) rank = 'Blooded';

            rankDisplay.textContent = rank;
            rankDisplay.className = `rank-${rank.toLowerCase()}`;
        };

        xpField.addEventListener('input', updateRank);
        updateRank(); // Initial update
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
            formData.unitName
        );

        // Determine rank based on XP
        const xp = parseInt(formData.experiencePoints) || 0;
        let rank = 'Battle-ready';

        if (xp >= 51) rank = 'Legendary';
        else if (xp >= 31) rank = 'Heroic';
        else if (xp >= 16) rank = 'Veteran';
        else if (xp >= 6) rank = 'Blooded';

        return {
            key: unitKey,
            ...formData,
            forceKey: this.forceContext.forceKey,
            forceName: this.forceContext.forceName,
            userKey: this.forceContext.userKey,
            faction: this.forceContext.faction,
            rank: rank,
            crusadePoints: formData.crusadePoints || '0',
            battleHonours: formData.battleHonours || '',
            battleScars: formData.battleScars || '',
            equipment: formData.equipment || '',
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