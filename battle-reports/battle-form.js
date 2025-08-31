// filename: battle-form.js
// Simplified Battle Report Form using base class
// 40k Crusade Campaign Tracker

class BattleReportForm extends BaseForm {
    constructor() {
        super('battle-report-form', {
            submitUrl: CrusadeConfig.getSheetUrl('battleHistory'),
            successMessage: 'Battle report submitted successfully!',
            errorMessage: 'Failed to submit battle report',
            clearCacheOnSuccess: ['battleHistory', 'forces']
        });

        this.dataLoaders = {
            forces: null,
            crusades: null,
            users: null,
            armyLists: null
        };

        this.init();
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
    }

    setDefaultDate() {
        const dateField = document.getElementById('date-played');
        if (dateField) {
            dateField.value = new Date().toISOString().split('T')[0];
        }
    }

    setupCustomBattleSize() {
        const battleSizeSelect = document.getElementById('battle-size');
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
            const input = document.getElementById(id);
            if (input && input.tagName === 'INPUT') {
                const select = this.createSelect(id, input.name, input.required);
                input.parentNode.replaceChild(select, input);

                select.addEventListener('change', (e) => {
                    this.handlePlayerSelection(index + 1, e.target.value);
                });
            }
        });

        // Setup force selection handlers
        ['force1-select', 'force2-select'].forEach((id, index) => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', (e) => {
                    this.handleForceSelection(index + 1, e.target.value);
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
                this.loadArmyLists()
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
            const url = CrusadeConfig.getSheetUrl('forces');
            if (url) {
                this.dataLoaders.forces = await CacheManager.fetchWithCache(url, 'forces');
            }
        } catch (error) {
            console.error('Error loading forces:', error);
            this.dataLoaders.forces = [];
        }
    }

    async loadCrusades() {
        try {
            const url = CrusadeConfig.getSheetUrl('crusades');
            if (url) {
                const data = await CacheManager.fetchWithCache(url, 'crusades');
                this.dataLoaders.crusades = data;
                this.populateCrusadeDropdown(data);
            }
        } catch (error) {
            console.error('Error loading crusades:', error);
        }
    }

    async loadArmyLists() {
        try {
            const url = CrusadeConfig.getSheetUrl('armyLists');
            if (url) {
                const data = await CacheManager.fetchWithCache(url, 'armyLists');
                this.dataLoaders.armyLists = Array.isArray(data) ? data :
                    (data.data ? data.data : []);
            }
        } catch (error) {
            console.error('Error loading army lists:', error);
            this.dataLoaders.armyLists = [];
        }
    }

    populatePlayerDropdowns() {
        ['player1-name', 'player2-name'].forEach(id => {
            const select = document.getElementById(id);
            if (!select || select.tagName !== 'SELECT') return;

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

        data.slice(1).forEach(row => {
            if (row[0] && row[2]) { // Key and Name
                const option = document.createElement('option');
                option.value = row[0];
                option.textContent = `${row[2]} (${row[1] || 'Active'})`;
                select.appendChild(option);
            }
        });
    }

    handlePlayerSelection(playerNum, playerName) {
        if (!playerName || !this.dataLoaders.forces) return;

        const playerForces = this.dataLoaders.forces.slice(1).filter(row =>
            row[1] === playerName // User Name column
        );

        this.updateForceDropdown(playerNum, playerForces);
    }

    updateForceDropdown(playerNum, forces) {
        const select = document.getElementById(`force${playerNum}-select`);
        if (!select) return;

        select.innerHTML = '<option value="">Select force...</option>';

        forces.forEach(row => {
            if (row[0] && row[2]) { // Key and Force Name
                const option = document.createElement('option');
                option.value = row[0];
                option.textContent = `${row[2]} - ${row[3] || 'Unknown Faction'}`;
                option.dataset.forceName = row[2];
                select.appendChild(option);
            }
        });

        // Auto-select if only one force
        if (forces.length === 1) {
            select.value = forces[0][0];
            this.handleForceSelection(playerNum, forces[0][0]);
        }
    }

    handleForceSelection(playerNum, forceKey) {
        // Store force name in hidden field
        const select = document.getElementById(`force${playerNum}-select`);
        const hiddenField = document.getElementById(`force${playerNum}-name`);

        if (select && hiddenField) {
            const selectedOption = select.options[select.selectedIndex];
            hiddenField.value = selectedOption.dataset.forceName || '';
        }

        // Update army list dropdown
        this.updateArmyListDropdown(playerNum, forceKey);
    }

    updateArmyListDropdown(playerNum, forceKey) {
        const select = document.getElementById(`army${playerNum}-select`);
        if (!select || !this.dataLoaders.armyLists) return;

        select.innerHTML = '<option value="">Select army list (optional)...</option>';

        const forceArmyLists = this.dataLoaders.armyLists.filter(item => {
            if (Array.isArray(item)) {
                return item[1] === forceKey; // Force Key column
            } else {
                return item['Force Key'] === forceKey || item.forceKey === forceKey;
            }
        });

        forceArmyLists.forEach(item => {
            const name = Array.isArray(item) ? item[5] : (item['Army Name'] || item.armyName);
            const points = Array.isArray(item) ? item[9] : (item['Points Value'] || item.pointsValue);

            if (name) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = points ? `${name} (${points} pts)` : name;
                select.appendChild(option);
            }
        });
    }

    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const crusadeKey = urlParams.get('crusade') || urlParams.get('crusadeKey');

        if (crusadeKey) {
            const crusadeSelect = document.getElementById('crusade-select');
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

        // Get army list names
        const army1Select = document.getElementById('army1-select');
        const army2Select = document.getElementById('army2-select');

        return {
            ...formData,
            army1: army1Select ? army1Select.value : '',
            army2: army2Select ? army2Select.value : ''
        };
    }

    async submitToGoogleSheets(data) {
        const result = await super.submitToGoogleSheets(data);

        // Clear specific battle caches
        if (data.force1Key) {
            CacheManager.clear('battleHistory', `force_${data.force1Key}`);
        }
        if (data.force2Key) {
            CacheManager.clear('battleHistory', `force_${data.force2Key}`);
        }

        return result;
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