// filename: battles/battle-add.js
// Simplified Battle Report Form using base class
// 40k Crusade Campaign Tracker

class BattleReportForm extends BaseForm {
    constructor() {
        console.log('BattleReportForm constructor called');
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
        console.log('BattleReportForm init() called');
        
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
        
        console.log('BattleReportForm init() completed');
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
        console.log('Setting up dropdowns...');
        // Convert player inputs to selects
        ['player1-name', 'player2-name'].forEach((id, index) => {
            const input = CoreUtils.dom.getElement(id);
            console.log(`Found element for ${id}:`, input, 'Tag:', input?.tagName);
            
            if (input && input.tagName === 'INPUT') {
                console.log(`Converting ${id} from input to select`);
                const select = this.createSelect(id, input.name, input.required);
                input.parentNode.replaceChild(select, input);
                console.log(`Replaced input with select for ${id}`);

                select.addEventListener('change', (e) => {
                    console.log(`Player ${index + 1} dropdown changed to:`, e.target.value);
                    this.handlePlayerSelection(index + 1, e.target.value);
                });
                console.log(`Event listener added to ${id}, element:`, select);
                
                // Test if the event listener is working by manually triggering a change
                console.log(`Testing event listener for ${id}...`);
                setTimeout(() => {
                    console.log(`Current element for ${id}:`, document.getElementById(id));
                }, 100);
            } else if (input && input.tagName === 'SELECT') {
                console.log(`${id} is already a select, adding event listener`);
                input.addEventListener('change', (e) => {
                    console.log(`Player ${index + 1} dropdown changed to:`, e.target.value);
                    this.handlePlayerSelection(index + 1, e.target.value);
                });
            } else {
                console.log(`Element not found or wrong type for ${id}:`, input);
            }
        });

        // Setup force selection handlers
        ['force1-select', 'force2-select'].forEach((id, index) => {
            const select = CoreUtils.dom.getElement(id);
            console.log(`Found force select element for ${id}:`, select);
            if (select) {
                select.addEventListener('change', (e) => {
                    console.log(`Force ${index + 1} dropdown changed to:`, e.target.value);
                    this.handleForceSelection(index + 1, e.target.value);
                });
                console.log(`Event listener added to force select ${id}`);
            } else {
                console.log(`Force select element not found for ${id}`);
            }
        });
    }

    createSelect(id, name, required) {
        console.log(`Creating select element for ${id}`);
        const select = document.createElement('select');
        select.id = id;
        select.name = name;
        select.required = required;

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select player...';
        select.appendChild(placeholder);

        console.log(`Created select element:`, select);
        return select;
    }

    async loadAllData() {
        UIHelpers.showLoading('battle-report-form', 'Loading battle data...');

        try {
            console.log('Starting to load all data...');
            await Promise.all([
                this.loadUsers(),
                this.loadForces(),
                this.loadCrusades(),
                this.loadArmyLists()
            ]);
            console.log('All data loaded successfully');
            console.log('Forces data available:', !!this.dataLoaders.forces);
            console.log('Users data available:', !!this.dataLoaders.users);
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
            const forcesData = await CacheManager.fetchSheetData('forces');
            console.log('Raw forces data loaded:', forcesData);
            
            // Handle different data formats
            if (forcesData && forcesData.success && forcesData.data) {
                // Standardized format with success/data structure
                this.dataLoaders.forces = forcesData.data;
                console.log('Using standardized format, forces count:', this.dataLoaders.forces.length);
            } else if (Array.isArray(forcesData)) {
                // Direct array format
                this.dataLoaders.forces = forcesData;
                console.log('Using direct array format, forces count:', this.dataLoaders.forces.length);
            } else {
                console.log('Unknown forces data format:', forcesData);
                this.dataLoaders.forces = [];
            }
                
            // Show structure of forces data
            if (this.dataLoaders.forces && this.dataLoaders.forces.length > 0) {
                console.log('Forces data structure:');
                console.log('First force object:', this.dataLoaders.forces[0]);
                console.log('Total forces:', this.dataLoaders.forces.length);
                
                // Check if it's array format (with header row) or object format
                const firstItem = this.dataLoaders.forces[0];
                if (Array.isArray(firstItem)) {
                    console.log('Data is in array format with header row');
                } else if (typeof firstItem === 'object' && firstItem.user_name) {
                    console.log('Data is in object format - each force is an object');
                } else {
                    console.log('Unknown data item format:', typeof firstItem, firstItem);
                }
                
                // Refresh any currently selected players
                this.refreshSelectedPlayers();
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
        console.log('Populating player dropdowns...');
        ['player1-name', 'player2-name'].forEach((id, index) => {
            const select = document.getElementById(id);
            if (!select || select.tagName !== 'SELECT') {
                console.log(`Select element not found for ${id}`);
                return;
            }

            console.log(`Populating ${id} with ${this.dataLoaders.users.length} users`);

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
                console.log(`Player ${index + 1} dropdown changed to:`, e.target.value);
                this.handlePlayerSelection(index + 1, e.target.value);
            });
            console.log(`Event listener re-added to ${id}`);
        });

        // Auto-select current user for player 1
        if (window.UserManager && window.UserManager.currentUser) {
            const player1Select = document.getElementById('player1-name');
            if (player1Select) {
                console.log(`Auto-selecting current user: ${window.UserManager.currentUser.name}`);
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
        console.log(`=== Player ${playerNum} selected: "${playerName}" ===`);
        
        if (!playerName) {
            console.log('No player name provided, clearing force dropdown');
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
            console.log('Filtering forces from cached data for player:', playerName);
            console.log('Forces data type:', typeof this.dataLoaders.forces, 'Length:', this.dataLoaders.forces.length);
            
            let playerForces = [];
            
            // Check if first item is an array (indicating array format with header row)
            const firstItem = this.dataLoaders.forces[0];
            if (Array.isArray(firstItem)) {
                // Array format - skip header row and filter
                console.log('Filtering array format forces');
                playerForces = this.dataLoaders.forces.slice(1).filter(row => {
                    const forceUserName = row[2]; // User Name is in column 2
                    return forceUserName && playerName && 
                        forceUserName.toString().trim().toLowerCase() === playerName.toString().trim().toLowerCase();
                });
            } else {
                // Object format - filter directly
                console.log('Filtering object format forces');
                console.log('All forces:', this.dataLoaders.forces.map(f => ({ name: f.force_name, user: f.user_name })));
                playerForces = this.dataLoaders.forces.filter(force => {
                    const forceUserName = force.user_name || force['user_name'];
                    const matches = forceUserName && playerName && 
                        forceUserName.toString().trim().toLowerCase() === playerName.toString().trim().toLowerCase();
                    console.log(`Force: ${force.force_name}, User: "${forceUserName}", Selected: "${playerName}", Matches: ${matches}`);
                    return matches;
                });
            }
            
            console.log(`Found ${playerForces.length} forces for player ${playerName}`);
            this.updateForceDropdown(playerNum, playerForces);
        } else {
            console.log('No forces data available - forces may still be loading');
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
        console.log(`Retrying force loading for player ${playerNum}: ${playerName}`);
        
        try {
            // Try to reload forces data
            await this.loadForces();
            
            // Wait a moment for the data to be processed
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Try the player selection again
            if (this.dataLoaders.forces && this.dataLoaders.forces.length > 0) {
                console.log('Forces data now available, retrying player selection');
                this.handlePlayerSelection(playerNum, playerName);
            } else {
                console.log('Still no forces data available after retry');
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
            console.log('Cache cleared event received:', event.detail);
            if (event.detail && event.detail.type === 'forces') {
                console.log('Forces cache cleared, reloading forces data');
                this.loadForces();
            }
        });
    }

    refreshSelectedPlayers() {
        // Check if any players are currently selected and refresh their force dropdowns
        ['player1-name', 'player2-name'].forEach((playerId, index) => {
            const playerSelect = document.getElementById(playerId);
            if (playerSelect && playerSelect.value) {
                console.log(`Refreshing forces for selected player: ${playerSelect.value}`);
                this.handlePlayerSelection(index + 1, playerSelect.value);
            }
        });
    }

    updateForceDropdown(playerNum, forces) {
        console.log(`=== Updating force dropdown for player ${playerNum} with ${forces.length} forces ===`);
        const select = document.getElementById(`force${playerNum}-select`);
        
        if (!select) {
            console.log(`Force select element not found for player ${playerNum}`);
            return;
        }

        select.innerHTML = '<option value="">Select force...</option>';

        forces.forEach(force => {
            let forceKey, forceName, faction;
            
            if (Array.isArray(force)) {
                // Array format: [force_key, user_key, user_name, force_name, faction, detachment, notes, timestamp]
                forceKey = force[0];    // force_key
                forceName = force[3];   // force_name
                faction = force[4];     // faction
            } else {
                // Object format
                forceKey = force.force_key || force['force_key'];
                forceName = force.force_name || force['force_name'];
                faction = force.faction || force['faction'];
            }
            
            if (forceKey && forceName) {
                const option = document.createElement('option');
                option.value = forceKey;
                option.textContent = `${forceName} - ${faction || 'Unknown Faction'}`;
                option.dataset.forceName = forceName;
                select.appendChild(option);
                console.log(`Added force option: ${forceName} - ${faction || 'Unknown Faction'}`);
            } else {
                console.log('Skipping force due to missing data:', { forceKey, forceName, faction });
            }
        });

        console.log(`Force dropdown updated with ${select.options.length - 1} options for player ${playerNum}`);

        // Auto-select if only one force
        if (forces.length === 1) {
            const firstForce = forces[0];
            const forceKey = Array.isArray(firstForce) ? firstForce[0] : (firstForce.force_key || firstForce['force_key']);
            select.value = forceKey;
            this.handleForceSelection(playerNum, forceKey);
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