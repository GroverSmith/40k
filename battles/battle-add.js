// filename: battles/battle-add.js
// Simplified Battle Report Form using base class
// 40k Crusade Campaign Tracker

class BattleReportForm extends BaseForm {
    constructor() {
        super('battle-report-form', {
            submitUrl: CrusadeConfig.getSheetUrl('battles'),
            successMessage: 'Battle report submitted successfully!',
            errorMessage: 'Failed to submit battle report',
            clearCacheOnSuccess: ['battles', 'forces']
        });

        this.dataLoaders = {
            forces: null,
            crusades: null,
            users: null,
            armies: null
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
            }
        });

        // Setup force selection handlers
        ['force1-select', 'force2-select'].forEach((id, index) => {
            const select = CoreUtils.dom.getElement(id);
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
            console.log('Users data loaded:', this.dataLoaders.users);
            this.populatePlayerDropdowns();
        } catch (error) {
            console.error('Error loading users:', error);
            this.dataLoaders.users = [];
        }
    }

    async loadForces() {
        try {
            this.dataLoaders.forces = await CacheManager.fetchSheetData('forces');
            console.log('Forces data loaded:', this.dataLoaders.forces);
                
            // Show structure of forces data
            if (this.dataLoaders.forces && this.dataLoaders.forces.length > 0) {
                console.log('Forces data structure:');
                console.log('Header row:', this.dataLoaders.forces[0]);
                if (this.dataLoaders.forces.length > 1) {
                    console.log('Sample data row:', this.dataLoaders.forces[1]);
                    console.log('Total rows:', this.dataLoaders.forces.length);
                }
            }
        } catch (error) {
            console.error('Error loading forces:', error);
            this.dataLoaders.forces = [];
        }
    }

    async loadCrusades() {
        try {
            const data = await CacheManager.fetchSheetData('crusades');
            this.dataLoaders.crusades = data;
            this.populateCrusadeDropdown(data);
        } catch (error) {
            console.error('Error loading crusades:', error);
        }
    }

    async loadArmyLists() {
        try {
            const data = await CacheManager.fetchSheetData('armies');
            this.dataLoaders.armies = Array.isArray(data) ? data :
                (data.data ? data.data : []);
        } catch (error) {
            console.error('Error loading army lists:', error);
            this.dataLoaders.armies = [];
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
            const crusadeKeyIndex = TableDefs.getColumnIndex('crusades', 'crusade_key');
            const crusadeNameIndex = TableDefs.getColumnIndex('crusades', 'crusade_name');
            const stateIndex = TableDefs.getColumnIndex('crusades', 'state');
            
            if (row[crusadeKeyIndex] && row[crusadeNameIndex]) {
                const option = document.createElement('option');
                option.value = row[crusadeKeyIndex];
                option.textContent = `${row[crusadeNameIndex]} (${row[stateIndex] || 'Active'})`;
                select.appendChild(option);
            }
        });
    }

    async handlePlayerSelection(playerNum, playerName) {
        console.log(`Player ${playerNum} selected:`, playerName);
        
        if (!playerName) {
            console.log('No player name provided');
            return;
        }

        // Try to get forces directly from the API for this user
        try {
            const userForces = await this.getUserForcesFromAPI(playerName);
            console.log(`Found ${userForces.length} forces for player ${playerName} via API`);
            this.updateForceDropdown(playerNum, userForces);
        } catch (error) {
            console.error('Error getting user forces from API:', error);
            
            // Fallback to client-side filtering
            if (this.dataLoaders.forces) {
                console.log('Falling back to client-side filtering');
                const playerForces = this.dataLoaders.forces.slice(1).filter(row => {
                    const forceUserName = row[2]; // User Name is now column 2
                    return forceUserName && playerName && 
                        forceUserName.toString().trim().toLowerCase() === playerName.toString().trim().toLowerCase();
                });
                console.log(`Found ${playerForces.length} forces for player ${playerName} via fallback`);
                this.updateForceDropdown(playerNum, playerForces);
            } else {
                console.log('No forces data available for fallback');
            }
        }
    }

    async getUserForcesFromAPI(userName) {
        const url = CrusadeConfig.getSheetUrl('forces');
        if (!url) {
            throw new Error('Forces URL not configured');
        }

        const apiUrl = `${url}?action=user-forces&user=${encodeURIComponent(userName)}`;
        console.log('Fetching user forces from:', apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API response:', result);

        if (!result.success) {
            throw new Error(result.error || 'API returned error');
        }

        // Convert the forces array to the format expected by updateForceDropdown
        // New structure: [Key, User Key, User Name, Force Name, Faction, Detachment, Notes, Timestamp, Deleted Timestamp]
        return result.forces.map(force => [
            force.Key,
            force['User Key'] || '',  // User Key (column 1)
            force['User Name'],       // User Name (column 2)
            force['Force Name'],      // Force Name (column 3)
            force.Faction,            // Faction (column 4)
            force.Detachment,         // Detachment (column 5)
            force.Notes,              // Notes (column 6)
            force.Timestamp           // Timestamp (column 7)
        ]);
    }

    updateForceDropdown(playerNum, forces) {
        const select = document.getElementById(`force${playerNum}-select`);
        
        if (!select) {
            console.log(`Force select element not found for player ${playerNum}`);
            return;
        }

        select.innerHTML = '<option value="">Select force...</option>';

        forces.forEach(row => {
            const forceKeyIndex = TableDefs.getColumnIndex('forces', 'force_key');
            const forceNameIndex = TableDefs.getColumnIndex('forces', 'force_name');
            const factionIndex = TableDefs.getColumnIndex('forces', 'faction');
            
            if (row[forceKeyIndex] && row[forceNameIndex]) {
                const option = document.createElement('option');
                option.value = row[forceKeyIndex];
                option.textContent = `${row[forceNameIndex]} - ${row[factionIndex] || 'Unknown Faction'}`;
                option.dataset.forceName = row[forceNameIndex];
                select.appendChild(option);
            }
        });

        console.log(`Force dropdown updated with ${select.options.length - 1} options for player ${playerNum}`);

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
        if (!select || !this.dataLoaders.armies) return;

        select.innerHTML = '<option value="">Select army list (optional)...</option>';

        const forceArmyLists = this.dataLoaders.armies.filter(item => {
            if (Array.isArray(item)) {
                return item[1] === forceKey; // Force Key column
            } else {
                return item['force_key'] === forceKey || item.forceKey === forceKey;
            }
        });

        forceArmyLists.forEach(item => {
            const name = Array.isArray(item) ? item[5] : (item['army_name'] || item.armyName);
            const points = Array.isArray(item) ? item[9] : (item['points_value'] || item.pointsValue);

            if (name) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = points ? `${name} (${points} pts)` : name;
                select.appendChild(option);
            }
        });
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