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
        
        // Load data from cache or API
        this.loadAllData();
        
        // Set up date field to default to today
        const dateField = document.getElementById('date-played');
        if (dateField) {
            const today = new Date().toISOString().split('T')[0];
            dateField.value = today;
        }
        
        // Set up custom battle size functionality
        this.setupCustomBattleSize();
        
        // Set up player dropdowns
        this.setupPlayerDropdowns();
    }
    
    async loadAllData() {
        // Load all data in parallel for better performance
        await Promise.all([
            this.loadUsers(),
            this.loadForces(),
            this.loadCrusades(),
            this.loadArmyLists()
        ]);
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
        
        if (player1Field) {
            this.convertToPlayerDropdown(player1Field, 'player1-name', 1);
        }
        
        if (player2Field) {
            this.convertToPlayerDropdown(player2Field, 'player2-name', 2);
        }
        
        // Convert army list inputs to dropdowns
        const army1Field = document.getElementById('army1-name');
        const army2Field = document.getElementById('army2-name');
        
        if (army1Field) {
            this.convertToArmyListDropdown(army1Field, 'army1-select', 1);
        }
        
        if (army2Field) {
            this.convertToArmyListDropdown(army2Field, 'army2-select', 2);
        }
        
        // Set up force selection change handlers
        document.getElementById('force1-select').addEventListener('change', (e) => {
            this.handleForceSelection(1, e.target.value);
        });
        
        document.getElementById('force2-select').addEventListener('change', (e) => {
            this.handleForceSelection(2, e.target.value);
        });
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
            
            // Check cache first
            const cachedData = UserStorage.loadCachedUsers();
            if (cachedData.valid) {
                console.log('Using cached users data');
                this.usersData = cachedData.users;
                this.populatePlayerDropdowns();
                return;
            }
            
            // Load from API if needed
            if (window.UserManager && window.UserManager.users.length > 0) {
                this.usersData = window.UserManager.users;
                this.populatePlayerDropdowns();
            } else {
                // Load directly if UserManager not available
                const users = await UserAPI.loadUsers();
                if (users) {
                    this.usersData = users;
                    this.populatePlayerDropdowns();
                }
            }
            
        } catch (error) {
            console.error('Error loading users:', error);
            // Fall back to text inputs if we can't load users
        }
    }
    
    populatePlayerDropdowns() {
        const player1Select = document.getElementById('player1-name');
        const player2Select = document.getElementById('player2-name');
        
        if (!player1Select || !player2Select) return;
        
        // Clear existing options (except placeholder)
        while (player1Select.options.length > 1) {
            player1Select.remove(1);
        }
        while (player2Select.options.length > 1) {
            player2Select.remove(1);
        }
        
        // Add user options to both dropdowns
        this.usersData.forEach(user => {
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
            const forceKey = row[0];
            const userName = row[1];
            const forceName = row[2];
            const faction = row[3];
            
            const option = document.createElement('option');
            option.value = forceKey;
            option.textContent = `${forceName} - ${faction}`;
            option.dataset.forceName = forceName;
            option.dataset.userName = userName;
            option.dataset.faction = faction;
            select.appendChild(option);
        });
        
        if (forces.length === 0) {
            select.innerHTML = '<option value="">No forces for this player</option>';
        }
    }
    
    handleForceSelection(playerNum, forceKey) {
        if (!forceKey) {
            // Clear army list dropdown
            this.updateArmyListDropdown(playerNum, []);
            return;
        }
        
        const select = document.getElementById(`force${playerNum}-select`);
        const selectedOption = select.options[select.selectedIndex];
        
        // Store force name in hidden field
        const forceNameField = document.getElementById(`force${playerNum}-name`);
        if (forceNameField) {
            forceNameField.value = selectedOption.dataset.forceName || '';
        }
        
        // Filter army lists for this force
        const forceArmyLists = this.armyListsData.slice(1).filter(row => {
            const armyForceKey = row[1]; // Force Key is column 1
            return armyForceKey === forceKey;
        });
        
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
            const armyKey = row[0];
            const armyName = row[5]; // Army Name is column 5
            const points = row[9];   // Points Value is column 9
            
            const option = document.createElement('option');
            option.value = armyName;
            option.textContent = points ? `${armyName} (${points} pts)` : armyName;
            option.dataset.armyKey = armyKey;
            option.dataset.points = points;
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
                return;
            }
            
            const response = await fetch(armyListsUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch army lists data');
            }
            
            const data = await response.json();
            this.armyListsData = data;
            
            console.log(`Loaded ${data.length - 1} army lists`);
            
        } catch (error) {
            console.error('Error loading army lists:', error);
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