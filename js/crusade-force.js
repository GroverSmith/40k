// filename: js/crusade-force.js
// Main orchestrator for Force Details page - using custom battle display
// 40k Crusade Campaign Tracker

const CrusadeForceApp = {
    forceKey: null,
    forceData: null,
    
    async init() {
        try {
            // Get force key from URL
            const urlParams = new URLSearchParams(window.location.search);
            this.forceKey = urlParams.get('key');
            
            if (!this.forceKey) {
                throw new Error('No force key provided in URL');
            }
            
            console.log('Loading force details for key:', this.forceKey);
            
            // Load force data
            this.forceData = await ForceData.loadForceData(this.forceKey);
            
            // Update UI using existing ForceUI module
            ForceUI.updateHeader(this.forceData);
            ForceUI.updateStats(this.forceData);
            
            // Load battle history with custom display
            await this.loadBattleHistory();
            
            // Load other sections using existing ForceSections module
            await ForceSections.loadArmyLists(this.forceData);
            ForceSections.loadCharactersUnits(this.forceData);
            ForceSections.loadStories(this.forceData);
            ForceSections.loadForceLogs(this.forceData);
            
        } catch (error) {
            console.error('Error loading force:', error);
            ForceUI.showError(error.message);
        }
    },
    
    async loadBattleHistory() {
        try {
            // Show the section
            document.getElementById('battle-history-section').style.display = 'block';
            
            // Load battle history data
            const battles = await ForceData.loadBattleHistory(this.forceKey);
            
            const container = document.getElementById('battle-history-content');
            if (battles && battles.length > 0) {
                // Calculate stats
                const stats = ForceData.calculateBattleStats();
                
                // Update stat cards
                document.getElementById('battles-fought').textContent = stats.totalBattles || 0;
                document.getElementById('victories').textContent = stats.victories || 0;
                document.getElementById('battle-losses').textContent = stats.defeats || 0;
                document.getElementById('battle-ties').textContent = stats.draws || 0;
                
                // Display the stats section
                document.getElementById('force-stats').style.display = 'grid';
                
                // Build custom table with new column order
                this.displayBattleHistory(battles);
            } else {
                container.innerHTML = `
                    <p class="no-data-message">No battles recorded yet.</p>
                    <p><a href="../battle-reports/add-battle-report.html?force=${encodeURIComponent(this.forceKey)}" 
                          style="color: #4ecdc4;">Record your first battle →</a></p>
                `;
            }
        } catch (error) {
            console.error('Error loading battle history:', error);
            document.getElementById('battle-history-content').innerHTML = 
                '<p class="error-message">Failed to load battle history</p>';
        }
    },
    
    displayBattleHistory(battles) {
        const container = document.getElementById('battle-history-content');
        
        // New column order: Outcome, Date Played, Opponent Name, Battle Name, Battle Size
        let html = '<div class="table-wrapper"><table class="data-table"><thead><tr>';
        html += '<th>Outcome</th><th>Date Played</th><th>Opponent Name</th><th>Battle Name</th><th>Battle Size</th>';
        html += '</tr></thead><tbody>';
        
        battles.forEach(battle => {
            // Use the computed fields from ForceData.loadBattleHistory()
            const outcome = battle.result || 'Unknown';
            const outcomeClass = outcome === 'Victory' ? 'victory' : 
                               outcome === 'Defeat' ? 'defeat' : 'draw';
            
            // Get date
            const date = battle['Date Played'] ? new Date(battle['Date Played']).toLocaleDateString() : 'Unknown';
            
            // Use the computed opponentPlayer field
            const opponentName = battle.opponentPlayer || 'Unknown Opponent';
            
            // Get battle name
            const battleName = battle['Battle Name'] || '-';
            
            // Get battle size
            const battleSize = battle['Battle Size'] ? `${battle['Battle Size']} pts` : '-';
            
            html += `
                <tr>
                    <td class="${outcomeClass}">${outcome}</td>
                    <td>${date}</td>
                    <td>${opponentName}</td>
                    <td>${battleName}</td>
                    <td>${battleSize}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Force page initializing...');
    
    CrusadeForceApp.init();
    window.CrusadeForceApp = CrusadeForceApp; // Make available globally
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeForceApp;
}