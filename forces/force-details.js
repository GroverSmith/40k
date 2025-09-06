// filename: forces/force-details.js
// Main orchestrator for Force Details page - coordinates existing modules
// 40k Crusade Campaign Tracker

class ForceDetails {
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
           
           // Use ArmyTable to load and display army lists for this force
           if (window.ArmyTable) {
               await ArmyTable.loadForForce(this.forceKey, 'army-lists-content');
           } else {
               console.error('ArmyTable module not loaded');
               const container = document.getElementById('army-lists-content');
               if (container) {
                   container.innerHTML = '<p class="error-message">Army table module not loaded</p>';
               }
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
           
           if (window.BattleTable) {
               // First, fetch battles data to calculate stats
               const battlesResult = await BattleTable.fetchBattles('force', this.forceKey);
               
               if (battlesResult.success && battlesResult.battles) {
                   // Calculate and display stats
                   this.updateStatsFromBattles(battlesResult.battles, this.forceKey);
               }
               
               // Then display the battles table
               await BattleTable.loadForForce(this.forceKey, 'battle-history-content');
           } else {
               console.error('BattleTable module not loaded');
               const container = document.getElementById('battle-history-content');
               if (container) {
                   container.innerHTML = '<p class="error-message">Battle table module not loaded</p>';
               }
           }
       } catch (error) {
           console.error('Error loading battle history:', error);
           const container = document.getElementById('battle-history-content');
           if (container) {
               container.innerHTML = '<p class="error-message">Failed to load battle history</p>';
           }
       }
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
       // Use BattleTable's comprehensive stats calculation
       const stats = BattleTable.calculateBattleStats(battles, forceKey);

       // Update DOM with all stats
       const elements = {
           'battles-fought': stats.totalBattles,
           'victories': stats.victories,
           'battle-losses': stats.defeats,
           'battle-ties': stats.draws,
           'win-rate': stats.winRate + '%',
           'avg-points-scored': stats.averagePointsScored
       };

       Object.entries(elements).forEach(([id, value]) => {
           const el = document.getElementById(id);
           if (el) {
               el.textContent = value;
           }
       });

       // Show stats section
       const statsEl = document.getElementById('force-stats');
       if (statsEl) {
           statsEl.style.display = 'grid';
       }
   }

   // ===== ADDITIONAL DATA METHODS =====
   



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
   const app = new ForceDetails();
   window.forceDetails = app; // Make available globally for debugging
   
   console.log('Force Details page initialized');
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
   module.exports = ForceDetails;
}