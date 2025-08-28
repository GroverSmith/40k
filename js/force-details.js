// filename: js/force-details.js
// Main orchestrator for Force Details page - coordinates existing modules
// 40k Crusade Campaign Tracker

class ForceDetailsApp {
   constructor() {
       this.forceKey = null;
       this.forceData = null;
       this.init();
   }
   
   async init() {
       try {
           // Get force key from URL
           const urlParams = new URLSearchParams(window.location.search);
           this.forceKey = urlParams.get('key');
           
           if (!this.forceKey) {
               throw new Error('No force key provided in URL');
           }
           
           console.log('Loading force details for key:', this.forceKey);
           
           // Load force data using the existing ForceData module
           await this.loadForceData();
           
           // Load additional data in parallel
           await Promise.all([
               this.loadArmyLists(),
               this.loadBattleHistory(),
               this.loadParticipatingCrusades()
           ]);
           
       } catch (error) {
           console.error('Error initializing force details:', error);
           this.showError(error.message);
       }
   }
   
   async loadForceData() {
       try {
           // Use existing ForceData module to load with caching
           this.forceData = await ForceData.loadForceData(this.forceKey);
           
           // Use ForceUI module to update the display
           ForceUI.updateHeader(this.forceData);
           
           // Update overview section
           this.updateOverview();
           
           // Update action buttons
           this.updateActionButtons();
           
           // Show sections
           document.getElementById('overview-section').style.display = 'block';
           document.getElementById('force-actions').style.display = 'flex';
           
       } catch (error) {
           console.error('Error loading force data:', error);
           throw error;
       }
   }
   
   updateOverview() {
       const overviewContent = document.getElementById('overview-content');
       if (!overviewContent) return;
       
       let html = '<div class="overview-grid">';
       
       // Force info card
       html += `
           <div class="info-card">
               <h4>Force Information</h4>
               <p><strong>Force Name:</strong> ${this.forceData.forceName}</p>
               <p><strong>Faction:</strong> ${this.forceData.faction}</p>
               <p><strong>Detachment:</strong> ${this.forceData.detachment || 'Not specified'}</p>
               <p><strong>Commander:</strong> ${this.forceData.playerName}</p>
               ${this.forceData.timestamp ? `<p><strong>Created:</strong> ${new Date(this.forceData.timestamp).toLocaleDateString()}</p>` : ''}
           </div>
       `;
       
       // Notes card if present
       if (this.forceData.notes) {
           html += `
               <div class="info-card">
                   <h4>Force Notes</h4>
                   <p>${this.forceData.notes}</p>
               </div>
           `;
       }
       
       html += '</div>';
       overviewContent.innerHTML = html;
   }
   
   updateActionButtons() {
       // Update the "Add Army List" button to include force key
       const addArmyListBtn = document.getElementById('add-army-list-btn');
       if (addArmyListBtn) {
           addArmyListBtn.href = `../army-lists/add-army-list.html?forceKey=${encodeURIComponent(this.forceKey)}`;
       }
       
       // Update the "Record Battle" button to pre-select this force
       const recordBattleBtn = document.getElementById('record-battle-btn');
       if (recordBattleBtn) {
           recordBattleBtn.href = `../battle-reports/add-battle-report.html?force=${encodeURIComponent(this.forceKey)}`;
       }
   }
   
   async loadArmyLists() {
       try {
           // Show the section
           document.getElementById('army-lists-section').style.display = 'block';
           
           // Use ForceData module to load army lists
           const result = await ForceData.loadArmyLists(this.forceKey);
           
           const container = document.getElementById('army-lists-content');
           
           // Create the expected container element for ForceUI
           if (!document.getElementById('army-lists-sheet')) {
               const sheetContainer = document.createElement('div');
               sheetContainer.id = 'army-lists-sheet';
               container.appendChild(sheetContainer);
           }
           
           if (result.success && result.data && result.data.length > 0) {
               // Use ForceUI module to display
               ForceUI.displayArmyLists(result.data, this.forceData.forceName, this.forceKey);
           } else {
               container.innerHTML = `
                   <p class="no-data-message">No army lists uploaded yet.</p>
                   <p><a href="../army-lists/add-army-list.html?forceKey=${encodeURIComponent(this.forceKey)}" 
                         style="color: #4ecdc4;">Add your first army list →</a></p>
               `;
           }
       } catch (error) {
           console.error('Error loading army lists:', error);
           const container = document.getElementById('army-lists-content');
           if (container) {
               container.innerHTML = '<p class="error-message">Failed to load army lists</p>';
           }
       }
   }
   
   async loadBattleHistory() {
       try {
           // Show the section
           document.getElementById('battle-history-section').style.display = 'block';
           
           // Use ForceData module to load battle history
           const battles = await ForceData.loadBattleHistory(this.forceKey);
           
           const container = document.getElementById('battle-history-content');
           if (battles && battles.length > 0) {
               // Calculate and display stats
               const stats = ForceData.calculateBattleStats();
               this.displayBattleStats(stats);
               
               // Display battle list with new column order
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
   }
   
   displayBattleStats(stats) {
       const statsContainer = document.getElementById('battle-stats');
       if (!statsContainer) return;
       
       statsContainer.innerHTML = `
           <div class="stat-card">
               <div class="stat-value">${stats.totalBattles}</div>
               <div class="stat-label">Total Battles</div>
           </div>
           <div class="stat-card">
               <div class="stat-value">${stats.victories}</div>
               <div class="stat-label">Victories</div>
           </div>
           <div class="stat-card">
               <div class="stat-value">${stats.defeats}</div>
               <div class="stat-label">Defeats</div>
           </div>
           <div class="stat-card">
               <div class="stat-value">${stats.draws}</div>
               <div class="stat-label">Draws</div>
           </div>
           <div class="stat-card">
               <div class="stat-value">${stats.winRate}%</div>
               <div class="stat-label">Win Rate</div>
           </div>
           <div class="stat-card">
               <div class="stat-value">${stats.averagePointsScored}</div>
               <div class="stat-label">Avg Points Scored</div>
           </div>
       `;
       
       statsContainer.style.display = 'grid';
   }
   
   displayBattleHistory(battles) {
       const container = document.getElementById('battle-history-content');
       
       // New column order: Outcome, Date Played, Opponent Name, Battle Name, Battle Size
       let html = '<div class="table-wrapper"><table class="data-table"><thead><tr>';
       html += '<th>Outcome</th><th>Date Played</th><th>Opponent Name</th><th>Battle Name</th><th>Battle Size</th>';
       html += '</tr></thead><tbody>';
       
       battles.forEach(battle => {
           // Use the already computed fields from ForceData.loadBattleHistory()
           // That function adds: result, opponent, opponentPlayer, forceScore, opponentScore
           const outcome = battle.result || 'Unknown';
           const outcomeClass = outcome === 'Victory' ? 'victory' : 
                              outcome === 'Defeat' ? 'defeat' : 'draw';
           
           // Get date
           const date = battle['Date Played'] ? new Date(battle['Date Played']).toLocaleDateString() : 'Unknown';
           
           // Use the already computed opponentPlayer field
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
   
   async loadParticipatingCrusades() {
       try {
           // Show the section
           document.getElementById('crusades-section').style.display = 'block';
           
           // Use ForceData module to get participating crusades
           const crusades = await ForceData.getParticipatingCrusades();
           
           const container = document.getElementById('crusades-content');
           if (crusades && crusades.length > 0) {
               let html = '<div class="crusades-list">';
               
               crusades.forEach(crusade => {
                   const crusadeKey = crusade.Key || crusade.key;
                   const crusadeName = crusade['Crusade Name'] || crusade.crusadeName;
                   const state = crusade.State || crusade.state || 'Active';
                   const startDate = crusade['Start Date'] ? new Date(crusade['Start Date']).toLocaleDateString() : '';
                   
                   html += `
                       <div class="crusade-card">
                           <h4><a href="../crusades/crusade-details.html?key=${encodeURIComponent(crusadeKey)}" 
                                  style="color: #4ecdc4;">${crusadeName}</a></h4>
                           <p>Status: ${state}</p>
                           ${startDate ? `<p>Started: ${startDate}</p>` : ''}
                       </div>
                   `;
               });
               
               html += '</div>';
               container.innerHTML = html;
           } else {
               container.innerHTML = '<p class="no-data-message">Not registered for any crusades yet.</p>';
           }
       } catch (error) {
           console.error('Error loading crusades:', error);
           document.getElementById('crusades-content').innerHTML = 
               '<p class="error-message">Failed to load participating crusades</p>';
       }
   }
   
   showError(message) {
       // Hide loading state
       const header = document.getElementById('force-header');
       if (header) {
           header.innerHTML = `<div class="error-state">⚠️ ${message}</div>`;
       }
       
       // Show error message
       document.getElementById('error-message').style.display = 'block';
       document.getElementById('error-text').textContent = message;
       
       // Hide all sections
       ['overview-section', 'army-lists-section', 'battle-history-section', 
        'crusades-section', 'force-actions'].forEach(id => {
           const element = document.getElementById(id);
           if (element) element.style.display = 'none';
       });
   }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
   console.log('Force Details page initializing...');
   
   // Check if required modules are loaded
   if (typeof ForceData === 'undefined') {
       console.error('ForceData module not loaded!');
       return;
   }
   if (typeof ForceUI === 'undefined') {
       console.error('ForceUI module not loaded!');
       return;
   }
   if (typeof UserStorage === 'undefined') {
       console.error('UserStorage module not loaded!');
       return;
   }
   
   // Initialize the app
   const app = new ForceDetailsApp();
   window.forceDetailsApp = app; // Make available globally for debugging
   
   console.log('Force Details page initialized');
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
   module.exports = ForceDetailsApp;
}