// filename: battles/battle-add.js
// Simplified Battle Report Form using base class
// 40k Crusade Campaign Tracker
class BattleReportForm extends BaseForm {
    constructor() {
        super('battle-report-form', {
            submitUrl: CrusadeConfig.getSheetUrl('battle_history'),
            successMessage: 'Battle report submitted successfully!',
            errorMessage: 'Failed to submit battle report',
            clearCacheOnSuccess: ['battles']
        });
        this.dataLoaders = {
            forces: null,
            crusades: null,
            users: null,
            armies: null
        };
        this.setupBattleLoadingState();
        this.init();
    }
    
    setupBattleLoadingState() {
        // Override the base form's setLoadingState method to use our custom overlay
        this.originalSetLoadingState = this.setLoadingState;
        this.setLoadingState = (isLoading) => {
            // Call the original method to handle button state
            this.originalSetLoadingState(isLoading);
            // Only show overlay, don't disable form elements (they're already disabled by button state)
            if (isLoading) {
                const overlay = document.getElementById('battle-loading-overlay');
                if (overlay) {
                    overlay.style.display = 'flex';
                }
            } else {
                const overlay = document.getElementById('battle-loading-overlay');
                if (overlay) {
                    overlay.style.display = 'none';
                }
            }
        };
    }
    
    toggleBattleLoadingOverlay(show) {
        const overlay = document.getElementById('battle-loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
        // Don't disable form elements - let the base form handle button state only
    }
    async init() {
        // Initialize base functionality
        this.initBase();
        // Set default date
        this.setDefaultDate();
        // Setup custom battle size
        this.setupCustomBattleSize();
        // Setup dropdowns
        this.setupDropdowns();
        // Load all data
        await this.loadAllData();
        // Check for URL parameters
        this.checkUrlParameters();
        // Listen for cache clear events
        this.setupCacheClearListener();
    }
    setDefaultDate() {
        const dateField = CoreUtils.dom.getElement('date-played');
        if (dateField) {
            dateField.value = new Date().toISOString().split('T')[0];
        }
    }
    setupCustomBattleSize() {
        const battleSizeSelect = CoreUtils.dom.getElement('battle-size');
        const container = battleSizeSelect.parentNode;
        // Create custom input
        const customInput = document.createElement('input');
        customInput.type = 'number';
        customInput.id = 'custom-battle-size';
        customInput.name = 'customBattleSize';
        customInput.placeholder = 'Enter points';
        customInput.min = '100';
        customInput.max = '10000';
        customInput.step = '50';
        customInput.value = '1000';
        customInput.classList.add('d-none');
        container.appendChild(customInput);
        // Show/hide based on selection
        battleSizeSelect.addEventListener('change', (e) => {
            customInput.classList.toggle('d-none', e.target.value !== 'Custom');
            if (e.target.value === 'Custom') {
                customInput.focus();
            }
        });
        // Set default to Custom
        battleSizeSelect.value = 'Custom';
        customInput.classList.remove('d-none');
    }
    setupDropdowns() {
        // Convert player inputs to selects
        ['player1-name', 'player2-name'].forEach((id, index) => {
            const input = CoreUtils.dom.getElement(id);
            if (input && input.tagName === 'INPUT') {
                const select = this.createSelect(id, input.name, input.required);
                input.parentNode.replaceChild(select, input);
                select.addEventListener('change', (e) => {
                    this.handlePlayerSelection(index + 1, e.target.value);
                });
            } else if (input && input.tagName === 'SELECT') {
                input.addEventListener('change', (e) => {
                    this.handlePlayerSelection(index + 1, e.target.value);
                });
            } else {
            }
        });
        // Setup force selection handlers
        ['force1-select', 'force2-select'].forEach((id, index) => {
            const select = CoreUtils.dom.getElement(id);
            if (select) {
                select.addEventListener('change', (e) => {
                    console.log(`=== FORCE ${index + 1} DROPDOWN CHANGED ===`);
                    console.log(`Selected value: "${e.target.value}"`);
                    console.log(`Selected text: "${e.target.options[e.target.selectedIndex]?.textContent}"`);
                    this.handleForceSelection(index + 1, e.target.value);
                });
            }
        });
        // Setup army dropdowns
        ['army1-select', 'army2-select'].forEach((id, index) => {
            const select = CoreUtils.dom.getElement(id);
            if (select) {
                select.addEventListener('change', (e) => {
                    this.handleArmySelection(index + 1, e.target.value);
                });
            }
        });
    }
    createSelect(id, name, required) {
        const select = document.createElement('select');
        select.id = id;
        select.name = name;
        select.required = required;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select player...';
        select.appendChild(placeholder);
        return select;
    }
    async loadAllData() {
        UIHelpers.showLoading('battle-report-form', 'Loading battle data...');
        try {
            await Promise.all([
                this.loadUsers(),
                this.loadForces(),
                this.loadCrusades(),
                this.loadArmies()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            UIHelpers.hideLoading('battle-report-form');
        }
    }
    async loadUsers() {
        try {
            const users = await UserAPI.loadUsers();
            this.dataLoaders.users = users || [];
            this.populatePlayerDropdowns();
        } catch (error) {
            console.error('Error loading users:', error);
            this.dataLoaders.users = [];
        }
    }
    async loadForces() {
        try {
            const forcesData = await UnifiedCache.getAllRows('forces');
            this.dataLoaders.forces = forcesData || [];
            // Refresh any currently selected players
            if (this.dataLoaders.forces.length > 0) {
                this.refreshSelectedPlayers();
            }
        } catch (error) {
            console.error('Error loading forces:', error);
            this.dataLoaders.forces = [];
        }
    }
    async loadCrusades() {
        try {
            const data = await UnifiedCache.getAllRows('crusades');
            this.dataLoaders.crusades = data;
            this.populateCrusadeDropdown(data);
        } catch (error) {
            console.error('Error loading crusades:', error);
        }
    }
    async loadArmies() {
        try {
            const data = await UnifiedCache.getAllRows('armies');
            this.dataLoaders.armies = data || [];
            if (this.dataLoaders.armies.length > 0) {
                // Log all army force keys to debug
                this.dataLoaders.armies.forEach((army, index) => {
                    const forceKey = army.force_key;
                    const armyName = army.army_name;
                });
            }
        } catch (error) {
            console.error('Error loading armies:', error);
            this.dataLoaders.armies = [];
        }
    }
    populatePlayerDropdowns() {
        ['player1-name', 'player2-name'].forEach((id, index) => {
            const select = document.getElementById(id);
            if (!select || select.tagName !== 'SELECT') {
                return;
            }
            // Clear and repopulate
            select.innerHTML = '<option value="">Select player...</option>';
            this.dataLoaders.users.forEach(user => {
                if (user && user.name) {
                    const option = document.createElement('option');
                    option.value = user.name;
                    option.textContent = user.name;
                    select.appendChild(option);
                }
            });
            // Re-add event listener after populating (in case it was removed)
            select.removeEventListener('change', this.handlePlayerSelection);
            select.addEventListener('change', (e) => {
                this.handlePlayerSelection(index + 1, e.target.value);
            });
        });
        // Auto-select current user for player 1
        if (window.UserManager && window.UserManager.currentUser) {
            const player1Select = document.getElementById('player1-name');
            if (player1Select) {
                player1Select.value = window.UserManager.currentUser.name;
                this.handlePlayerSelection(1, window.UserManager.currentUser.name);
            }
        }
    }
    populateCrusadeDropdown(data) {
        const select = document.getElementById('crusade-select');
        if (!select) return;
        select.innerHTML = '<option value="">Select crusade (optional)...</option>';
        data.forEach(crusade => {
            if (crusade.crusade_key && crusade.crusade_name) {
                const option = document.createElement('option');
                option.value = crusade.crusade_key;
                option.textContent = `${crusade.crusade_name} (${crusade.state || 'Active'})`;
                select.appendChild(option);
            }
        });
    }
    async handlePlayerSelection(playerNum, playerName) {
        if (!playerName) {
            const forceSelect = document.getElementById(`force${playerNum}-select`);
            if (forceSelect) {
                forceSelect.innerHTML = '<option value="">Select force...</option>';
            }
            return;
        }
        // Clear the force dropdown first
        const forceSelect = document.getElementById(`force${playerNum}-select`);
        if (forceSelect) {
            forceSelect.innerHTML = '<option value="">Select force...</option>';
        }
        // Filter forces from cached data
        if (this.dataLoaders.forces) {
            // Filter forces for the selected player
            const playerForces = this.dataLoaders.forces.filter(force => {
                const forceUserName = force.user_name;
                return forceUserName && playerName && 
                    forceUserName.toString().trim().toLowerCase() === playerName.toString().trim().toLowerCase();
            });
            this.updateForceDropdown(playerNum, playerForces);
        } else {
            // Show a loading message in the dropdown
            const forceSelect = document.getElementById(`force${playerNum}-select`);
            if (forceSelect) {
                forceSelect.innerHTML = '<option value="">Loading forces...</option>';
            }
            // Try to reload forces data and retry
            this.retryForceLoading(playerNum, playerName);
        }
    }
    async retryForceLoading(playerNum, playerName) {
        try {
            // Try to reload forces data
            await this.loadForces();
            // Wait a moment for the data to be processed
            await new Promise(resolve => setTimeout(resolve, 100));
            // Try the player selection again
            if (this.dataLoaders.forces && this.dataLoaders.forces.length > 0) {
                this.handlePlayerSelection(playerNum, playerName);
            } else {
                const forceSelect = document.getElementById(`force${playerNum}-select`);
                if (forceSelect) {
                    forceSelect.innerHTML = '<option value="">No forces available</option>';
                }
            }
        } catch (error) {
            console.error('Error retrying force loading:', error);
            const forceSelect = document.getElementById(`force${playerNum}-select`);
            if (forceSelect) {
                forceSelect.innerHTML = '<option value="">Error loading forces</option>';
            }
        }
    }
    setupCacheClearListener() {
        // Listen for cache clear events
        document.addEventListener('cacheCleared', (event) => {
            if (event.detail && event.detail.type === 'forces') {
                this.loadForces();
            }
        });
    }
    refreshSelectedPlayers() {
        // Check if any players are currently selected and refresh their force dropdowns
        ['player1-name', 'player2-name'].forEach((playerId, index) => {
            const playerSelect = document.getElementById(playerId);
            if (playerSelect && playerSelect.value) {
                this.handlePlayerSelection(index + 1, playerSelect.value);
            }
        });
    }
    updateForceDropdown(playerNum, forces) {
        const select = document.getElementById(`force${playerNum}-select`);
        if (!select) {
            return;
        }
        select.innerHTML = '<option value="">Select force...</option>';
        forces.forEach(force => {
            const forceKey = force.force_key;
            const forceName = force.force_name;
            const faction = force.faction;
            if (forceKey && forceName) {
                const option = document.createElement('option');
                option.value = forceKey;
                option.textContent = `${forceName} - ${faction || 'Unknown Faction'}`;
                option.dataset.forceName = forceName;
                select.appendChild(option);
                console.log(`Added force option: "${forceName}" with value: "${forceKey}"`);
            } else {
            }
        });
        // Re-attach event listener to ensure it's properly attached
        const eventHandler = (e) => {
            console.log(`=== FORCE ${playerNum} DROPDOWN CHANGED ===`);
            console.log(`Selected value: "${e.target.value}"`);
            console.log(`Selected text: "${e.target.options[e.target.selectedIndex]?.textContent}"`);
            this.handleForceSelection(playerNum, e.target.value);
        };
        
        // Remove any existing event listener first
        if (select._forceChangeHandler) {
            select.removeEventListener('change', select._forceChangeHandler);
        }
        
        // Add the new event listener
        select.addEventListener('change', eventHandler);
        select._forceChangeHandler = eventHandler;
        
        // Auto-select if only one force
        if (forces.length === 1) {
            const firstForce = forces[0];
            const forceKey = firstForce.force_key;
            select.value = forceKey;
            this.handleForceSelection(playerNum, forceKey);
        } else if (forces.length > 1) {
            console.log(`Player ${playerNum} has ${forces.length} forces - user must select one to see armies`);
        }
    }
    handleForceSelection(playerNum, forceKey) {
        console.log(`handleForceSelection called for player ${playerNum} with forceKey: "${forceKey}"`);
        // Store force name in hidden field
        const select = document.getElementById(`force${playerNum}-select`);
        const hiddenField = document.getElementById(`force${playerNum}-name`);
        if (select && hiddenField) {
            const selectedOption = select.options[select.selectedIndex];
            hiddenField.value = selectedOption.dataset.forceName || '';
            console.log(`Set force name for player ${playerNum}: ${hiddenField.value}`);
        }
        // Update army list dropdown
        this.updateArmyListDropdown(playerNum, forceKey);
    }
    updateArmyListDropdown(playerNum, forceKey) {
        console.log(`Updating army dropdown for player ${playerNum}, force: ${forceKey}`);
        const select = document.getElementById(`army${playerNum}-select`);
        if (!select || !this.dataLoaders.armies) {
            console.log('Army select not found or no armies data');
            return;
        }
        select.innerHTML = '<option value="">Select army list...</option>';
        if (!forceKey) {
            return;
        }
        // Filter armies for the selected force
        const forceArmies = this.dataLoaders.armies.filter(army => {
            return army.force_key === forceKey;
        });
        // Add army options
        forceArmies.forEach(army => {
            const armyKey = army.army_key;
            const armyName = army.army_name;
            const points = army.points_value || '';
            const detachment = army.detachment || '';
            if (armyKey && armyName) {
                const option = document.createElement('option');
                option.value = armyKey;
                // Create display text with army name, points, and detachment
                let displayText = armyName;
                if (points) displayText += ` (${points}pts)`;
                if (detachment) displayText += ` - ${detachment}`;
                option.textContent = displayText;
                select.appendChild(option);
            }
        });
        
        // Re-attach event listener to ensure it's properly attached
        const eventHandler = (e) => {
            console.log(`Army ${playerNum} selected: ${e.target.value}`);
            this.handleArmySelection(playerNum, e.target.value);
        };
        
        // Remove any existing event listener first
        if (select._armyChangeHandler) {
            select.removeEventListener('change', select._armyChangeHandler);
        }
        
        // Add the new event listener
        select.addEventListener('change', eventHandler);
        select._armyChangeHandler = eventHandler;
    }
    handleArmySelection(playerNum, armyKey) {
        console.log(`Army ${playerNum} selected: ${armyKey}`);
        // Store army name in hidden field
        const select = document.getElementById(`army${playerNum}-select`);
        const hiddenField = document.getElementById(`army${playerNum}-name`);
        if (select && hiddenField) {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption && selectedOption.value) {
                // Find the army data to get the army name
                const army = this.dataLoaders.armies.find(a => a.army_key === armyKey);
                if (army) {
                    hiddenField.value = army.army_name || '';
                }
            } else {
                hiddenField.value = '';
            }
        } else {
        }
    }
    checkUrlParameters() {
        // Use utility to get URL parameters
        const urlParams = CoreUtils.url.getAllParams();
        const crusadeKey = urlParams.crusade || urlParams.crusadeKey;
        if (crusadeKey) {
            const crusadeSelect = CoreUtils.dom.getElement('crusade-select');
            if (crusadeSelect) {
                // Wait for options to load
                setTimeout(() => {
                    crusadeSelect.value = crusadeKey;
                }, 500);
            }
        }
    }
    validateSpecificField(field, value) {
        if (field.id === 'force2-select' && value) {
            const force1 = document.getElementById('force1-select').value;
            if (force1 === value) {
                return {
                    isValid: false,
                    errorMessage: 'Please select different forces for each player.'
                };
            }
        }
        if ((field.id === 'player1-score' || field.id === 'player2-score') && value) {
            const score = parseInt(value);
            if (score < 0 || score > 100) {
                return {
                    isValid: false,
                    errorMessage: 'Score must be between 0 and 100.'
                };
            }
        }
        return { isValid: true };
    }
    gatherFormData() {
        const formData = super.gatherFormData();
        
        // Handle custom battle size
        if (formData.battleSize === 'Custom') {
            formData.battleSize = formData.customBattleSize || '';
        }
        
        // Get army list names from hidden fields (populated by handleArmySelection)
        const army1Name = document.getElementById('army1-name');
        const army2Name = document.getElementById('army2-name');
        
        // Add user_key for the current user
        const userKey = window.UserManager && window.UserManager.currentUser ? 
            window.UserManager.currentUser.user_key || window.UserManager.currentUser.name : '';
        
        const finalData = {
            ...formData,
            army1: army1Name ? army1Name.value : '',
            army2: army2Name ? army2Name.value : '',
            user_key: userKey
        };
        return finalData;
    }
    async clearCachesOnSuccess() {
        // Call the base form's method first
        await super.clearCachesOnSuccess();
        
        // Also manually clear battles cache using UnifiedCache
        if (typeof UnifiedCache !== 'undefined') {
            await UnifiedCache.clearCache('battle_history');
        }
    }
}
// Global functions for backward compatibility
function resetForm() {
    if (window.battleReportForm) {
        window.battleReportForm.reset();
    }
}
function hideMessages() {
    FormUtilities.hideAllMessages();
}
// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.battleReportForm = new BattleReportForm();
});
