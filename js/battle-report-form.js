// filename: battle-report-form.js
// Battle Report Form - Extends BaseForm for battle report submissions
// 40k Crusade Campaign Tracker

class BattleReportForm extends BaseForm {
    constructor() {
        super('battle-report-form', {
            submitUrl: CrusadeConfig ? CrusadeConfig.getSheetUrl('battleHistory') : '',
            successMessage: 'Battle report submitted successfully!',
            errorMessage: 'Failed to submit battle report'
        });
        
        this.forcesData = [];
        this.crusadesData = [];
        this.usersData = [];
        this.armyListsData = [];
        this.init();
    }
    
    init() {
        console.log('Battle Report Form initialized');
        
        // Initialize base form functionality
        this.initBase();
        this.checkForCrusadeParameter();
        
        // Set up date field to default to today
        const dateField = document.getElementById('date-played');
        if (dateField) {
            const today = new Date().toISOString().split('T')[0];
            dateField.value = today;
        }
        
        // Set up custom battle size functionality
        this.setupCustomBattleSize();
        
        // IMPORTANT: Set up player dropdowns FIRST (convert inputs to selects)
        this.setupPlayerDropdowns();
        
        // THEN load data (which will populate the dropdowns)
        this.loadAllData();
    }
    
    async loadAllData() {
        console.log('Starting loadAllData...');
        
        // Load all data in parallel for better performance
        const results = await Promise.allSettled([
            this.loadUsers(),
            this.loadForces(), 
            this.loadCrusades(),
            this.loadArmyLists()
        ]);
        
        // Log results for debugging
        results.forEach((result, index) => {
            const names = ['Users', 'Forces', 'Crusades', 'Army Lists'];
            if (result.status === 'rejected') {
                console.error(`Failed to load ${names[index]}:`, result.reason);
            } else {
                console.log(`Successfully loaded ${names[index]}`);
            }
        });
    }
    
    setupCustomBattleSize() {
        const battleSizeSelect = document.getElementById('battle-size');
        
        // Create custom input field
        const customInput = document.createElement('input');
        customInput.type = 'number';
        customInput.id = 'custom-battle-size';
        customInput.name = 'customBattleSize';
        customInput.placeholder = 'Enter points';
        customInput.min = '100';
        customInput.max = '10000';
        customInput.step = '50';
        customInput.style.cssText = `
            display: none;
            width: 120px;
            margin-left: 10px;
            padding: 8px;
            font-size: 14px;
            background-color: var(--color-bg-main);
            color: var(--color-text);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
        `;
        
        // Insert after the select
        battleSizeSelect.parentNode.insertBefore(customInput, battleSizeSelect.nextSibling);
        
        // Set default to Custom
        battleSizeSelect.value = 'Custom';
        customInput.style.display = 'inline-block';
        customInput.value = '1000'; // Default custom value
        
        // Handle select change
        battleSizeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Custom') {
                customInput.style.display = 'inline-block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
            }
        });
        
        // Update the option text from "Other" to "Custom"
        const options = battleSizeSelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === 'Other') {
                options[i].value = 'Custom';
                options[i].text = 'Custom';
                break;
            }
        }
    }
    
    setupPlayerDropdowns() {
        // Convert player name text inputs to dropdowns
        const player1Field = document.getElementById('player1-name');
        const player2Field = document.getElementById('player2-name');
        
        console.log('Setting up player dropdowns. Found player1Field:', !!player1Field, 'player2Field:', !!player2Field);
        
        if (player1Field && player1Field.tagName === 'INPUT') {
            this.convertToPlayerDropdown(player1Field, 'player1-name', 1);
        } else if (player1Field && player1Field.tagName === 'SELECT') {
            console.log('Player 1 field is already a select element');
        }
        
        if (player2Field && player2Field.tagName === 'INPUT') {
            this.convertToPlayerDropdown(player2Field, 'player2-name', 2);
        } else if (player2Field && player2Field.tagName === 'SELECT') {
            console.log('Player 2 field is already a select element');
        }
        
        // Convert army list inputs to dropdowns
        const army1Field = document.getElementById('army1-name');
        const army2Field = document.getElementById('army2-name');
        
        if (army1Field && army1Field.tagName === 'INPUT') {
            this.convertToArmyListDropdown(army1Field, 'army1-select', 1);
        }
        
        if (army2Field && army2Field.tagName === 'INPUT') {
            this.convertToArmyListDropdown(army2Field, 'army2-select', 2);
        }
        
        // Set up force selection change handlers
        const force1Select = document.getElementById('force1-select');
        const force2Select = document.getElementById('force2-select');
        
        if (force1Select) {
            force1Select.addEventListener('change', (e) => {
                this.handleForceSelection(1, e.target.value);
            });
        }
        
        if (force2Select) {
            force2Select.addEventListener('change', (e) => {
                this.handleForceSelection(2, e.target.value);
            });
        }
    }
    
    convertToPlayerDropdown(inputField, fieldId, playerNum) {
        // Create select element
        const select = document.createElement('select');
        select.id = fieldId;
        select.name = inputField.name;
        select.required = inputField.required;
        select.className = inputField.className;
        
        // Copy any data attributes
        for (let attr of inputField.attributes) {
            if (attr.name.startsWith('data-')) {
                select.setAttribute(attr.name, attr.value);
            }
        }
        
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select player...';
        select.appendChild(placeholderOption);
        
        // Replace input with select
        inputField.parentNode.replaceChild(select, inputField);
        
        // Set up change handler
        select.addEventListener('change', (e) => {
            this.handlePlayerSelection(playerNum, e.target.value);
        });
    }
    
    convertToArmyListDropdown(inputField, fieldId, playerNum) {
        // Create select element
        const select = document.createElement('select');
        select.id = fieldId;
        select.name = inputField.name;
        select.className = inputField.className;
        
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select army list (optional)...';
        select.appendChild(placeholderOption);
        
        // Replace input with select
        inputField.parentNode.replaceChild(select, inputField);
    }
    
    async loadUsers() {
        try {
            console.log('Loading users for battle report...');
            
            // Initialize as empty array to prevent errors
            this.usersData = [];
            
            // Check cache first
            const cachedData = UserStorage.loadCachedUsers();
            if (cachedData && cachedData.valid && cachedData.users && Array.isArray(cachedData.users)) {
                console.log('Using cached users data:', cachedData.users);
                this.usersData = cachedData.users;
                this.populatePlayerDropdowns();
                return;
            }
            
            // Check if UserManager has users loaded
            if (window.UserManager && window.UserManager.users && Array.isArray(window.UserManager.users) && window.UserManager.users.length > 0) {
                console.log('Using UserManager users:', window.UserManager.users);
                this.usersData = window.UserManager.users;
                this.populatePlayerDropdowns();
                return;
            }
            
            // Load directly from API
            console.log('Loading users from API...');
            const users = await UserAPI.loadUsers();
            
            if (users && Array.isArray(users)) {
                console.log('Loaded users from API:', users);
                this.usersData = users;
                this.populatePlayerDropdowns();
            } else {
                console.warn('No users loaded from API');
                this.populatePlayerDropdowns(); // Call with empty array
            }
            
        } catch (error) {
            console.error('Error loading users:', error);
            // Still populate dropdowns even if empty
            this.populatePlayerDropdowns();
        }
    }
    
    populatePlayerDropdowns() {
        const player1Select = document.getElementById('player1-name');
        const player2Select = document.getElementById('player2-name');
        
        // Check if dropdowns exist and are SELECT elements (not INPUT)
        if (!player1Select || !player2Select || 
            player1Select.tagName !== 'SELECT' || player2Select.tagName !== 'SELECT') {
            console.log('Player dropdowns not ready yet (may still be input fields)');
            return;
        }
        
        // Check if we have users data
        if (!this.usersData || !Array.isArray(this.usersData)) {
            console.warn('usersData not ready yet:', this.usersData);
            return;
        }
        
        // Clear existing options (except placeholder)
        while (player1Select.options.length > 1) {
            player1Select.remove(1);
        }
        while (player2Select.options.length > 1) {
            player2Select.remove(1);
        }
        
        if (this.usersData.length === 0) {
            console.warn('No users available for dropdowns');
            return;
        }
        
        // Add user options to both dropdowns
        this.usersData.forEach(user => {
            if (!user || !user.name) {
                console.warn('Invalid user data:', user);
                return;
            }
            
            const option1 = document.createElement('option');
            option1.value = user.name;
            option1.textContent = user.name;
            player1Select.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = user.name;
            option2.textContent = user.name;
            player2Select.appendChild(option2);
        });
        
        console.log(`Populated player dropdowns with ${this.usersData.length} users`);
        
        // Auto-select current user if available
        if (window.UserManager && window.UserManager.currentUser) {
            const currentUserName = window.UserManager.currentUser.name;
            
            // Set Player 1 to current user by default
            player1Select.value = currentUserName;
            // Trigger change event to update forces
            this.handlePlayerSelection(1, currentUserName);
        }
    }
    
    handlePlayerSelection(playerNum, playerName) {
        if (!playerName) {
            // Clear force dropdown if no player selected
            this.updateForceDropdown(playerNum, []);
            return;
        }
        
        // Filter forces for this player
        const playerForces = this.forcesData.slice(1).filter(row => {
            const userName = row[1]; // User Name is column 1
            return userName === playerName;
        });
        
        // Update force dropdown
        this.updateForceDropdown(playerNum, playerForces);
        
        // Auto-select most recent force
        if (playerForces.length > 0) {
            // Sort by timestamp (column 6) and get most recent
            const sortedForces = [...playerForces].sort((a, b) => {
                const dateA = new Date(a[6] || 0);
                const dateB = new Date(b[6] || 0);
                return dateB - dateA; // Most recent first
            });
            
            const mostRecentForce = sortedForces[0];
            const forceSelect = document.getElementById(`force${playerNum}-select`);
            if (forceSelect) {
                forceSelect.value = mostRecentForce[0]; // Force key is column 0
                this.handleForceSelection(playerNum, mostRecentForce[0]);
            }
        }
    }
    
    updateForceDropdown(playerNum, forces) {
        const select = document.getElementById(`force${playerNum}-select`);
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '<option value="">Select force...</option>';
        
        // Add filtered forces
        forces.forEach(row => {
            const forceKey = row[0];    // Key column
            const userName = row[1];    // User Name column
            const forceName = row[2];   // Force Name column
            const faction = row[3];     // Faction column
            
            if (!forceKey || !forceName) {
                console.warn('Skipping force with missing key or name:', row);
                return;
            }
            
            const option = document.createElement('option');
            option.value = forceKey;
            option.textContent = `${forceName} - ${faction}`;
            
            // Set data attributes for later use
            option.dataset.forceName = forceName;
            option.dataset.userName = userName;
            option.dataset.faction = faction;
            
            select.appendChild(option);
        });
        
        if (forces.length === 0) {
            select.innerHTML = '<option value="">No forces for this player</option>';
        }
        
        console.log(`Force dropdown ${playerNum} populated with ${forces.length} forces`);
    }
    
    handleForceSelection(playerNum, forceKey) {
        if (!forceKey) {
            // Clear army list dropdown and force name
            this.updateArmyListDropdown(playerNum, []);
            const forceNameField = document.getElementById(`force${playerNum}-name`);
            if (forceNameField) {
                forceNameField.value = '';
            }
            return;
        }
        
        const select = document.getElementById(`force${playerNum}-select`);
        const selectedOption = select.options[select.selectedIndex];
        
        // Store force name in hidden field - this is CRITICAL for the form submission
        const forceNameField = document.getElementById(`force${playerNum}-name`);
        if (forceNameField) {
            // Get the force name from the dataset
            const forceName = selectedOption.dataset.forceName || '';
            console.log(`Setting force${playerNum} name to:`, forceName);
            forceNameField.value = forceName;
        } else {
            console.error(`Hidden field force${playerNum}-name not found!`);
        }
        
        // Check if armyListsData is properly loaded and is an array
        if (!this.armyListsData || !Array.isArray(this.armyListsData)) {
            console.warn('Army lists data not available or not an array:', this.armyListsData);
            this.updateArmyListDropdown(playerNum, []);
            return;
        }
        
        // Filter army lists for this force
        // Skip header row if present
        const dataToFilter = this.armyListsData.length > 0 && Array.isArray(this.armyListsData[0]) 
            ? this.armyListsData.slice(1)  // Skip header row for raw sheet data
            : this.armyListsData;           // Use as-is for processed data
        
        const forceArmyLists = dataToFilter.filter(row => {
            // Handle both array format and object format
            if (Array.isArray(row)) {
                const armyForceKey = row[1]; // Force Key is column 1
                return armyForceKey === forceKey;
            } else if (row && typeof row === 'object') {
                return row['Force Key'] === forceKey || row.forceKey === forceKey;
            }
            return false;
        });
        
        console.log(`Found ${forceArmyLists.length} army lists for force ${forceKey}`);
        
        // Update army list dropdown
        this.updateArmyListDropdown(playerNum, forceArmyLists);
    }
    
    updateArmyListDropdown(playerNum, armyLists) {
        const select = document.getElementById(`army${playerNum}-select`);
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '<option value="">Select army list (optional)...</option>';
        
        // Add filtered army lists
        armyLists.forEach(row => {
            let armyKey, armyName, points;
            
            // Handle both array and object formats
            if (Array.isArray(row)) {
                armyKey = row[0];       // Key is column 0
                armyName = row[5];      // Army Name is column 5
                points = row[9];        // Points Value is column 9
            } else if (row && typeof row === 'object') {
                armyKey = row.Key || row.key || row.id;
                armyName = row['Army Name'] || row.armyName || row.name;
                points = row['Points Value'] || row.pointsValue || row.points;
            }
            
            if (!armyName) {
                console.warn('Army list missing name:', row);
                return;
            }
            
            const option = document.createElement('option');
            option.value = armyName;
            option.textContent = points ? `${armyName} (${points} pts)` : armyName;
            option.dataset.armyKey = armyKey || '';
            option.dataset.points = points || '';
            select.appendChild(option);
        });
        
        if (armyLists.length === 0) {
            select.innerHTML = '<option value="">No army lists for this force</option>';
        }
    }
    
    async loadArmyLists() {
        try {
            console.log('Loading army lists for battle report...');
            
            const armyListsUrl = CrusadeConfig.getSheetUrl('armyLists');
            if (!armyListsUrl) {
                console.log('Army Lists sheet URL not configured, skipping');
                this.armyListsData = [];
                return;
            }
            
            const response = await fetch(armyListsUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch army lists data');
            }
            
            const responseData = await response.json();
            
            // Handle different response formats
            if (Array.isArray(responseData)) {
                this.armyListsData = responseData;
            } else if (responseData.success && Array.isArray(responseData.data)) {
                // If it's wrapped in a success response, use the data array
                this.armyListsData = responseData.data;
            } else if (responseData.data && Array.isArray(responseData.data)) {
                // Sometimes just has data property
                this.armyListsData = responseData.data;
            } else {
                console.warn('Unexpected army lists response format:', responseData);
                this.armyListsData = [];
            }
            
            console.log(`Loaded ${Array.isArray(this.armyListsData) ? this.armyListsData.length - 1 : 0} army lists`);
            
        } catch (error) {
            console.error('Error loading army lists:', error);
            this.armyListsData = [];
            // Not critical if army lists don't load
        }
    }
    
    checkForCrusadeParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        const crusadeKey = urlParams.get('crusade');
        
        if (crusadeKey) {
            console.log('Found crusade parameter:', crusadeKey);
            
            // Wait for crusades to load, then select the matching one
            const checkAndSelect = setInterval(() => {
                const crusadeSelect = document.getElementById('crusade-select');
                if (crusadeSelect && crusadeSelect.options.length > 1) {
                    for (let option of crusadeSelect.options) {
                        if (option.value === crusadeKey) {
                            crusadeSelect.value = crusadeKey;
                            clearInterval(checkAndSelect);
                            console.log('Auto-selected crusade:', crusadeKey);
                            break;
                        }
                    }
                    // If we've checked all options and didn't find it, stop trying
                    if (crusadeSelect.options.length > 1) {
                        clearInterval(checkAndSelect);
                    }
                }
            }, 100);
            
            // Stop checking after 5 seconds
            setTimeout(() => clearInterval(checkAndSelect), 5000);
        }
    }
    
    async loadForces() {
        try {
            console.log('Loading forces for battle report...');
            
            // Check cache first
            const cachedData = UserStorage.loadCachedForces();
            if (cachedData.valid) {
                console.log('Using cached forces data');
                this.forcesData = cachedData.forces;
                return;
            }
            
            const forceSheetUrl = CrusadeConfig.getSheetUrl('forces');
            if (!forceSheetUrl) {
                throw new Error('Forces sheet URL not configured');
            }
            
            const response = await fetch(forceSheetUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch force data');
            }
            
            const data = await response.json();
            this.forcesData = data;
            
            // Save to cache
            UserStorage.saveForcesToCache(data);
            
            console.log(`Loaded ${data.length - 1} forces`);
            
        } catch (error) {
            console.error('Error loading forces:', error);
            this.showError('Failed to load forces. Please refresh the page and try again.');
        }
    }
    
    async loadCrusades() {
        try {
            console.log('Loading crusades for battle report...');
            
            // Check cache first
            const cachedData = UserStorage.loadCachedCrusades();
            if (cachedData.valid) {
                console.log('Using cached crusades data');
                this.crusadesData = cachedData.crusades;
                this.populateCrusadeDropdown(cachedData.crusades);
                return;
            }
            
            const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
            if (!crusadesUrl) {
                console.log('Crusades sheet URL not configured, skipping');
                return;
            }
            
            const response = await fetch(crusadesUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch crusade data');
            }
            
            const data = await response.json();
            this.crusadesData = data;
            
            // Save to cache for 24 hours
            UserStorage.saveCrusadesToCache(data);
            
            // Populate crusade dropdown
            this.populateCrusadeDropdown(data);
            
            console.log(`Loaded ${data.length - 1} crusades`);
            
        } catch (error) {
            console.error('Error loading crusades:', error);
            // Not critical if crusades don't load
        }
    }
    
    populateCrusadeDropdown(data) {
        const select = document.getElementById('crusade-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select crusade (optional)...</option>';
        
        // Skip header row, process crusades
        // Column structure: 0=Key, 1=State, 2=Crusade Name, 3=Type
        data.slice(1).forEach(row => {
            const crusadeKey = row[0];
            const state = row[1];
            const crusadeName = row[2];
            const crusadeType = row[3];
            
            if (crusadeKey && crusadeName) {
                const option = document.createElement('option');
                option.value = crusadeKey;
                option.textContent = `${crusadeName} (${state})`;
                option.dataset.crusadeName = crusadeName;
                option.dataset.state = state;
                select.appendChild(option);
            }
        });
    }
    
    /**
     * Override to add specific field validation
     */
    validateSpecificField(field, value) {
        // Check that different forces are selected
        if (field.id === 'force2-select' && value) {
            const force1 = document.getElementById('force1-select').value;
            if (force1 === value) {
                return {
                    isValid: false,
                    errorMessage: 'Please select different forces for each player.'
                };
            }
        }
        
        // Validate scores
        if ((field.id === 'player1-score' || field.id === 'player2-score') && value) {
            const score = parseInt(value);
            if (score < 0 || score > 100) {
                return {
                    isValid: false,
                    errorMessage: 'Score must be between 0 and 100.'
                };
            }
        }
        
        // Validate custom battle size if selected
        if (field.id === 'custom-battle-size' && 
            document.getElementById('battle-size').value === 'Custom') {
            const size = parseInt(value);
            if (!value || size < 100 || size > 10000) {
                return {
                    isValid: false,
                    errorMessage: 'Custom battle size must be between 100 and 10,000 points.'
                };
            }
        }
        
        return { isValid: true };
    }
    
    /**
     * Override to gather battle report specific data
     */
    gatherFormData() {
        const form = document.getElementById(this.formId);
        const formData = new FormData(form);
        
        // Handle custom battle size
        let battleSize = formData.get('battleSize');
        if (battleSize === 'Custom') {
            battleSize = formData.get('customBattleSize') || '';
        }
        
        // Get army list names from dropdowns
        const army1Select = document.getElementById('army1-select');
        const army2Select = document.getElementById('army2-select');
        const army1 = army1Select ? army1Select.value : formData.get('army1');
        const army2 = army2Select ? army2Select.value : formData.get('army2');
        
        // The order here MUST match the column order expected by the Google Apps Script
        // From battle-gas-script.js, the expected order is:
        // timestamp, crusadeKey, battleName, datePlayed, battleSize,
        // player1, force1Key, force1, army1, player1Score,
        // player2, force2Key, force2, army2, player2Score,
        // victor, summaryNotes
        
        return {
            timestamp: new Date().toISOString(),
            crusadeKey: formData.get('crusadeKey') || '',
            battleName: formData.get('battleName').trim(),
            datePlayed: formData.get('datePlayed'),
            battleSize: battleSize,
            
            player1: formData.get('player1').trim(),
            force1Key: formData.get('force1Key'),
            force1: formData.get('force1').trim(),
            army1: army1 || '',
            player1Score: formData.get('player1Score') || '',
            
            player2: formData.get('player2').trim(),
            force2Key: formData.get('force2Key'), 
            force2: formData.get('force2').trim(),
            army2: army2 || '',
            player2Score: formData.get('player2Score') || '',
            
            victor: formData.get('victor') || '',
            summaryNotes: formData.get('summaryNotes').trim()
        };
    }
    
    /**
     * Override to return correct instance name
     */
    getFormInstanceName() {
        return 'battleReportForm';
    }
}

// Global utility functions
function resetForm() {
    const form = document.getElementById('battle-report-form');
    if (form) {
        form.reset();
        
        // Reset date to today
        const dateField = document.getElementById('date-played');
        if (dateField) {
            const today = new Date().toISOString().split('T')[0];
            dateField.value = today;
        }
        
        // Reset custom battle size to default
        const battleSize = document.getElementById('battle-size');
        const customSize = document.getElementById('custom-battle-size');
        if (battleSize && customSize) {
            battleSize.value = 'Custom';
            customSize.style.display = 'inline-block';
            customSize.value = '1000';
        }
        
        form.style.display = 'block';
    }
    
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    const errorElements = document.querySelectorAll('.field-error');
    errorElements.forEach(element => element.remove());
    
    const fields = document.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.style.borderColor = '#4a4a4a';
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideMessages() {
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('battle-report-form').style.display = 'block';
}

// Initialize the form when page loads
let battleReportForm;
document.addEventListener('DOMContentLoaded', () => {
    battleReportForm = new BattleReportForm();
    console.log('Battle Report Form page initialized');
});

// Make globally available
window.BattleReportForm = BattleReportForm;