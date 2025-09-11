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
           // Get force key from URL using utility
           this.forceKey = getUrlKey('key');
           
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
               this.loadUnits(),
               this.loadStories()
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
           CoreUtils.dom.show('overview-section');
           
           
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
               <p><strong>Force Name:</strong> ${this.forceData.force_name}</p>
               <p><strong>Faction:</strong> ${this.forceData.faction}</p>
               <p><strong>Detachment:</strong> ${this.forceData.detachment || 'Not specified'}</p>
               <p><strong>Commander:</strong> ${this.forceData.user_name}</p>
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
		const forceKey = forceData.force_key;
		
		// Update Add Army List button
		const addArmyListBtn = document.getElementById('add-army-list-btn');
		if (addArmyListBtn) {
			const params = new URLSearchParams({
				forceKey: forceKey,
				forceName: forceData.force_name,
				userName: forceData.user_name,
				faction: forceData.faction,
				detachment: forceData.detachment || ''
			});
			addArmyListBtn.href = `../armies/army-add.html?${params.toString()}`;
		}
		
		// Update Add Unit button
		const addUnitBtn = document.getElementById('add-unit-btn');
		if (addUnitBtn) {
			const params = new URLSearchParams({
				forceKey: forceKey
			});
			addUnitBtn.href = `../units/unit-add.html?${params.toString()}`;
		}
		
		// Update Record Battle button (now in Battle History section)
		const recordBattleBtn = document.getElementById('record-battle-btn');
		if (recordBattleBtn) {
			const params = new URLSearchParams({
				forceKey: forceKey,
				forceName: forceData.force_name,
				userName: forceData.user_name
			});
			recordBattleBtn.href = `../battles/battle-add.html?${params.toString()}`;
		}
		
		// Update Add Story button (now in Stories section)
		const addStoryBtn = document.getElementById('add-story-btn');
		if (addStoryBtn) {
			const params = new URLSearchParams({
				forceKey: forceKey,
				forceName: forceData.force_name,
				userName: forceData.user_name
			});
			addStoryBtn.href = `../stories/story-add.html?${params.toString()}`;
		}
	}


   async loadArmyLists() {
       try {
           // Show the section
           CoreUtils.dom.show('army-lists-section');
           
           // Use ArmyTable to load and display army lists for this force
           if (window.ArmyTable) {
               await ArmyTable.loadForForce(this.forceKey, 'army-lists-sheet');
           } else {
               console.error('ArmyTable module not loaded');
               CoreUtils.dom.setLoading('army-lists-sheet', 'Army table module not loaded');
           }
       } catch (error) {
           console.error('Error loading army lists:', error);
           CoreUtils.dom.setLoading('army-lists-sheet', 'Failed to load army lists');
       }
   }
   
   async loadUnits() {
       try {
           // Show the section
           CoreUtils.dom.show('characters-units-section');
           
           // Use UnitTable to load and display units for this force
           if (window.UnitTable) {
               await UnitTable.loadForForce(this.forceKey, 'characters-units-sheet');
           } else {
               console.error('UnitTable module not loaded');
               CoreUtils.dom.setLoading('characters-units-sheet', 'Unit table module not loaded');
           }
       } catch (error) {
           console.error('Error loading units:', error);
           CoreUtils.dom.setLoading('characters-units-sheet', 'Failed to load units');
       }
   }
   
   async loadStories() {
       try {
           // Show the section
           CoreUtils.dom.show('stories-section');
           
           // Use StoryTable to load and display stories for this force
           if (window.StoryTable) {
               await StoryTable.loadForForce(this.forceKey, 'stories-sheet');
           } else {
               console.error('StoryTable module not loaded');
               CoreUtils.dom.setLoading('stories-sheet', 'Story table module not loaded');
           }
       } catch (error) {
           console.error('Error loading stories:', error);
           CoreUtils.dom.setLoading('stories-sheet', 'Failed to load stories');
       }
   }
   
   async loadBattleHistory() {
       try {
           // Show the section
           CoreUtils.dom.show('battle-history-section');
           
           if (window.BattleTable) {
               // Fetch battles for this force
               const forceBattles = await BattleTable.fetchBattles('force', this.forceKey);
               
               console.log('Fetched battles for force:', forceBattles.length);
               
               // Calculate and display stats
               this.updateStatsFromBattles(forceBattles, this.forceKey);
               
               // Then display the battles table
               await BattleTable.loadForForce(this.forceKey, 'battle-history-content');
           } else {
               console.error('BattleTable module not loaded');
               CoreUtils.dom.setLoading('battle-history-content', 'Battle table module not loaded');
           }
       } catch (error) {
           console.error('Error loading battle history:', error);
           CoreUtils.dom.setLoading('battle-history-content', 'Failed to load battle history');
       }
   }
   
			
   
   
   
   showError(message) {
       // Hide loading state
       const header = document.getElementById('force-header');
       if (header) {
           header.innerHTML = `<div class="error-state">⚠️ ${message}</div>`;
       }
       
       // Use utility for standard error handling
       showDetailsError(message, 'error-message', ['overview-section', 'army-lists-section', 'battle-history-section', 'crusades-section']);
   }

   // ===== DATA LOADING METHODS (consolidated from force-data.js) =====
   
   /**
    * Load main force data from the Forces sheet by key
    */
   async loadForceDataByKey(forceKey) {
       try {
           // Use UnifiedCache to get the specific force
           const force = await UnifiedCache.getRowByKey('forces', forceKey);
           
           if (force) {
               this.forceData = force;
               return force;
           }

           // If not found, get all forces to show available keys in error message
           const allForces = await UnifiedCache.getAllRows('forces');
           const availableKeys = allForces.map(f => f.force_key).join(', ');
           
           throw new Error(`Force "${forceKey}" not found. Available forces: ${availableKeys}`);
           
       } catch (error) {
           console.error('Error loading force data:', error);
           throw error;
       }
   }

   // ===== UI METHODS (consolidated from force-ui.js) =====
   
   /**
    * Update force header display
    */
   updateHeader(forceData) {
       const header = document.getElementById('force-header');
       const launchDate = UIHelpers.formatDate(forceData.timestamp);

       header.innerHTML = `
           <h1>${forceData.force_name}</h1>
           <div class="force-subtitle">
               ${forceData.faction}${forceData.detachment ? ` - ${forceData.detachment}` : ''} • Commanded by ${forceData.user_name}
           </div>
           ${launchDate ? `<div class="force-launch-date">Crusade Force Launched on ${launchDate}</div>` : ''}
       `;

       document.title = `${forceData.force_name} - Crusade Force`;
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

       // Use utility for setting multiple element texts
       setElementTexts(elements);

       // Show stats section
       CoreUtils.dom.show('force-stats', 'grid');
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

