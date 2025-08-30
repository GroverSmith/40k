// filename: force-sections.js
// Section loaders for Force Details using SheetsManager with Key System
// 40k Crusade Campaign Tracker

const ForceSections = {
    /**
     * Load battle history section
     */
	async loadBattleHistory(forceData) {
		const container = document.getElementById('battle-history-content');
		const section = document.getElementById('battle-history-section');
		if (!container || !section) return;
		
		try {
			container.innerHTML = `
				<div class="loading-spinner"></div>
				<span>Loading battle history...</span>
			`;
			section.style.display = 'block';
			
			const battleUrl = CrusadeConfig.getSheetUrl('battleHistory');
			if (!battleUrl) {
				container.innerHTML = '<p class="no-data">Battle history not configured.</p>';
				ForceUI.updateStatsFromBattles([], forceData.key);
				return;
			}
			
			// Use CacheManager for caching
			const fetchUrl = `${battleUrl}?action=force-battles&forceKey=${encodeURIComponent(forceData.key)}`;
			const result = await CacheManager.fetchWithCache(
				fetchUrl,
				'battleHistory',
				`force_${forceData.key}`
			);
			
			if (result.success && result.battles && result.battles.length > 0) {
				const battles = result.battles;
				
				// Sort by date (most recent first)
				battles.sort((a, b) => {
					const dateA = new Date(a['Date Played'] || 0);
					const dateB = new Date(b['Date Played'] || 0);
					return dateB - dateA;
				});
				
				// Update stats with the new function
				ForceUI.updateStatsFromBattles(battles, forceData.key);
				
				// Display battles as table with force key
				ForceUI.displayBattles(battles, container, forceData.key);
			} else {
				container.innerHTML = '<p class="no-data">No battles recorded yet for this force.</p>';
				ForceUI.updateStatsFromBattles([], forceData.key);
			}
			
		} catch (error) {
			console.error('Error loading battle history:', error);
			container.innerHTML = '<p class="error-message">Error loading battle history.</p>';
			ForceUI.updateStatsFromBattles([], forceData.key);
		}
	},    
    /**
     * Load army lists section using force key
     */
    async loadArmyLists(forceData) {
        ForceUI.showSection('army-lists-section');
        
        // Use the force key to load army lists
        const forceKey = forceData.key;
        console.log('Loading army lists for force key:', forceKey);
        
        const result = await ForceData.loadArmyLists(forceKey);
        
        if (result.success) {
            ForceUI.displayArmyLists(result.data, forceData.forceName, forceKey);
        } else {
            ForceUI.displayPlaceholder(
                'army-lists-sheet',
                'armyLists',
                forceData.forceName,
                '📋',
                'will be displayed here'
            );
        }
    },
    
    /**
     * Load characters and units section
     */
    loadCharactersUnits(forceData) {
        ForceUI.showSection('characters-units-section');
        const charactersUnitsUrl = CrusadeConfig.getSheetUrl('charactersUnits');
        
        if (charactersUnitsUrl) {
            // When implemented, this should filter by force key
            SheetsManager.embed('characters-units-sheet', 
                charactersUnitsUrl, 
                {
                    maxHeight: '400px',
                    showStats: true,
                    sortable: true,
                    cacheMinutes: CrusadeConfig.getCacheConfig('forcePage'),
                    // Future: Add filter parameter for force key
                    // filter: { forceKey: forceData.key }
                }
            );
        } else {
            ForceUI.displayPlaceholder(
                'characters-units-sheet',
                'charactersUnits',
                forceData.forceName,
                '🛡️',
                'will be displayed here'
            );
        }
    },
    
    /**
     * Load stories section
     */
    loadStories(forceData) {
        ForceUI.showSection('stories-section');
        const storiesUrl = CrusadeConfig.getSheetUrl('stories');
        
        if (storiesUrl) {
            // When implemented, this should filter by force key
            SheetsManager.embed('stories-sheet', 
                storiesUrl, 
                {
                    maxHeight: '400px',
                    showStats: true,
                    sortable: true,
                    cacheMinutes: CrusadeConfig.getCacheConfig('forcePage'),
                    // Future: Add filter parameter for force key
                    // filter: { forceKey: forceData.key }
                }
            );
        } else {
            ForceUI.displayPlaceholder(
                'stories-sheet',
                'stories',
                forceData.forceName,
                '📖',
                'and narratives will be displayed here'
            );
        }
    },
    
    /**
     * Load force logs section
     */
    loadForceLogs(forceData) {
        ForceUI.showSection('force-logs-section');
        const forceLogsUrl = CrusadeConfig.getSheetUrl('forceLogs');
        
        if (forceLogsUrl) {
            // When implemented, this should filter by force key
            SheetsManager.embed('force-logs-sheet', 
                forceLogsUrl, 
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    cacheMinutes: CrusadeConfig.getCacheConfig('forcePage'),
                    // Future: Add filter parameter for force key
                    // filter: { forceKey: forceData.key }
                }
            );
        } else {
            ForceUI.displayPlaceholder(
                'force-logs-sheet',
                'forceLogs',
                forceData.forceName,
                '📝',
                'will be displayed here'
            );
        }
    },
	
	/**
     * Load characters and units for the force
     */
    async loadCharactersUnits(forceKey) {
        const section = document.getElementById('characters-units-section');
        const container = document.getElementById('characters-units-sheet');
        
        if (!section || !container) return;
        
        try {
            const unitsUrl = CrusadeConfig.getSheetUrl('units');
            if (!unitsUrl) {
                container.innerHTML = '<p class="no-data">Units tracking not configured.</p>';
                section.style.display = 'block';
                return;
            }
            
            // Fetch units for this force with caching
            const fetchUrl = `${unitsUrl}?action=force-units&forceKey=${encodeURIComponent(forceKey)}`;
            const response = await CacheManager.fetchWithCache(
                fetchUrl,
                'units',
                `force_${forceKey}`
            );
            
            if (response.success && response.units && response.units.length > 0) {
                this.displayUnitsTable(response.units, container);
            } else {
                container.innerHTML = '<p class="no-data">No units registered for this force yet.</p>';
            }
            
            section.style.display = 'block';
            
        } catch (error) {
            console.error('Error loading units:', error);
            container.innerHTML = '<p class="error-message">Error loading units data.</p>';
            section.style.display = 'block';
        }
    },
    
    /**
     * Display units in a table format
     */
    displayUnitsTable(units, container) {
        // Group units by type
        const unitsByType = {};
        units.forEach(unit => {
            const type = unit.Type || 'Other';
            if (!unitsByType[type]) {
                unitsByType[type] = [];
            }
            unitsByType[type].push(unit);
        });
        
        let html = '<div class="units-container">';
        
        // Display each type group
        Object.keys(unitsByType).sort().forEach(type => {
            const typeUnits = unitsByType[type];
            
            html += `
                <div class="unit-type-group">
                    <h4 class="unit-type-header">${type} (${typeUnits.length})</h4>
                    <table class="units-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Data Sheet</th>
                                <th>Points</th>
                                <th>CP</th>
                                <th>XP</th>
                                <th>Rank</th>
                                <th>Battles</th>
                                <th>Kills</th>
                                <th>Deaths</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            typeUnits.forEach(unit => {
                const rank = unit.Rank || this.calculateRank(unit.XP);
                const rankClass = `rank-${rank.toLowerCase().replace(/[^a-z]/g, '')}`;
                
                html += `
                    <tr class="unit-row">
                        <td class="unit-name">
                            <strong>${unit.Name || 'Unnamed'}</strong>
                            ${unit['Battle Traits'] ? '<span class="badge trait">T</span>' : ''}
                            ${unit['Battle Scars'] ? '<span class="badge scar">S</span>' : ''}
                            ${unit.Relics ? '<span class="badge relic">R</span>' : ''}
                        </td>
                        <td>${unit['Data Sheet'] || ''}</td>
                        <td class="text-center">${unit.Points || 0}</td>
                        <td class="text-center">${unit['Crusade Points'] || 0}</td>
                        <td class="text-center">${unit.XP || 0}</td>
                        <td class="text-center"><span class="rank-badge ${rankClass}">${rank}</span></td>
                        <td class="text-center">${unit['Battle Count'] || 0}</td>
                        <td class="text-center">${unit['Kill Count'] || 0}</td>
                        <td class="text-center">${unit['Times Killed'] || 0}</td>
                    </tr>
                `;
                
                // Add details row if unit has description or notable history
                if (unit.Description || unit['Notable History'] || unit.Wargear || unit.Enhancements) {
                    html += `
                        <tr class="unit-details-row">
                            <td colspan="9">
                                <div class="unit-details">
                    `;
                    
                    if (unit.Wargear) {
                        html += `<div class="detail-item"><strong>Wargear:</strong> ${unit.Wargear}</div>`;
                    }
                    if (unit.Enhancements) {
                        html += `<div class="detail-item"><strong>Enhancements:</strong> ${unit.Enhancements}</div>`;
                    }
                    if (unit['Battle Traits']) {
                        html += `<div class="detail-item"><strong>Battle Traits:</strong> ${unit['Battle Traits']}</div>`;
                    }
                    if (unit['Battle Scars']) {
                        html += `<div class="detail-item"><strong>Battle Scars:</strong> ${unit['Battle Scars']}</div>`;
                    }
                    if (unit.Description) {
                        html += `<div class="detail-item"><strong>Description:</strong> ${unit.Description}</div>`;
                    }
                    if (unit['Notable History']) {
                        html += `<div class="detail-item"><strong>Notable History:</strong> ${unit['Notable History']}</div>`;
                    }
                    
                    html += `
                                </div>
                            </td>
                        </tr>
                    `;
                }
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Add summary statistics
        const totalUnits = units.length;
        const totalPoints = units.reduce((sum, unit) => sum + (parseInt(unit.Points) || 0), 0);
        const totalCP = units.reduce((sum, unit) => sum + (parseInt(unit['Crusade Points']) || 0), 0);
        const totalKills = units.reduce((sum, unit) => sum + (parseInt(unit['Kill Count']) || 0), 0);
        
        html += `
            <div class="units-summary">
                <strong>Force Summary:</strong>
                ${totalUnits} units | ${totalPoints} points | ${totalCP} Crusade Points | ${totalKills} total kills
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    /**
     * Calculate rank from XP
     */
    calculateRank(xp) {
        const xpValue = parseInt(xp) || 0;
        if (xpValue >= 51) return 'Legendary';
        if (xpValue >= 31) return 'Heroic';
        if (xpValue >= 16) return 'Veteran';
        if (xpValue >= 6) return 'Blooded';
        return 'Battle-ready';
    },
};

// Make globally available
window.ForceSections = ForceSections;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceSections;
}

console.log('ForceSections module loaded with key system support');