// filename: crusade-details.js
// Main orchestration for Crusade Details Page
// 40k Crusade Campaign Tracker

class CrusadeDetailsApp {
    constructor() {
        this.crusadeName = null;
        this.crusadeData = null;
        this.init();
    }
    
    init() {
        // Wait for config to be available
        if (typeof CrusadeConfig === 'undefined') {
            CrusadeUI.showError('Configuration not loaded. Please refresh the page.');
            return;
        }
        
        // Get crusade name from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.crusadeName = urlParams.get('crusade') || urlParams.get('name');
        
        if (!this.crusadeName) {
            CrusadeUI.showError('No crusade specified. Please select a crusade from the main page.');
            return;
        }
        
        // Decode the crusade name
        this.crusadeName = decodeURIComponent(this.crusadeName);
        
        console.log('Loading data for crusade:', this.crusadeName);
        this.loadCrusadeData();
    }
    
    async loadCrusadeData() {
        try {
            console.log('Starting loadCrusadeData...');
            
            // Load main crusade data
            console.log('Loading main crusade data...');
            this.crusadeData = await CrusadeData.loadCrusadeData(this.crusadeName);
            console.log('Main crusade data loaded successfully');
            
            // Update UI with crusade data
            this.displayCrusadeContent();
            
            // Initialize force registration
            ForceRegistration.init(this.crusadeData);
            
            // Load participating forces
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
        CrusadeUI.updateHeader(this.crusadeData, this.crusadeName);
        
        // Display sections
        CrusadeUI.displayIntroduction(this.crusadeData);
        CrusadeUI.displayRules(this.crusadeData);
        CrusadeUI.displayNarrative(this.crusadeData);
    }
    
    async loadParticipatingForces() {
        try {
            const result = await CrusadeData.loadParticipatingForces(this.crusadeData['Crusade Name']);
            
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
}

// Initialize the crusade details app when page loads
document.addEventListener('DOMContentLoaded', () => {
    const crusadeApp = new CrusadeDetailsApp();
    
    // Make it globally available for debugging
    window.CrusadeDetailsApp = crusadeApp;
    
    // Make loadParticipatingForces available globally for force registration callback
    window.loadParticipatingForces = () => crusadeApp.loadParticipatingForces();
    
    console.log('Crusade Details page initialized with modular architecture');
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
        const forceName = rowData[0];
        const userName = rowData[1];
        
        // Create link to force details page
        const forceUrl = CrusadeConfig.buildForceUrlFromSubdir(forceName);
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

// Utility functions for crusade page
const CrusadePageUtils = {
    // Convert crusade name to URL parameter
    createCrusadeUrl(crusadeName, basePath = 'crusades/') {
        const encodedName = encodeURIComponent(crusadeName);
        return `${basePath}crusade-details.html?crusade=${encodedName}`;
    },
    
    // Get current crusade name from URL
    getCurrentCrusadeName() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('crusade') || urlParams.get('name');
    }
};

// Export for use in other modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CrusadeDetailsApp, CrusadePageUtils };
}