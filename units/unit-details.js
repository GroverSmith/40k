// filename: units/unit-details.js

// 40k Crusade Campaign Tracker

class UnitDetailsView {
    constructor() {
        this.unitKey = null;
        this.unitData = null;
        this.forceContext = null;
        this.init().catch(error => {
            console.error('Error initializing UnitDetailsView:', error);
        });
    }

    async init() {
        // Load unit key from URL
        this.unitKey = CoreUtils.url.getParam('key');
        
        if (!this.unitKey) {
            FormUtilities.showError('No unit key provided. Please access this page from a unit details page.');
            return;
        }

        // Load unit data
        await this.loadUnitData();

        // Populate display with existing data
        this.populateDisplay();
        
        // Setup action buttons (wait for UserManager to be ready)
        this.setupActionButtonsWithDelay();
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

            this.populateForceContext();
            this.updateNavigation();

        } catch (error) {
            console.error('Error loading unit data:', error);
            FormUtilities.showError('Failed to load unit data. Please try again.');
        }
    }

    populateForceContext() {
        // Set force name display and link
        const forceNameEl = CoreUtils.dom.getElement('force-name');
        if (forceNameEl) {
            forceNameEl.textContent = this.forceContext.forceName;
            forceNameEl.href = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        }

    }

    updateNavigation() {
        const forceUrl = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
        ['back-button', 'back-to-force-btn'].forEach(id => {
            const element = CoreUtils.dom.getElement(id);
            if (element) element.href = forceUrl;
        });
    }















    populateDisplay() {
        if (!this.unitData) return;

        // Debug: Log the unit data to see what fields are available

        // Populate header
        const nameDisplay = CoreUtils.dom.getElement('unit-display-name');
        if (nameDisplay) nameDisplay.textContent = this.unitData.unit_name || 'Unknown Unit';

        const typeDisplay = CoreUtils.dom.getElement('unit-display-type');
        if (typeDisplay) typeDisplay.textContent = this.unitData.unit_type || 'Unknown Type';

        const pointsDisplay = CoreUtils.dom.getElement('unit-display-points');
        if (pointsDisplay) pointsDisplay.textContent = `${this.unitData.points || 0} pts`;

        // Populate all detail fields
        this.setDisplayValue('unit-display-data-sheet', this.unitData.data_sheet);
        this.setDisplayValue('unit-display-unit-type', this.unitData.unit_type);
        this.setDisplayValue('unit-display-mfm-version', this.unitData.mfm_version);
        this.setDisplayValue('unit-display-points-value', this.unitData.points);
        this.setDisplayValue('unit-display-crusade-points', this.unitData.crusade_points);
        this.setDisplayValue('unit-display-wargear', this.unitData.wargear);
        this.setDisplayValue('unit-display-enhancements', this.unitData.enhancements);
        this.setDisplayValue('unit-display-relics', this.unitData.relics);
        this.setDisplayValue('unit-display-battle-traits', this.unitData.battle_traits);
        this.setDisplayValue('unit-display-battle-scars', this.unitData.battle_scars);
        this.setDisplayValue('unit-display-battle-count', this.unitData.battle_count);
        this.setDisplayValue('unit-display-xp', this.unitData.xp);
        this.setDisplayValue('unit-display-rank', this.unitData.rank);
        this.setDisplayValue('unit-display-kill-count', this.unitData.kill_count);
        this.setDisplayValue('unit-display-times-killed', this.unitData.times_killed);
        this.setDisplayValue('unit-display-description', this.unitData.description);
        this.setDisplayValue('unit-display-notable-history', this.unitData.notable_history);
        this.setDisplayValue('unit-display-notes', this.unitData.notes);
        
        // Format timestamp
        const timestampDisplay = CoreUtils.dom.getElement('unit-display-timestamp');
        if (timestampDisplay && this.unitData.timestamp) {
            const date = new Date(this.unitData.timestamp);
            timestampDisplay.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    }

    setDisplayValue(elementId, value) {
        const element = CoreUtils.dom.getElement(elementId);
        if (element) {
            // Handle different types of values
            if (value === null || value === undefined || value === '') {
                element.textContent = 'Not specified';
            } else if (typeof value === 'number' && value === 0) {
                element.textContent = '0';
            } else {
                element.textContent = String(value);
            }
        }
    }

    updatePermissionMessage(canEdit, currentUser) {
        const unitActions = CoreUtils.dom.getElement('unit-actions');
        if (!unitActions) return;

        // Remove any existing permission message
        const existingMessage = unitActions.querySelector('.permission-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        if (!canEdit && currentUser) {
            // Add permission message
            const message = document.createElement('div');
            message.className = 'permission-message';
            message.style.cssText = `
                text-align: center;
                padding: var(--spacing-sm);
                background: var(--color-warning-light, #fff3cd);
                border: 1px solid var(--color-warning, #ffc107);
                border-radius: var(--border-radius);
                color: var(--color-warning-dark, #856404);
                font-size: var(--font-sm);
                margin-bottom: var(--spacing-sm);
            `;
            message.textContent = `This unit belongs to ${this.forceContext.userName}. You can view but not edit it.`;
            unitActions.insertBefore(message, unitActions.firstChild);
        }
    }

    async setupActionButtonsWithDelay() {
        // Wait for UserManager to be fully initialized
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            if (window.UserManager && UserManager.getCurrentUser) {
                const currentUser = UserManager.getCurrentUser();
                if (currentUser) {
                    this.setupActionButtons();
            return;
        }
            }
            
            // Wait 100ms before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        this.setupActionButtons();
    }

    setupActionButtons() {
        const editBtn = CoreUtils.dom.getElement('edit-unit-btn');
        const deleteBtn = CoreUtils.dom.getElement('delete-unit-btn');
        const cancelBtn = CoreUtils.dom.getElement('cancel-edit-btn');

        // Check if current user can edit/delete this unit
        const currentUser = UserManager.getCurrentUser();
        const canEdit = currentUser && currentUser.key === this.forceContext.userKey;

        // Show/hide permission message
        this.updatePermissionMessage(canEdit, currentUser);

        if (editBtn) {
            if (canEdit) {
                editBtn.addEventListener('click', () => {
                    window.location.href = `../units/unit-edit.html?unit_key=${encodeURIComponent(this.unitKey)}`;
                });
            } else {
                // Hide edit button if user doesn't have permission
                CoreUtils.dom.hide(editBtn);
            }
        }

        if (deleteBtn) {
            if (canEdit) {
                deleteBtn.addEventListener('click', () => {
                    this.confirmDelete();
                });
            } else {
                // Hide delete button if user doesn't have permission
                CoreUtils.dom.hide(deleteBtn);
            }
        }

    }



    confirmDelete() {
        // Check permissions before allowing delete
        const currentUser = UserManager.getCurrentUser();
        const canEdit = currentUser && currentUser.key === this.forceContext.userKey;

        if (!canEdit) {
            FormUtilities.showError('You do not have permission to delete this unit.');
            return;
        }

        if (confirm(`Are you sure you want to delete "${this.unitData.unit_name}"? This action cannot be undone.`)) {
            this.deleteUnit();
        }
    }

    async deleteUnit() {
        const deleteBtn = CoreUtils.dom.getElement('delete-unit-btn');
        const originalText = deleteBtn ? deleteBtn.textContent : '';
        
        try {
            // Show loading state
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = `
                    <div class="loading-spinner" style="display: inline-block; width: 16px; height: 16px; margin-right: 8px;"></div>
                    Deleting...
                `;
            }

            const response = await fetch(TableDefs.units?.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    operation: 'delete',
                    unit_key: this.unitKey,
                    user_key: this.forceContext.userKey
                }).toString()
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete unit');
            }

            // Show success state
            if (deleteBtn) {
                deleteBtn.innerHTML = `
                    <span style="color: green;">✓</span>
                    Deleted Successfully!
                `;
            }

            // Clear cache and redirect
            await UnifiedCache.clearCache('units');
            FormUtilities.showSuccess('Unit deleted successfully!');
            
            setTimeout(() => {
                window.location.href = `../forces/force-details.html?key=${encodeURIComponent(this.forceContext.forceKey)}`;
            }, 1500);

        } catch (error) {
            console.error('Error deleting unit:', error);
            FormUtilities.showError('Failed to delete unit. Please try again.');
            
            // Restore button state on error
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = originalText;
            }
        }
    }




}

// Global functions for backward compatibility
function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.unitDetailsView = new UnitDetailsView();
});
