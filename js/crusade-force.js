// Crusade Force Page - Individual force data management
// 40k Crusade Campaign Tracker

class CrusadeForceApp {
    constructor() {
        this.forceName = null;
        this.forceData = null;
        this.config = {
            // Google Sheets URLs - you can easily update these
            forceSheetUrl: 'https://script.google.com/macros/s/AKfycbw81ZEFEAzOrfvOxWBHHT17kGqLrk3g-VpXuDeUbK_8YehP1dNe8FEUMf6PuDzZ4JnH/exec',
            battleHistoryUrl: null,     // Add your battle history sheet URL here
            armyListsUrl: null,         // Add your army lists sheet URL here
            charactersUnitsUrl: null,   // Add your characters and units sheet URL here
            storiesUrl: null,           // Add your stories sheet URL here
            forceLogsUrl: null          // Add your force logs sheet URL here
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
            console.log('Starting loadForceData...');
            
            // Load main force data from the Crusade Forces sheet
            console.log('Loading main force data...');
            await this.loadMainForceData();
            console.log('Main force data loaded successfully');
            
            // Load additional data sheets in the new order
            console.log('Loading battle history...');
            await this.loadBattleHistory();
            console.log('Battle history loaded');
            
            console.log('Loading army lists...');
            await this.loadArmyLists();
            console.log('Army lists loaded');
            
            console.log('Loading characters and units...');
            await this.loadCharactersUnits();
            console.log('Characters and units loaded');
            
            console.log('Loading stories...');
            await this.loadStories();
            console.log('Stories loaded');
            
            console.log('Loading force logs...');
            await this.loadForceLogs();
            console.log('Force logs loaded');
            
            console.log('All data loading complete!');
            
        } catch (error) {
            console.error('Error in loadForceData:', error);
            this.showError('Failed to load force data: ' + error.message);
        }
    }
    
    async loadMainForceData() {
        const response = await fetch(this.config.forceSheetUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch force data');
        }
        
        const data = await response.json();
        
        // Debug logging to see what data we're working with
        console.log('Raw sheet data:', data);
        console.log('Looking for force name:', this.forceName);
        console.log('Available force names in sheet:');
        data.forEach((row, index) => {
            if (index === 0) {
                console.log('Header row:', row);
            } else {
                console.log(`Row ${index}: Force name in column 2 =`, row[2]);
            }
        });
        
        // Find the force by name - the force name comes URL-encoded, so decode it for matching
        const decodedForceName = decodeURIComponent(this.forceName);
        console.log('Decoded force name for matching:', decodedForceName);
        
        const forceRow = data.find(row => 
            row[2] && row[2].toString().toLowerCase().trim() === decodedForceName.toLowerCase().trim()
        );
        
        if (!forceRow) {
            // Show more helpful error message with available forces
            const availableForces = data.slice(1).map(row => row[2]).filter(name => name);
            console.log('Available forces:', availableForces);
            throw new Error(`Force "${decodedForceName}" not found in the database. Available forces: ${availableForces.join(', ')}`);
        }
        
        // Map the actual columns from your Crusade Forces sheet
        // Corrected column mapping: Force Name is in column 2 (index 2)
        this.forceData = {
            timestamp: forceRow[0] || '',    // Timestamp (usually hidden)
            playerName: forceRow[1] || '',   // Player Name (column 1)
            forceName: forceRow[2] || '',    // Force Name (column 2) - THIS is what we match on
            faction: forceRow[3] || '',      // Faction (column 3)
            detachment: forceRow[4] || '',   // Detachment (column 4)
            // Additional columns if they exist in your sheet
            crusadePoints: forceRow[5] || 0,
            powerLevel: forceRow[6] || 0,
            battlesWon: forceRow[7] || 0,
            battlesLost: forceRow[8] || 0,
            battlesTied: forceRow[9] || 0,
            notes: forceRow[10] || '',
            // Use timestamp as created date if no other date column exists
            created: forceRow[0] || ''
        };
        
        console.log('Successfully found and loaded force data:', this.forceData);
        
        this.updateForceHeader();
        this.updateForceStats();
        
        // Show the sections now that we have data
        document.getElementById('force-stats').style.display = 'grid';
    }
    
    updateForceHeader() {
        const header = document.getElementById('force-header');
        const launchDate = this.formatLaunchDate(this.forceData.timestamp);
        
        header.innerHTML = `
            <h1>${this.forceData.forceName}</h1>
            <div class="force-subtitle">
                ${this.forceData.faction}${this.forceData.detachment ? ` - ${this.forceData.detachment}` : ''} • Commanded by ${this.forceData.playerName}
            </div>
            ${launchDate ? `<div class="force-launch-date">Crusade Force Launched on ${launchDate}</div>` : ''}
        `;
        
        // Update page title
        document.title = `${this.forceData.forceName} - Crusade Force`;
    }
    
    updateForceStats() {
        const totalBattles = (this.forceData.battlesWon || 0) + 
                          (this.forceData.battlesLost || 0) + 
                          (this.forceData.battlesTied || 0);
        
        // Display battle statistics
        document.getElementById('battles-fought').textContent = totalBattles || 0;
        document.getElementById('victories').textContent = this.forceData.battlesWon || 0;
        document.getElementById('battle-losses').textContent = this.forceData.battlesLost || 0;
        document.getElementById('battle-ties').textContent = this.forceData.battlesTied || 0;
    }
    
    async loadBattleHistory() {
        try {
            document.getElementById('battle-history-section').style.display = 'block';
            
            const battleHistoryUrl = CrusadeConfig.getSheetUrl('battleHistory');
            
            if (battleHistoryUrl) {
                SheetsManager.embed('battle-history-sheet', 
                    battleHistoryUrl, 
                    {
                        maxHeight: '300px',
                        showStats: true,
                        sortable: true,
                        cacheMinutes: CrusadeConfig.getCacheConfig('forcePage')
                    }
                );
            } else {
                document.getElementById('battle-history-sheet').innerHTML = `
                    <div class="no-data-message">
                        <p>📊 Battle history tracking will be implemented here.</p>
                        <p>This would show detailed battle reports, outcomes, and experience gained for <strong>${this.forceData.forceName}</strong>.</p>
                        <p><em>Configure battleHistory URL in CrusadeConfig to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading battle history:', error);
            this.showDataError('battle-history-sheet', 'Failed to load battle history');
        }
    }
    
    async loadArmyLists() {
        try {
            document.getElementById('army-lists-section').style.display = 'block';
            
            const armyListsUrl = CrusadeConfig.getSheetUrl('armyLists');
            
            if (armyListsUrl) {
                // Use the GET endpoint to fetch army lists for this force
                const fetchUrl = `${armyListsUrl}?action=list&force=${encodeURIComponent(this.forceData.forceName)}`;
                
                try {
                    const response = await fetch(fetchUrl);
                    const data = await response.json();
                    
                    if (data.success && data.count > 0) {
                        this.displayArmyListsData(data.data);
                    } else {
                        document.getElementById('army-lists-sheet').innerHTML = `
                            <div class="no-data-message">
                                <p>📋 No army lists found for <strong>${this.forceData.forceName}</strong>.</p>
                                <p><a href="../army-lists/add-army-list.html" style="color: #4ecdc4;">Add your first army list</a> to get started!</p>
                            </div>
                        `;
                    }
                } catch (fetchError) {
                    console.error('Error fetching army lists:', fetchError);
                    document.getElementById('army-lists-sheet').innerHTML = `
                        <div class="no-data-message">
                            <p>📋 Army lists will be displayed here.</p>
                            <p>This would show army list configurations for <strong>${this.forceData.forceName}</strong>.</p>
                            <p><em>Unable to load army lists at this time.</em></p>
                        </div>
                    `;
                }
            } else {
                document.getElementById('army-lists-sheet').innerHTML = `
                    <div class="no-data-message">
                        <p>📋 Army lists will be displayed here.</p>
                        <p>This would show different army list configurations and loadouts for <strong>${this.forceData.forceName}</strong>.</p>
                        <p><em>Configure armyLists URL in CrusadeConfig to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading army lists:', error);
            this.showDataError('army-lists-sheet', 'Failed to load army lists');
        }
    }
    
    async loadCharactersUnits() {
        try {
            document.getElementById('characters-units-section').style.display = 'block';
            
            const charactersUnitsUrl = CrusadeConfig.getSheetUrl('charactersUnits');
            
            if (charactersUnitsUrl) {
                SheetsManager.embed('characters-units-sheet', 
                    charactersUnitsUrl, 
                    {
                        maxHeight: '400px',
                        showStats: true,
                        sortable: true,
                        cacheMinutes: CrusadeConfig.getCacheConfig('forcePage')
                    }
                );
            } else {
                document.getElementById('characters-units-sheet').innerHTML = `
                    <div class="no-data-message">
                        <p>🛡️ Characters and units will be displayed here.</p>
                        <p>This would show individual characters, units, their experience, battle honors, and battle scars for <strong>${this.forceData.forceName}</strong>.</p>
                        <p><em>Configure charactersUnits URL in CrusadeConfig to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading characters and units:', error);
            this.showDataError('characters-units-sheet', 'Failed to load characters and units');
        }
    }
    
    async loadStories() {
        try {
            document.getElementById('stories-section').style.display = 'block';
            
            const storiesUrl = CrusadeConfig.getSheetUrl('stories');
            
            if (storiesUrl) {
                SheetsManager.embed('stories-sheet', 
                    storiesUrl, 
                    {
                        maxHeight: '400px',
                        showStats: true,
                        sortable: true,
                        cacheMinutes: CrusadeConfig.getCacheConfig('forcePage')
                    }
                );
            } else {
                document.getElementById('stories-sheet').innerHTML = `
                    <div class="no-data-message">
                        <p>📖 Force stories and narratives will be displayed here.</p>
                        <p>This would show battle reports, character development, and campaign narratives for <strong>${this.forceData.forceName}</strong>.</p>
                        <p><em>Configure stories URL in CrusadeConfig to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading stories:', error);
            this.showDataError('stories-sheet', 'Failed to load stories');
        }
    }
    
    async loadForceLogs() {
        try {
            document.getElementById('force-logs-section').style.display = 'block';
            
            const forceLogsUrl = CrusadeConfig.getSheetUrl('forceLogs');
            
            if (forceLogsUrl) {
                SheetsManager.embed('force-logs-sheet', 
                    forceLogsUrl, 
                    {
                        maxHeight: '350px',
                        showStats: true,
                        sortable: true,
                        cacheMinutes: CrusadeConfig.getCacheConfig('forcePage')
                    }
                );
            } else {
                document.getElementById('force-logs-sheet').innerHTML = `
                    <div class="no-data-message">
                        <p>📝 Force activity logs will be displayed here.</p>
                        <p>This would show requisitions, battle scars, battle honors, and other force modifications for <strong>${this.forceData.forceName}</strong>.</p>
                        <p><em>Configure forceLogs URL in CrusadeConfig to enable this feature.</em></p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading force logs:', error);
            this.showDataError('force-logs-sheet', 'Failed to load force logs');
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
    
    formatLaunchDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return null;
            }
            
            // Format as "dd MMM yyyy" (e.g., "15 Jan 2024")
            const day = String(date.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            
            return `${day} ${month} ${year}`;
        } catch (error) {
            console.warn('Launch date formatting error:', error);
            return null;
        }
    }
    
    showError(message) {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-text').textContent = message;
        
        // Hide other sections
        document.getElementById('force-header').style.display = 'none';
        document.getElementById('force-stats').style.display = 'none';
        document.getElementById('battle-history-section').style.display = 'none';
        document.getElementById('army-lists-section').style.display = 'none';
        document.getElementById('characters-units-section').style.display = 'none';
        document.getElementById('stories-section').style.display = 'none';
        document.getElementById('force-logs-section').style.display = 'none';
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
    
    displayArmyListsData(armyLists) {
        // Display army lists in a simple table format
        let html = '<div class="army-lists-display">';
        
        if (armyLists.length === 0) {
            html += `
                <div class="no-data-message">
                    <p>📋 No army lists found for <strong>${this.forceData.forceName}</strong>.</p>
                    <p><a href="../army-lists/add-army-list.html" style="color: #4ecdc4;">Add your first army list</a> to get started!</p>
                </div>
            `;
        } else {
            html += '<div class="army-lists-table-wrapper" style="max-height: 400px; overflow-y: auto; border: 1px solid #4a4a4a; border-radius: 4px; background-color: #2a2a2a;">';
            html += '<table class="sheets-table" style="width: 100%; border-collapse: collapse;">';
            
            // Header
            html += `
                <tr style="background-color: #3a3a3a; position: sticky; top: 0;">
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">Army Name</th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">Detachment</th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">MFM</th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">Points</th>
                    <th style="padding: 8px 12px; color: #4ecdc4; border-bottom: 2px solid #4ecdc4;">Date Added</th>
                </tr>
            `;
            
            // Data rows
            armyLists.forEach(armyList => {
                const timestamp = armyList.Timestamp ? new Date(armyList.Timestamp).toLocaleDateString() : 'Unknown';
                const points = armyList['Points Value'] || '-';
                const detachment = armyList.Detachment || '-';
                const mfmVersion = armyList['MFM Version'] || '-';
                
                html += `
                    <tr style="border-bottom: 1px solid #4a4a4a; color: #ffffff;">
                        <td style="padding: 8px 12px;">${armyList['Army Name'] || 'Unnamed List'}</td>
                        <td style="padding: 8px 12px;">${detachment}</td>
                        <td style="padding: 8px 12px;">${mfmVersion}</td>
                        <td style="padding: 8px 12px;">${points}</td>
                        <td style="padding: 8px 12px;">${timestamp}</td>
                    </tr>
                `;
            });
            
            html += '</table>';
            html += '</div>';
            
            html += `<div class="sheets-stats" style="margin-top: 10px; padding: 10px; background-color: #3a3a3a; border-radius: 4px; color: #cccccc; font-size: 12px;">
                📋 Showing ${armyLists.length} army list${armyLists.length !== 1 ? 's' : ''} for ${this.forceData.forceName}
            </div>`;
        }
        
        html += '</div>';
        document.getElementById('army-lists-sheet').innerHTML = html;
    }
    
    // Public methods for debugging and manual control
    refreshForce() {
        console.log('Refreshing force data...');
        this.loadForceData();
    }
    
    getForceData() {
        return this.forceData;
    }
    
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