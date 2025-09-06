// filename: forces/force-details.js
// Main orchestrator for Force Details page - coordinates existing modules
// 40k Crusade Campaign Tracker

class ForceDetailsApp {
   constructor() {
       this.forceKey = null;
       this.forceData = null;
       this.armyListsData = [];
       this.battleHistoryData = [];
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
           // Load force data with caching
           this.forceData = await this.loadForceDataByKey(this.forceKey);
           
           // Update the display
           this.updateHeader(this.forceData);
           
           // Update overview section
           this.updateOverview();
           
           // Update action buttons
           this.updateActionButtons();
           
           // Show sections
           document.getElementById('overview-section').style.display = 'block';
           
           
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
		const forceData = this.forceData;
		const forceKey = forceData.key;
		
		// Update Add Army List button
		const addArmyListBtn = document.getElementById('add-army-list-btn');
		if (addArmyListBtn) {
			const params = new URLSearchParams({
				forceKey: forceKey,
				forceName: forceData.forceName,
				userName: forceData.playerName,
				faction: forceData.faction,
				detachment: forceData.detachment || ''
			});
			addArmyListBtn.href = `../armies/add-army-list.html?${params.toString()}`;
		}
		
		// Update Add Unit button
		const addUnitBtn = document.getElementById('add-unit-btn');
		if (addUnitBtn) {
			const params = new URLSearchParams({
				forceKey: forceKey,
				forceName: forceData.forceName,
				userName: forceData.playerName,
				faction: forceData.faction
			});
			addUnitBtn.href = `../units/add-unit.html?${params.toString()}`;
		}
		
		// Update Record Battle button (now in Battle History section)
		const recordBattleBtn = document.getElementById('record-battle-btn');
		if (recordBattleBtn) {
			const params = new URLSearchParams({
				forceKey: forceKey,
				forceName: forceData.forceName,
				userName: forceData.playerName
			});
			recordBattleBtn.href = `../battles/add-battle-report.html?${params.toString()}`;
		}
		
		// Update Add Story button (now in Stories section)
		const addStoryBtn = document.getElementById('add-story-btn');
		if (addStoryBtn) {
			const params = new URLSearchParams({
				forceKey: forceKey,
				forceName: forceData.forceName,
				userName: forceData.playerName
			});
			addStoryBtn.href = `../stories/add-story.html?${params.toString()}`;
		}
	}


   async loadArmyLists() {
       try {
           // Show the section
           document.getElementById('army-lists-section').style.display = 'block';
           
           // Load army lists
           const result = await this.loadArmyListsData(this.forceKey);
           
           const container = document.getElementById('army-lists-content');
           
           // Create the expected container element for ForceUI
           if (!document.getElementById('army-lists-sheet')) {
               const sheetContainer = document.createElement('div');
               sheetContainer.id = 'army-lists-sheet';
               container.appendChild(sheetContainer);
           }
           
           if (result.success && result.data && result.data.length > 0) {
               // Display army lists using ArmyTable
               if (window.ArmyTable) {
                   await ArmyTable.loadForForce(this.forceKey, 'army-lists-content');
               }
           } else {
               container.innerHTML = `
                   <p class="no-data-message">No army lists uploaded yet.</p>
                   <p><a href="../armies/add-army-list.html?forceKey=${encodeURIComponent(this.forceKey)}"
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
           
           // Load battle history
           const battles = await this.loadBattleHistoryData(this.forceKey);
           
           const container = document.getElementById('battle-history-content');
           if (battles && battles.length > 0) {
               // Calculate and display stats
               const stats = this.calculateBattleStats(battles);
               this.displayBattleStats(stats);
               
               // Display battle list with new column order
               this.displayBattleHistory(battles);
           } else {
               container.innerHTML = `
                   <p class="no-data-message">No battles recorded yet.</p>
                   <p><a href="../battles/add-battle-report.html?force=${encodeURIComponent(this.forceKey)}"
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
		
		// Add Score column to the header
		let html = '<div class="table-wrapper"><table class="data-table"><thead><tr>';
		html += '<th>Outcome</th><th>Date Played</th><th>Opponent Name</th><th>Battle Name</th><th>Score</th><th>Battle Size</th>';
		html += '</tr></thead><tbody>';
		
		battles.forEach(battle => {
			const outcome = battle.result || 'Unknown';
			const outcomeClass = outcome === 'Victory' ? 'victory' : 
							   outcome === 'Defeat' ? 'defeat' : 'draw';
			
			const date = battle['Date Played'] ? new Date(battle['Date Played']).toLocaleDateString() : 'Unknown';
			const opponentName = battle.opponentPlayer || 'Unknown Opponent';
			const battleName = battle['Battle Name'] || '-';
			const battleSize = battle['Battle Size'] ? `${battle['Battle Size']} pts` : '-';
			
			// Use the correct fields that were set in ForceData.loadBattleHistory()
			const score = `${battle.forceScore || 0} - ${battle.opponentScore || 0}`;
			
			html += `
				<tr>
					<td class="${outcomeClass}">${outcome}</td>
					<td>${date}</td>
					<td>${opponentName}</td>
					<td>${battleName}</td>
					<td>${score}</td>
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
           
           // Get participating crusades
           const crusades = await this.getParticipatingCrusades();
           
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
        'crusades-section'].forEach(id => {
           const element = document.getElementById(id);
           if (element) element.style.display = 'none';
       });
   }

   // ===== DATA LOADING METHODS (consolidated from force-data.js) =====
   
   /**
    * Load main force data from the Forces sheet by key
    */
   async loadForceDataByKey(forceKey) {
       try {
           // Use CacheManager with automatic URL resolution
           const data = await CacheManager.fetchSheetData('forces');
           
           const force = this.findForceInData(data, forceKey);
           this.forceData = force;
           return force;
           
       } catch (error) {
           console.error('Error loading force data:', error);
           throw error;
       }
   }
   
   /**
    * Find specific force in data array
    */
   findForceInData(data, forceKey) {
       console.log('Processed data:', data);
       console.log('Looking for force key:', forceKey);
       
       if (!Array.isArray(data) || data.length === 0) {
           throw new Error('No force data available or invalid data format');
       }
       
       // Find the force by key (Key is now column 0)
       const forceRow = data.find((row, index) => {
           if (index === 0) return false; // Skip header
           return row[0] === forceKey; // Key column
       });
       
       if (!forceRow) {
           const availableKeys = data.slice(1).map(row => row[0]).filter(key => key);
           console.log('Available force keys:', availableKeys);
           throw new Error(`Force with key "${forceKey}" not found. Available keys: ${availableKeys.slice(0, 5).join(', ')}`);
       }
       
       // Map the columns from Forces sheet (with key in column 0)
       const forceData = {
           key: forceRow[0] || '',           // Key
           playerName: forceRow[1] || '',   // User Name
           forceName: forceRow[2] || '',    // Force Name
           faction: forceRow[3] || '',      // Faction
           detachment: forceRow[4] || '',   // Detachment
           notes: forceRow[5] || '',        // Notes
           timestamp: forceRow[6] || ''     // Timestamp
       };
       
       console.log('Successfully found and loaded force data:', forceData);
       return forceData;
   }

   // ===== UI METHODS (consolidated from force-ui.js) =====
   
   /**
    * Update force header display
    */
   updateHeader(forceData) {
       const header = document.getElementById('force-header');
       const launchDate = UIHelpers.formatDate(forceData.timestamp);

       header.innerHTML = `
           <h1>${forceData.forceName}</h1>
           <div class="force-subtitle">
               ${forceData.faction}${forceData.detachment ? ` - ${forceData.detachment}` : ''} • Commanded by ${forceData.playerName}
           </div>
           ${launchDate ? `<div class="force-launch-date">Crusade Force Launched on ${launchDate}</div>` : ''}
           <div class="force-key-display">
               Force Key: <code>${forceData.key}</code>
           </div>
       `;

       document.title = `${forceData.forceName} - Crusade Force`;
   }

   /**
    * Update battle stats from battles data
    */
   updateStatsFromBattles(battles, forceKey) {
       const stats = {
           battlesFought: battles.length,
           victories: 0,
           defeats: 0,
           draws: 0
       };

       battles.forEach(battle => {
           const victorForceKey = battle['Victor Force Key'] || '';

           if (victorForceKey === 'Draw') {
               stats.draws++;
           } else if (victorForceKey === forceKey) {
               stats.victories++;
           } else {
               stats.defeats++;
           }
       });

       // Update DOM
       const elements = {
           'battles-fought': stats.battlesFought,
           'victories': stats.victories,
           'battle-losses': stats.defeats,
           'battle-ties': stats.draws
       };

       Object.entries(elements).forEach(([id, value]) => {
           const el = document.getElementById(id);
           if (el) el.textContent = value;
       });

       // Show stats section
       const statsEl = document.getElementById('force-stats');
       if (statsEl) {
           statsEl.style.display = 'grid';
       }
   }

   // ===== ADDITIONAL DATA METHODS =====
   
   /**
    * Load army lists for a force using force key
    */
   async loadArmyListsData(forceKey) {
       try {
           // Use CacheManager with automatic URL resolution
           const data = await CacheManager.fetchSheetData('armies');
           
           console.log('Army lists response:', data);
           
           if (Array.isArray(data) && data.length > 0) {
               // Filter for armies belonging to this force
               const headers = data[0];
               const forceKeyToMatch = forceKey || this.forceKey;
               const filteredArmies = data.slice(1)
                   .filter(row => row[2] === forceKeyToMatch) // Force key is column 2
                   .map(row => {
                       const army = {};
                       headers.forEach((header, index) => {
                           army[header] = row[index];
                       });
                       return army;
                   });
               
               if (filteredArmies.length > 0) {
                   this.armyListsData = filteredArmies;
                   return { success: true, data: filteredArmies };
               }
           }
           
           this.armyListsData = [];
           return { success: true, data: [] };
           
       } catch (error) {
           console.error('Error fetching army lists:', error);
           return { success: false, data: [], error: error.message };
       }
   }

   /**
    * Load battle history for this force
    */
   async loadBattleHistoryData(forceKey) {
       try {
           const key = forceKey || this.forceKey;
           const battlesUrl = CrusadeConfig.getSheetUrl('battles');
           const fetchUrl = `${battlesUrl}?action=force-battles&forceKey=${encodeURIComponent(key)}`;
           
           // Use CacheManager for unified caching
           const responseData = await CacheManager.fetchWithCache(fetchUrl, 'battles');
           
           let battles = [];
           if (responseData.success && responseData.battles) {
               battles = responseData.battles;
           } else if (Array.isArray(responseData)) {
               // Handle raw array response
               const headers = responseData[0];
               battles = responseData.slice(1).map(row => {
                   const battle = {};
                   headers.forEach((header, index) => {
                       battle[header] = row[index];
                   });
                   return battle;
               });
           }
           
           // Filter battles for this force
           const forceKeyToMatch = key || this.forceKey;
           const filteredBattles = battles.filter(battle => {
               const force1Key = battle['Force 1 Key'] || '';
               const force2Key = battle['Force 2 Key'] || '';
               return force1Key === forceKeyToMatch || force2Key === forceKeyToMatch;
           });
           
           this.battleHistoryData = filteredBattles;
           return filteredBattles;
           
       } catch (error) {
           console.error('Error loading battle history:', error);
           return [];
       }
   }

   /**
    * Calculate battle statistics
    */
   calculateBattleStats(battles = null) {
       const battleData = battles || this.battleHistoryData;
       const stats = {
           totalBattles: battleData.length,
           victories: 0,
           defeats: 0,
           draws: 0,
           totalScore: 0,
           totalOpponentScore: 0
       };

       battleData.forEach(battle => {
           const victorForceKey = battle['Victor Force Key'] || '';
           const force1Key = battle['Force 1 Key'] || '';
           const force2Key = battle['Force 2 Key'] || '';
           
           // Determine if this force was force 1 or force 2
           const isForce1 = force1Key === this.forceKey;
           const isForce2 = force2Key === this.forceKey;
           
           if (victorForceKey === 'Draw') {
               stats.draws++;
           } else if (victorForceKey === this.forceKey) {
               stats.victories++;
           } else if (isForce1 || isForce2) {
               stats.defeats++;
           }
           
           // Add scores
           if (isForce1) {
               stats.totalScore += parseInt(battle['Force 1 Score'] || 0);
               stats.totalOpponentScore += parseInt(battle['Force 2 Score'] || 0);
           } else if (isForce2) {
               stats.totalScore += parseInt(battle['Force 2 Score'] || 0);
               stats.totalOpponentScore += parseInt(battle['Force 1 Score'] || 0);
           }
       });

       return stats;
   }

   /**
    * Get participating crusades for this force
    */
   async getParticipatingCrusades() {
       try {
           // Use CrusadeParticipantsTable to get crusades for this force
           if (window.CrusadeParticipantsTable) {
               const participants = await CrusadeParticipantsTable.fetchData('by-force', this.forceKey);
               return participants || [];
           }
           return [];
       } catch (error) {
           console.error('Error getting participating crusades:', error);
           return [];
       }
   }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
   console.log('Force Details page initializing...');
   
   // Check if required modules are loaded
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