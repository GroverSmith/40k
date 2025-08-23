// Crusade Force Page - Individual force data management
// 40k Crusade Campaign Tracker

class CrusadeForceApp {
    constructor() {
        this.forceName = null;
        this.forceData = null;
        this.config = {
            // Google Sheets URLs - you can easily update these
            forceSheetUrl: 'https://script.google.com/macros/s/AKfycbw81ZEFEAzOrfvOxWBHHT17kGqLrk3g-VpXuDeUbK_8YehP1dNe8FEUMf6PuDzZ4JnH/exec',
            battleHistoryUrl: null, // Add your battle history sheet URL here
            rosterUrl: null,        // Add your roster sheet URL here
            progressUrl: null       // Add your progress tracking sheet URL here
        };
        this.init();
    }
    
    init() {
        // Get force name from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.forceName = urlParams.get('force') || urlParams.get('name');
        
        if (!this.forceName) {
            this.showError('No force specified. Please select a force from the main page.');
            return;
        }
        
        // Decode the force name (in case it was URL encoded)
        this.forceName = decodeURIComponent(this.forceName);
        
        console.log('Loading data for force:', this.forceName);
        this.loadForceData();
    }
    
    async loadForceData() {
        try {
            // Load main force data from the Crusade Forces sheet
            await this.loadMainForceData();
            
            // Load additional data sheets
            await this.loadBattleHistory();
            await this.loadRosterData();
            await this.loadProgressData();
            
        } catch (error) {
            console.error('Error loading force data:', error);
            this.showError('Failed to load force data: ' + error.message);
        }
    }
    
    async loadMainForceData() {
        const response = await fetch(this.config.forceSheetUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch force data');
        }
        
        const data = await response.json();
        
        // Find the force by name (case-insensitive)
        const forceRow = data.find(row => 
            row[1] && row[1].toString().toLowerCase() === this.forceName.toLowerCase()
        );
        
        if (!forceRow) {
            throw new Error(`Force "${this.forceName}" not found in the database`);
        }
        
        this.forceData = {
            name: forceRow[1],
            player: forceRow[2],
            faction: forceRow[3],
            crusadePoints: forceRow[4] || 0,
            powerLevel: forceRow[5] || 0,
            battlesWon: forceRow[6] || 0,
            battlesLost: forceRow[7] || 0,
            battlesTied: forceRow[8] || 0,
            notes: forceRow[9] || '',
            created: forceRow[10] || ''
        };
        
        this.updateForceHeader();
        this.updateForceStats();
        this.updateForceDetails();
        
        // Show the sections now that we have data
        document.getElementById('force-stats').style.display = 'grid';
        document.getElementById('force-details-section').style.display = 'block';
    }
    
    updateForceHeader() {
        const header = document.getElementById('force-header');
        header.innerHTML = `
            <h1>${this.forceData.name}</h1>
            <div class="force-subtitle">
                ${this.forceData.faction} • Commanded by ${this.forceData.player}
            </div>
        `;
        
        // Update page title
        document.title = `${this.forceData.name} - Crusade Force`;
    }
    
    updateForceStats() {
        const totalBattles = (this.forceData.battlesWon || 0) + 
                          (this.forceData.battlesLost || 0) + 
                          (this.forceData.battlesTied || 0);
        
        document.getElementById('crusade-points').textContent = this.forceData.crusadePoints;
        document.getElementById('power-level').textContent = this.forceData.powerLevel;
        document.getElementById('battles-fought').textContent = totalBattles;
        document.getElementById('victories').textContent = this.forceData.battlesWon || 0;
    }
    
    updateForceDetails() {
        const detailsContainer = document.getElementById('force-details');
        
        const details = [
            { label: 'Force Name', value: this.forceData.name },
            { label: 'Commander', value: this.forceData.player },
            { label: 'Faction', value: this.forceData.faction },
            { label: 'Battles Won', value: this.forceData.battlesWon || 0 },
            { label: 'Battles Lost', value: this.forceData.battlesLost || 0 },
            { label: 'Battles Tied', value: this.forceData.battlesTied || 0 },
            { label: 'Force Created', value: this.formatDate(this.forceData.created) },
            { label: 'Notes', value: this.forceData.notes || 'No additional notes' }
        ];
        
        detailsContainer.innerHTML = details.map(detail => `
            <div class="detail-item">
                <span class="detail-label">${detail.label}:</span>
                <span class="detail-value">${detail.value}</span>
            </div>
        `).join('');
    }
    
    async loadBattleHistory() {
        try {
            document.getElementById('battle-history-section').style.display = 'block';
            
            if (this.config.battleHistoryUrl) {
                // Example of how to integrate with a battle history sheet
                SheetsManager.embed('battle-history-sheet', 
                    this.config.battleHistoryUrl, 
                    {
                        maxHeight: '300px',
                        showStats: true,
                        sortable: true,
                        cacheMinutes: 60,
                        hideColumns: [], // Adjust based on your sheet structure
                        // You might want to filter battles for this specific force
                        // This would require modifying the GoogleSheetsEmbed class to support filtering
                    }
                );
            } else {
                // Show placeholder
                document.getElementById('battle-history-sheet').innerHTML = `
                    <div class="no-data-message">
                        <p>📊 Battle history tracking will be implemented here.</p>
                        <p>This would show detailed battle reports, outcomes, and experience gained for <strong>${this.forceData.name}</strong>.</p>
                        <p><em>Configure battleHistoryUrl in crusade-force.js to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading battle history:', error);
            this.showDataError('battle-history-sheet', 'Failed to load battle history');
        }
    }
    
    async loadRosterData() {
        try {
            document.getElementById('roster-section').style.display = 'block';
            
            if (this.config.rosterUrl) {
                SheetsManager.embed('roster-sheet', 
                    this.config.rosterUrl, 
                    {
                        maxHeight: '400px',
                        showStats: true,
                        sortable: true,
                        cacheMinutes: 60
                    }
                );
            } else {
                document.getElementById('roster-sheet').innerHTML = `
                    <div class="no-data-message">
                        <p>🛡️ Unit roster management will be implemented here.</p>
                        <p>This would show the current units, their experience, battle honors, and battle scars for <strong>${this.forceData.name}</strong>.</p>
                        <p><em>Configure rosterUrl in crusade-force.js to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading roster data:', error);
            this.showDataError('roster-sheet', 'Failed to load roster data');
        }
    }
    
    async loadProgressData() {
        try {
            document.getElementById('progress-section').style.display = 'block';
            
            if (this.config.progressUrl) {
                SheetsManager.embed('progress-sheet', 
                    this.config.progressUrl, 
                    {
                        maxHeight: '300px',
                        showStats: true,
                        sortable: true,
                        cacheMinutes: 60
                    }
                );
            } else {
                document.getElementById('progress-sheet').innerHTML = `
                    <div class="no-data-message">
                        <p>📈 Campaign progress tracking will be implemented here.</p>
                        <p>This would show agendas, requisitions earned, and campaign milestones for <strong>${this.forceData.name}</strong>.</p>
                        <p><em>Configure progressUrl in crusade-force.js to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading progress data:', error);
            this.showDataError('progress-sheet', 'Failed to load progress tracking data');
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch (error) {
            return dateString;
        }
    }
    
    showError(message) {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-text').textContent = message;
        
        // Hide other sections
        document.getElementById('force-header').style.display = 'none';
        document.getElementById('force-stats').style.display = 'none';
        document.getElementById('force-details-section').style.display = 'none';
        document.getElementById('battle-history-section').style.display = 'none';
        document.getElementById('roster-section').style.display = 'none';
        document.getElementById('progress-section').style.display = 'none';
    }
    
    showDataError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="sheets-error">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    }
    
    // Public methods for debugging and manual control
    refreshForce() {
        console.log('Refreshing force data...');
        this.loadForceData();
    }
    
    getForceData() {
        return this.forceData;
    }
    
    // Method to update configuration (useful for testing different sheet URLs)
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Configuration updated:', this.config);
    }
}

// Initialize the force app when page loads
document.addEventListener('DOMContentLoaded', () => {
    const forceApp = new CrusadeForceApp();
    
    // Make it globally available for debugging
    window.CrusadeForceApp = forceApp;
    
    console.log('Crusade Force page initialized');
});

// Utility functions for force page
const ForcePageUtils = {
    // Convert force name to URL parameter
    createForceUrl(forceName, basePath = 'forces/') {
        const encodedName = encodeURIComponent(forceName);
        return `${basePath}index.html?force=${encodedName}`;
    },
    
    // Get current force name from URL
    getCurrentForceName() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('force') || urlParams.get('name');
    }
};

// Export for use in other modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CrusadeForceApp, ForcePageUtils };
}