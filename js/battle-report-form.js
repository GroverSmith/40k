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
        this.init();
    }
    
    init() {
        console.log('Battle Report Form initialized');
        
        // Initialize base form functionality
        this.initBase();
		this.checkForCrusadeParameter();
        
        // Load available forces and crusades
        this.loadForces();
        this.loadCrusades();
        
        // Set up date field to default to today
        const dateField = document.getElementById('date-played');
        if (dateField) {
            const today = new Date().toISOString().split('T')[0];
            dateField.value = today;
        }
        
        // Set up force selection change handlers
        document.getElementById('force1-select').addEventListener('change', (e) => {
            this.handleForceSelection(1, e.target.value);
        });
        
        document.getElementById('force2-select').addEventListener('change', (e) => {
            this.handleForceSelection(2, e.target.value);
        });
        
        // Set up player name auto-population from force selection
        this.setupPlayerAutoPopulation();
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
            
            // Populate both force dropdowns
            this.populateForceDropdown('force1-select', data);
            this.populateForceDropdown('force2-select', data);
            
            console.log(`Loaded ${data.length - 1} forces`);
            
        } catch (error) {
            console.error('Error loading forces:', error);
            this.showError('Failed to load forces. Please refresh the page and try again.');
        }
    }
    
    async loadCrusades() {
        try {
            console.log('Loading crusades for battle report...');
            
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
    
    populateForceDropdown(selectId, data) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">Select force...</option>';
        
        // Skip header row, process forces
        // Column structure: 0=Key, 1=User Name, 2=Force Name, 3=Faction
        data.slice(1).forEach(row => {
            const forceKey = row[0];
            const userName = row[1];
            const forceName = row[2];
            const faction = row[3];
            
            if (forceKey && forceName) {
                const option = document.createElement('option');
                option.value = forceKey;
                option.textContent = `${forceName} (${userName}) - ${faction}`;
                option.dataset.forceName = forceName;
                option.dataset.userName = userName;
                option.dataset.faction = faction;
                select.appendChild(option);
            }
        });
    }
    
    handleForceSelection(playerNum, forceKey) {
        if (!forceKey) return;
        
        const select = document.getElementById(`force${playerNum}-select`);
        const selectedOption = select.options[select.selectedIndex];
        
        // Store force name in hidden field
        const forceNameField = document.getElementById(`force${playerNum}-name`);
        if (forceNameField) {
            forceNameField.value = selectedOption.dataset.forceName || '';
        }
        
        // Auto-populate player name if not already filled
        const playerNameField = document.getElementById(`player${playerNum}-name`);
        if (playerNameField && !playerNameField.value) {
            playerNameField.value = selectedOption.dataset.userName || '';
        }
    }
    
    setupPlayerAutoPopulation() {
        // When a player name is entered, try to pre-select their force
        document.getElementById('player1-name').addEventListener('change', (e) => {
            this.tryAutoSelectForce(1, e.target.value);
        });
        
        document.getElementById('player2-name').addEventListener('change', (e) => {
            this.tryAutoSelectForce(2, e.target.value);
        });
    }
    
    tryAutoSelectForce(playerNum, playerName) {
        if (!playerName) return;
        
        const select = document.getElementById(`force${playerNum}-select`);
        const options = select.options;
        
        // Find forces belonging to this player
        for (let i = 1; i < options.length; i++) {
            if (options[i].dataset.userName && 
                options[i].dataset.userName.toLowerCase() === playerName.toLowerCase()) {
                // Auto-select the first force found for this player
                select.value = options[i].value;
                this.handleForceSelection(playerNum, options[i].value);
                break;
            }
        }
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
        
        return { isValid: true };
    }
    
    /**
     * Override to gather battle report specific data
     */
    gatherFormData() {
        const form = document.getElementById(this.formId);
        const formData = new FormData(form);
        
        return {
            timestamp: new Date().toISOString(),
            crusadeKey: formData.get('crusadeKey') || '',
            battleName: formData.get('battleName').trim(),
            datePlayed: formData.get('datePlayed'),
            battleSize: formData.get('battleSize'),
            
            player1: formData.get('player1').trim(),
            force1Key: formData.get('force1Key'),
            force1: formData.get('force1').trim(),
            army1: formData.get('army1').trim(),
            player1Score: formData.get('player1Score') || '',
            
            player2: formData.get('player2').trim(),
            force2Key: formData.get('force2Key'),
            force2: formData.get('force2').trim(),
            army2: formData.get('army2').trim(),
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