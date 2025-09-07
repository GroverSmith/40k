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
            console.log(`=== SETTING UP FORCE SELECT ${id} ===`);
            console.log(`Found force select element:`, select);
            console.log(`Element tag name:`, select?.tagName);
            console.log(`Element ID:`, select?.id);
            
            if (select) {
                const eventHandler = (e) => {
                    console.log(`=== FORCE ${index + 1} DROPDOWN CHANGED ===`);
                    console.log(`Selected value: "${e.target.value}"`);
                    console.log(`Selected text: "${e.target.options[e.target.selectedIndex]?.textContent}"`);
                    console.log(`Event target:`, e.target);
                    this.handleForceSelection(index + 1, e.target.value);
                };
                
                select.addEventListener('change', eventHandler);
                console.log(`Event listener added to force select ${id}`);
                
                // Store the event handler for potential debugging
                select._forceChangeHandler = eventHandler;
            } else {
                console.log(`Force select element not found for ${id}`);
            }
        });

        // Setup army dropdowns
        ['army1-select', 'army2-select'].forEach((id, index) => {
            const select = CoreUtils.dom.getElement(id);
            console.log(`Found army select element for ${id}:`, select);
            if (select) {
                select.addEventListener('change', (e) => {
                    console.log(`Army ${index + 1} dropdown changed to:`, e.target.value);
                    this.handleArmySelection(index + 1, e.target.value);
                });
                console.log(`Event listener added to army select ${id}`);
            } else {
                console.log(`Army select element not found for ${id}`);
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
                this.loadArmies()
            ]);
            console.log('All data loaded successfully');
            console.log('Forces data available:', !!this.dataLoaders.forces);
            console.log('Users data available:', !!this.dataLoaders.users);
            console.log('Armies data available:', !!this.dataLoaders.armies);
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

    async loadArmies() {
        try {
            console.log('Loading armies data...');
            const data = await CacheManager.fetchSheetData('armies');
            console.log('Raw armies data loaded:', data);
            
            // Handle different data formats
            if (data && data.success && data.data) {
                // Standardized format: {success: true, data: [...]}
                this.dataLoaders.armies = data.data;
                console.log('Using standardized format, armies count:', this.dataLoaders.armies.length);
            } else if (Array.isArray(data)) {
                // Direct array format
                this.dataLoaders.armies = data;
                console.log('Using direct array format, armies count:', this.dataLoaders.armies.length);
            } else {
                this.dataLoaders.armies = [];
                console.log('No armies data found');
            }
            
            console.log('Armies data structure:');
            if (this.dataLoaders.armies.length > 0) {
                console.log('First army object:', this.dataLoaders.armies[0]);
                console.log('First army keys:', Object.keys(this.dataLoaders.armies[0]));
                console.log('Total armies:', this.dataLoaders.armies.length);
                
                // Log all army force keys to debug
                console.log('All army force keys:');
                this.dataLoaders.armies.forEach((army, index) => {
                    const forceKey = army.force_key || army.Force_Key || army.forceKey;
                    const armyName = army.army_name || army.armyName || army.Name;
                    console.log(`Army ${index}: ${armyName} -> force_key: ${forceKey}`);
                });
            }
        } catch (error) {
            console.error('Error loading armies:', error);
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
                console.log(`Added force option: "${forceName}" with value: "${forceKey}"`);
            } else {
                console.log('Skipping force due to missing data:', { forceKey, forceName, faction });
            }
        });

        console.log(`Force dropdown updated with ${select.options.length - 1} options for player ${playerNum}`);

        // Re-add event listener to ensure it's properly attached
        console.log(`Re-adding event listener to force${playerNum}-select...`);
        const eventHandler = (e) => {
            console.log(`=== FORCE ${playerNum} DROPDOWN CHANGED (RE-ATTACHED) ===`);
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
        console.log(`Event listener re-attached to force${playerNum}-select`);

        // Test if event listener is working by manually triggering a change event
        console.log(`Testing event listener for force${playerNum}-select...`);
        setTimeout(() => {
            const testSelect = document.getElementById(`force${playerNum}-select`);
            if (testSelect) {
                console.log(`Force select element found:`, testSelect);
                console.log(`Element has _forceChangeHandler:`, !!testSelect._forceChangeHandler);
                
                // Try to manually trigger the event listener
                if (testSelect.options.length > 1) {
                    console.log(`Manually testing event listener with first force option...`);
                    testSelect.value = testSelect.options[1].value;
                    testSelect.dispatchEvent(new Event('change'));
                }
            }
        }, 100);

        // Auto-select if only one force
        if (forces.length === 1) {
            const firstForce = forces[0];
            const forceKey = Array.isArray(firstForce) ? firstForce[0] : (firstForce.force_key || firstForce['force_key']);
            select.value = forceKey;
            console.log(`Auto-selecting single force for player ${playerNum}: ${forceKey}`);
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
            console.log('No force selected - army dropdown will remain empty');
            return;
        }

        // Filter armies for the selected force
        console.log(`=== FILTERING ARMIES FOR FORCE: "${forceKey}" ===`);
        console.log(`Total armies available: ${this.dataLoaders.armies.length}`);
        
        const forceArmies = this.dataLoaders.armies.filter(army => {
            const armyForceKey = army.force_key || army.Force_Key || army.forceKey;
            const armyName = army.army_name || army.armyName || 'unknown';
            const matches = armyForceKey === forceKey;
            console.log(`Army "${armyName}": force_key="${army.force_key}", matches="${matches}"`);
            return matches;
        });

        console.log(`Found ${forceArmies.length} armies for force ${forceKey}`);

        // Add army options
        forceArmies.forEach(army => {
            const armyKey = army.army_key || army.Army_Key || army.armyKey || army.Key;
            const armyName = army.army_name || army.Army_Name || army.armyName || army.Name;
            const points = army.points_value || army.Points_Value || army.pointsValue || '';
            const detachment = army.detachment || army.Detachment || '';

            if (armyKey && armyName) {
                const option = document.createElement('option');
                option.value = armyKey;
                
                // Create display text with army name, points, and detachment
                let displayText = armyName;
                if (points) displayText += ` (${points}pts)`;
                if (detachment) displayText += ` - ${detachment}`;
                
                option.textContent = displayText;
                select.appendChild(option);
                console.log(`Added army option: ${armyKey} - ${displayText}`);
            }
        });

        console.log(`Army dropdown updated with ${forceArmies.length} options`);
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
                const army = this.dataLoaders.armies.find(a => {
                    const aKey = a.army_key || a.Army_Key || a.armyKey || a.Key;
                    return aKey === armyKey;
                });
                
                if (army) {
                    const armyName = army.army_name || army.Army_Name || army.armyName || army.Name;
                    hiddenField.value = armyName || '';
                    console.log(`Set army name for player ${playerNum}: ${armyName}`);
                }
            } else {
                hiddenField.value = '';
                console.log(`Cleared army name for player ${playerNum}`);
            }
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

        return {
            ...formData,
            army1: army1Name ? army1Name.value : '',
            army2: army2Name ? army2Name.value : ''
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