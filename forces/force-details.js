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
               this.loadStories(),
               this.loadRequisitions()
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
           
           // Ensure UserManager is initialized before checking permissions
           if (typeof UserManager === 'undefined' || !UserManager.getCurrentUser) {
               console.warn('UserManager not available, retrying in 500ms...');
               setTimeout(() => this.loadForceData(), 500);
               return;
           }
           
           // Also check if UserManager has actually loaded user data
           const currentUser = UserManager.getCurrentUser();
           if (!currentUser) {
               console.warn('UserManager available but no current user, retrying in 500ms...');
               setTimeout(() => this.loadForceData(), 500);
               return;
           }
           
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
               <p><strong>Supply Limit:</strong> ${this.forceData.supply_limit || '1000'}</p>
               <p><strong>MFM Version:</strong> ${this.forceData.mfm_version || '3.3'}</p>
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
               
               // Also load units data for supply calculation
               try {
                   this.unitsData = await UnifiedCache.getRowsByField('units', 'force_key', this.forceKey);
                   console.log('Loaded units data for supply calculation:', this.unitsData);
               } catch (error) {
                   console.warn('Could not load units data for supply calculation:', error);
                   this.unitsData = [];
               }
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

   async loadRequisitions() {
       try {
           // Load requisitions for this force to calculate stats
           if (window.RequisitionTable) {
               // Try to load requisitions data directly from cache
               try {
                   this.requisitionsData = await UnifiedCache.getRowsByField('requisitions', 'force_key', this.forceKey);
                   console.log('Loaded requisitions for force:', this.requisitionsData);
               } catch (cacheError) {
                   console.warn('Requisitions cache not initialized yet, initializing...', cacheError);
                   
                   // Try to initialize the cache by fetching from the server
                   try {
                       await UnifiedCache.getAllRows('requisitions', true); // Force refresh
                       this.requisitionsData = await UnifiedCache.getRowsByField('requisitions', 'force_key', this.forceKey);
                       console.log('Loaded requisitions for force after cache init:', this.requisitionsData);
                   } catch (initError) {
                       console.warn('Could not initialize requisitions cache:', initError);
                       this.requisitionsData = [];
                   }
               }
           } else {
               console.warn('RequisitionTable module not loaded');
               this.requisitionsData = [];
           }
       } catch (error) {
           console.error('Error loading requisitions:', error);
           this.requisitionsData = [];
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

       // Check if current user can edit notes
       const currentUser = UserManager.getCurrentUser();
       
       // Try multiple possible field names for user key
       const currentUserKey = currentUser ? (currentUser.user_key || currentUser.key || currentUser.id) : null;
       const canEditNotes = currentUser && currentUserKey === forceData.user_key;
       
       // Debug logging
       console.log('Force details - User permission check:', {
           currentUser: currentUser,
           currentUserKey: currentUserKey,
           forceUserKey: forceData.user_key,
           canEditNotes: canEditNotes,
           userKeyMatch: currentUserKey === forceData.user_key
       });

       header.innerHTML = `
           <h1>${forceData.force_name}</h1>
           <div class="force-subtitle">
               ${forceData.faction}${forceData.detachment ? ` - ${forceData.detachment}` : ''} • Commanded by ${forceData.user_name}
           </div>
           ${launchDate ? `<div class="force-launch-date">Crusade Force Launched on ${launchDate}</div>` : ''}
           ${this.renderNotesSection(forceData, canEditNotes)}
       `;

       document.title = `${forceData.force_name} - Crusade Force`;

       // Set up edit notes button event listener if applicable
       if (canEditNotes) {
           this.setupEditNotesButton();
       } else {
           // If we can't edit notes but UserManager might not be ready, try again in a moment
           setTimeout(() => {
               const retryCurrentUser = UserManager.getCurrentUser();
               const retryCurrentUserKey = retryCurrentUser ? (retryCurrentUser.user_key || retryCurrentUser.key || retryCurrentUser.id) : null;
               const retryCanEditNotes = retryCurrentUser && retryCurrentUserKey === forceData.user_key;
               if (retryCanEditNotes && !document.getElementById('edit-notes-btn')) {
                   console.log('Retrying header update with UserManager data');
                   this.updateHeader(forceData);
               }
           }, 500);
       }
   }

   /**
    * Render the notes section for the force header
    */
   renderNotesSection(forceData, canEditNotes) {
       const hasNotes = forceData.notes && forceData.notes.trim() !== '';
       
       if (!hasNotes && !canEditNotes) {
           return '';
       }
       
       if (!hasNotes && canEditNotes) {
           return `
               <div class="force-notes-section">
                   <div class="force-notes-header">
                       <button class="edit-notes-btn" id="edit-notes-btn">Edit Notes</button>
                   </div>
                   <div class="force-notes-content empty">
                       <p>No notes added yet. Click "Edit Notes" to add some.</p>
                   </div>
               </div>
           `;
       }

       return `
           <div class="force-notes-section">
               <div class="force-notes-header">
                   ${canEditNotes ? '<button class="edit-notes-btn" id="edit-notes-btn">Edit Notes</button>' : ''}
               </div>
               <div class="force-notes-content">
                   <div class="force-notes-text">${this.formatNotesText(forceData.notes)}</div>
               </div>
           </div>
       `;
   }

   /**
    * Format notes text for display
    */
   formatNotesText(notes) {
       if (!notes) return '';
       
       // Convert line breaks to HTML and escape HTML characters
       return notes
           .replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/\n/g, '<br>');
   }

   /**
    * Set up the edit notes button event listener
    */
   setupEditNotesButton() {
       const editBtn = document.getElementById('edit-notes-btn');
       if (editBtn) {
           editBtn.addEventListener('click', () => {
               this.showEditNotesModal();
           });
       }
   }

   /**
    * Show the edit notes modal
    */
   showEditNotesModal() {
       const modalHtml = `
           <div class="modal-overlay" id="edit-notes-modal">
               <div class="modal-container">
                   <div class="modal-header">
                       <h2>Edit Force Notes</h2>
                       <button class="modal-close-btn" id="close-edit-notes-modal">×</button>
                   </div>
                   <div class="modal-body">
                       <form class="modal-form" id="edit-notes-form">
                           <div class="form-group">
                               <label for="notes-textarea">Notes</label>
                               <textarea 
                                   id="notes-textarea" 
                                   name="notes" 
                                   rows="8" 
                                   placeholder="Enter your force notes here..."
                               >${this.forceData.notes || ''}</textarea>
                               <div class="help-text">Add any notes, strategies, or background information about your force.</div>
                           </div>
                           <div class="modal-actions">
                               <button type="button" class="btn btn-secondary" id="cancel-edit-notes">Cancel</button>
                               <button type="submit" class="btn btn-primary" id="save-edit-notes">
                                   <span class="btn-text">Save Notes</span>
                                   <span class="btn-loading">Saving...</span>
                               </button>
                           </div>
                       </form>
                   </div>
               </div>
           </div>
       `;

       // Add modal to page
       document.body.insertAdjacentHTML('beforeend', modalHtml);

       // Set up event listeners
       this.setupEditNotesModalEvents();
   }

   /**
    * Set up event listeners for the edit notes modal
    */
   setupEditNotesModalEvents() {
       const modal = document.getElementById('edit-notes-modal');
       const closeBtn = document.getElementById('close-edit-notes-modal');
       const cancelBtn = document.getElementById('cancel-edit-notes');
       const form = document.getElementById('edit-notes-form');
       const saveBtn = document.getElementById('save-edit-notes');

       // Close modal functions
       const closeModal = () => {
           modal.remove();
       };

       // Event listeners
       closeBtn.addEventListener('click', closeModal);
       cancelBtn.addEventListener('click', closeModal);
       
       // Close on overlay click
       modal.addEventListener('click', (e) => {
           if (e.target === modal) {
               closeModal();
           }
       });

       // Handle form submission
       form.addEventListener('submit', async (e) => {
           e.preventDefault();
           await this.saveNotes();
       });
   }

   /**
    * Save the updated notes
    */
   async saveNotes() {
       const textarea = document.getElementById('notes-textarea');
       const saveBtn = document.getElementById('save-edit-notes');
       const btnText = saveBtn.querySelector('.btn-text');
       const btnLoading = saveBtn.querySelector('.btn-loading');

       if (!textarea || !saveBtn) return;

       const newNotes = textarea.value.trim();

       try {
           // Show loading state
           saveBtn.disabled = true;
           btnText.classList.add('hidden');
           btnLoading.classList.add('active');

           // Prepare update data
           const updateData = {
               operation: 'edit',
               force_key: this.forceData.force_key,
               user_key: this.forceData.user_key,
               user_name: this.forceData.user_name,
               force_name: this.forceData.force_name,
               faction: this.forceData.faction,
               detachment: this.forceData.detachment || '',
               supply_limit: this.forceData.supply_limit || 1000,
               mfm_version: this.forceData.mfm_version || '3.3',
               notes: newNotes
           };

           // Make API call
           const response = await fetch(CrusadeConfig.getSheetUrl('forces'), {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/x-www-form-urlencoded',
               },
               body: new URLSearchParams(updateData)
           });

           const result = await response.json();

           if (result.success) {
               // Update local data
               this.forceData.notes = newNotes;
               
               // Update display
               this.updateHeader(this.forceData);
               
               // Close modal
               document.getElementById('edit-notes-modal').remove();
               
               // Show success message
               this.showSuccessMessage('Notes updated successfully!');
               
               // Clear cache to ensure fresh data on next load
               if (typeof UnifiedCache !== 'undefined') {
                   await UnifiedCache.clearCache('forces');
               }
           } else {
               throw new Error(result.error || 'Failed to update notes');
           }

       } catch (error) {
           console.error('Error saving notes:', error);
           this.showErrorMessage('Failed to save notes: ' + error.message);
       } finally {
           // Reset button state
           saveBtn.disabled = false;
           btnText.classList.remove('hidden');
           btnLoading.classList.remove('active');
       }
   }

   /**
    * Show success message
    */
   showSuccessMessage(message) {
       // Create temporary success message
       const successDiv = document.createElement('div');
       successDiv.className = 'success-message';
       successDiv.style.cssText = `
           position: fixed;
           top: 20px;
           right: 20px;
           background-color: #2d5a2d;
           border: 1px solid #4a8a4a;
           color: #90ee90;
           padding: 15px 20px;
           border-radius: 5px;
           z-index: 10000;
           box-shadow: 0 4px 12px rgba(0,0,0,0.3);
       `;
       successDiv.textContent = message;
       
       document.body.appendChild(successDiv);
       
       // Remove after 3 seconds
       setTimeout(() => {
           if (successDiv.parentNode) {
               successDiv.parentNode.removeChild(successDiv);
           }
       }, 3000);
   }

   /**
    * Show error message
    */
   showErrorMessage(message) {
       // Create temporary error message
       const errorDiv = document.createElement('div');
       errorDiv.className = 'error-message-temp';
       errorDiv.style.cssText = `
           position: fixed;
           top: 20px;
           right: 20px;
           background-color: #5a2d2d;
           border: 1px solid #8a4a4a;
           color: #ff9999;
           padding: 15px 20px;
           border-radius: 5px;
           z-index: 10000;
           box-shadow: 0 4px 12px rgba(0,0,0,0.3);
       `;
       errorDiv.textContent = message;
       
       document.body.appendChild(errorDiv);
       
       // Remove after 5 seconds
       setTimeout(() => {
           if (errorDiv.parentNode) {
               errorDiv.parentNode.removeChild(errorDiv);
           }
       }, 5000);
   }

   /**
    * Update battle stats from battles data
    */
   updateStatsFromBattles(battles, forceKey) {
       // Use BattleTable's comprehensive stats calculation
       const stats = BattleTable.calculateBattleStats(battles, forceKey);

       // Calculate supply and requisition stats
       const supplyStats = this.calculateSupplyStats();
       const requisitionStats = this.calculateRequisitionStats();

       // Update DOM with all stats
       const elements = {
           'battles-fought': stats.totalBattles,
           'victories': stats.victories,
           'battle-losses': stats.defeats,
           'battle-ties': stats.draws,
           'supply-limit': supplyStats.limit,
           'supply-used': supplyStats.used,
           'requisition-points': requisitionStats.total,
           'mfm-version': this.forceData?.mfm_version || '3.3'
       };

       // Use utility for setting multiple element texts
       setElementTexts(elements);

       // Show stats section
       CoreUtils.dom.show('force-stats', 'grid');
   }

   /**
    * Calculate supply stats for the force
    */
   calculateSupplyStats() {
       const supplyLimit = this.forceData?.supply_limit || 1000;
       
       // Calculate supply used from units (if available)
       let supplyUsed = 0;
       if (this.unitsData && Array.isArray(this.unitsData)) {
           supplyUsed = this.unitsData.reduce((total, unit) => {
               return total + (parseInt(unit.power_level) || 0);
           }, 0);
       }
       
       return {
           limit: supplyLimit,
           used: supplyUsed
       };
   }

   /**
    * Calculate requisition point stats for the force
    */
   calculateRequisitionStats() {
       let totalRP = 0;
       
       if (this.requisitionsData && Array.isArray(this.requisitionsData)) {
           totalRP = this.requisitionsData.reduce((total, req) => {
               return total + (parseInt(req.rp_change) || 0);
           }, 0);
       } else {
           // If no requisitions data available, show 0 but log for debugging
           console.log('No requisitions data available for RP calculation');
       }
       
       return {
           total: totalRP
       };
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

