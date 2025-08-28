// filename: crusade-details.js
// Main orchestration for Crusade Details Page using Key System
// 40k Crusade Campaign Tracker

class CrusadeDetailsApp {
    constructor() {
        this.crusadeKey = null;
        this.crusadeData = null;
        this.init();
    }
    
    init() {
        // Wait for config to be available
        if (typeof CrusadeConfig === 'undefined') {
            CrusadeUI.showError('Configuration not loaded. Please refresh the page.');
            return;
        }
        
        // Get crusade key from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.crusadeKey = urlParams.get('key') || urlParams.get('crusade');
        
        if (!this.crusadeKey) {
            // Try legacy name parameter for backward compatibility
            const crusadeName = urlParams.get('name');
            if (crusadeName) {
                console.warn('Using legacy URL format, generating key from name');
                this.crusadeKey = CrusadeData.generateCrusadeKey(decodeURIComponent(crusadeName));
            } else {
                CrusadeUI.showError('No crusade specified. Please select a crusade from the main page.');
                return;
            }
        }
        
        console.log('Loading data for crusade key:', this.crusadeKey);
        this.loadCrusadeData();
    }
    
    async loadCrusadeData() {
        try {
            console.log('Starting loadCrusadeData with key:', this.crusadeKey);
            
            // Load main crusade data
            console.log('Loading main crusade data...');
            this.crusadeData = await CrusadeData.loadCrusadeData(this.crusadeKey);
            console.log('Main crusade data loaded successfully:', this.crusadeData);
            
            // Update UI with crusade data
            this.displayCrusadeContent();
            
            // Initialize force registration with crusade key
            ForceRegistration.init(this.crusadeData);
            
            // Load participating forces using crusade key
            console.log('Loading participating forces...');
            await this.loadParticipatingForces();
            console.log('Participating forces loaded');
            
            console.log('All data loading complete!');
            
        } catch (error) {
            console.error('Error in loadCrusadeData:', error);
            CrusadeUI.showError('Failed to load crusade data: ' + error.message);
        }
    }    
    

	displayCrusadeContent() {
		// Update header
		CrusadeUI.updateHeader(this.crusadeData, this.crusadeData['Crusade Name']);
		
		// Display sections
		CrusadeUI.displayIntroduction(this.crusadeData);
		CrusadeUI.displayRules(this.crusadeData);
		CrusadeUI.displayNarrative(this.crusadeData);
		
		// Show the crusade actions (battle button) with the crusade key
		const crusadeKey = this.crusadeData.key || this.crusadeData.Key || 
						  CrusadeData.generateCrusadeKey(this.crusadeData['Crusade Name']);
		showCrusadeActions(crusadeKey);
	}
    
    async loadParticipatingForces() {
        try {
            // Use the crusade key
            const crusadeKey = this.crusadeData.key || this.crusadeData.Key || 
                              CrusadeData.generateCrusadeKey(this.crusadeData['Crusade Name']);
            
            const result = await CrusadeData.loadParticipatingForces(crusadeKey);
            
            if (result.success) {
                CrusadeUI.displayParticipatingForces(result.forces, this.crusadeData['Crusade Name']);
            } else {
                CrusadeUI.showDataError('forces-content', result.error || 'Failed to load participating forces');
            }
            
        } catch (error) {
            console.error('Error loading participating forces:', error);
            CrusadeUI.showDataError('forces-content', 'Failed to load participating forces');
        }
    }
    
    // Public methods for debugging
    refreshCrusade() {
        console.log('Refreshing crusade data...');
        this.loadCrusadeData();
    }
    
    getCrusadeData() {
        return this.crusadeData;
    }
    
    getCrusadeKey() {
        return this.crusadeKey;
    }
}

// Initialize the crusade details app when page loads
document.addEventListener('DOMContentLoaded', () => {
    const crusadeApp = new CrusadeDetailsApp();
    
    // Make it globally available for debugging
    window.CrusadeDetailsApp = crusadeApp;
    
    // Make loadParticipatingForces available globally for force registration callback
    window.loadParticipatingForces = () => crusadeApp.loadParticipatingForces();
    
    console.log('Crusade Details page initialized with key system');
});

// Global sorting variables for participants table
let participantsSortColumn = null;
let participantsSortDirection = 'asc';

// Global function for sorting participants table
function sortParticipantsTable(columnIndex) {
    if (!window.participantsTableData) return;
    
    // Toggle sort direction if clicking the same column
    if (participantsSortColumn === columnIndex) {
        participantsSortDirection = participantsSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        participantsSortColumn = columnIndex;
        participantsSortDirection = 'asc';
    }
    
    // Sort the data
    const sortedData = [...window.participantsTableData];
    sortedData.sort((a, b) => {
        let aVal = a[columnIndex] || '';
        let bVal = b[columnIndex] || '';
        
        // Special handling for dates (column 2 is timestamp)
        if (columnIndex === 2) {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
            
            if (participantsSortDirection === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        } else {
            // String sort for other columns
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            
            if (participantsSortDirection === 'asc') {
                return aVal.localeCompare(bVal);
            } else {
                return bVal.localeCompare(aVal);
            }
        }
    });
    
    // Update the table display
    updateParticipantsTableDisplay(sortedData);
    
    // Update sort indicators
    updateSortIndicators(columnIndex, participantsSortDirection);
}

function updateParticipantsTableDisplay(sortedData) {
    const tbody = document.querySelector('#participants-table tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Add sorted rows
    sortedData.forEach(rowData => {
        const registrationDate = new Date(rowData[2]).toLocaleDateString();
        const forceKey = rowData[3]; // Force key
        const forceName = rowData[0]; // Force name
        const userName = rowData[1];
        
        // Create link to force details page using key
        const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceKey);
        const forceNameLink = `<a href="${forceUrl}" 
                                style="color: #4ecdc4; text-decoration: none; transition: color 0.3s ease;"
                                onmouseover="this.style.color='#7fefea'" 
                                onmouseout="this.style.color='#4ecdc4'"
                                title="View ${forceName} details">${forceName}</a>`;
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #4a4a4a';
        row.style.color = '#ffffff';
        row.onmouseover = () => row.style.backgroundColor = '#3a3a3a';
        row.onmouseout = () => row.style.backgroundColor = '';
        
        row.innerHTML = `
            <td style="padding: 8px 12px;">${forceNameLink}</td>
            <td style="padding: 8px 12px;">${userName}</td>
            <td style="padding: 8px 12px;">${registrationDate}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateSortIndicators(activeColumn, direction) {
    // Reset all indicators
    const indicators = document.querySelectorAll('.sort-indicator');
    indicators.forEach((indicator, index) => {
        if (index === activeColumn) {
            indicator.innerHTML = direction === 'asc' ? '▲' : '▼';
            indicator.style.color = '#4ecdc4';
        } else {
            indicator.innerHTML = '⇅';
            indicator.style.color = '#cccccc';
        }
    });
}

function showCrusadeActions(crusadeKey) {
    const actionsDiv = document.getElementById('crusade-actions');
    if (actionsDiv) {
        // Update the link to include the crusade key as a parameter
        const battleLink = actionsDiv.querySelector('a[href*="add-battle-report"]');
        if (battleLink && crusadeKey) {
            // Add the crusade key as a URL parameter
            const baseUrl = '../battle-reports/add-battle-report.html';
            battleLink.href = `${baseUrl}?crusade=${encodeURIComponent(crusadeKey)}`;
        }
        actionsDiv.style.display = 'block';
    }
}

// Also, to auto-select the crusade in the battle report form when coming from crusade details
// Add this to battle-report-form.js in the init() method:

function checkForCrusadeParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const crusadeKey = urlParams.get('crusade');
    
    if (crusadeKey) {
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
            }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(() => clearInterval(checkAndSelect), 5000);
    }
}

// Utility functions for crusade page
const CrusadePageUtils = {
    // Convert crusade data to URL parameter using key
    createCrusadeUrl(crusadeKey, basePath = 'crusades/') {
        const encodedKey = encodeURIComponent(crusadeKey);
        return `${basePath}crusade-details.html?key=${encodedKey}`;
    },
    
    // Get current crusade key from URL
    getCurrentCrusadeKey() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('key') || urlParams.get('crusade');
    },
    
    // Generate crusade key from name
    generateCrusadeKey(crusadeName) {
        return crusadeName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
    }
};

// Export for use in other modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CrusadeDetailsApp, CrusadePageUtils };
}