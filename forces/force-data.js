// filename: js/force-data.js
// Data fetching and management for Force Details using unified CacheManager
// 40k Crusade Campaign Tracker

const ForceData = {
    // Store loaded data
    forceKey: null,
    forceData: null,
    armyListsData: [],
    battleHistoryData: [],
    
    /**
     * Load main force data from the Forces sheet by key
     */
    async loadForceData(forceKey) {
        this.forceKey = forceKey;
        
        try {
            const forceSheetUrl = CrusadeConfig.getSheetUrl('forces');
            
            if (!forceSheetUrl) {
                throw new Error('Crusade Forces sheet URL not configured in CrusadeConfig');
            }
            
            // Use CacheManager for unified caching
            const data = await CacheManager.fetchWithCache(forceSheetUrl, 'forces');
            
            const force = this.findForceInData(data, forceKey);
            this.forceData = force;
            return force;
            
        } catch (error) {
            console.error('Error loading force data:', error);
            throw error;
        }
    },
    
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
    },
    
    /**
     * Load army lists for a force using force key
     */
    async loadArmyLists(forceKey) {
        const armyListsUrl = CrusadeConfig.getSheetUrl('armies');
        
        if (!armyListsUrl) {
            return { success: false, data: [] };
        }
        
        try {
            const fetchUrl = `${armyListsUrl}?action=force-lists&forceKey=${encodeURIComponent(forceKey || this.forceKey)}`;
            
            // Use CacheManager with specific identifier for this query
            const data = await CacheManager.fetchWithCache(
                fetchUrl, 
                'armyLists', 
                `force_${forceKey || this.forceKey}`
            );
            
            console.log('Army lists response:', data);
            
            if (data.success && data.count > 0) {
                this.armyListsData = data.data;
                return { success: true, data: data.data };
            }
            
            this.armyListsData = [];
            return { success: true, data: [] };
            
        } catch (error) {
            console.error('Error fetching army lists:', error);
            return { success: false, data: [], error: error.message };
        }
    },
    
    /**
     * Load battle history for this force
     */
    // filename: js/force-data.js (partial update - loadBattleHistory method)
	// Updated battle outcome logic

	async loadBattleHistory(forceKey) {
		try {
			const battleHistoryUrl = CrusadeConfig.getSheetUrl('battles');
			if (!battleHistoryUrl) {
				console.warn('Battle History sheet URL not configured');
				return [];
			}
			
			const key = forceKey || this.forceKey;
			const fetchUrl = `${battleHistoryUrl}?action=force-battles&forceKey=${encodeURIComponent(key)}`;
			
			// Use CacheManager with specific identifier
			const responseData = await CacheManager.fetchWithCache(
				fetchUrl,
				'battleHistory',
				`force_${key}`
			);
			
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
			
			// Process battles to determine results
			const processedBattles = battles.map(battle => {
				// Determine if this force was Force 1 or Force 2
				const isForce1 = battle['Force 1 Key'] === key;
				const isForce2 = battle['Force 2 Key'] === key;
				
				if (isForce1) {
					battle.wasForce1 = true;
					battle.opponent = battle['Force 2'];
					battle.opponentPlayer = battle['Player 2'];
					battle.forceScore = battle['Player 1 Score'];
					battle.opponentScore = battle['Player 2 Score'];
				} else if (isForce2) {
					battle.wasForce1 = false;
					battle.opponent = battle['Force 1'];
					battle.opponentPlayer = battle['Player 1'];
					battle.forceScore = battle['Player 2 Score'];
					battle.opponentScore = battle['Player 1 Score'];
				}
				
				// Determine outcome using the correct logic
				const victor = battle['Victor'];
				const victorForceKey = battle['Victor Force Key'];
				
				// First check if it's a draw
				if (victor === 'Draw') {
					battle.result = 'Draw';
				} 
				// If not a draw, check the Victor Force Key
				else if (victorForceKey === key) {
					battle.result = 'Victory';
				} 
				// Otherwise it's a defeat
				else {
					battle.result = 'Defeat';
				}
				
				return battle;
			}).sort((a, b) => {
				// Sort by date played (most recent first)
				const dateA = new Date(a['Date Played'] || 0);
				const dateB = new Date(b['Date Played'] || 0);
				return dateB - dateA;
			});
			
			this.battleHistoryData = processedBattles;
			return processedBattles;
			
		} catch (error) {
			console.error('Error loading battle history:', error);
			return [];
		}
	},
    
    /**
     * Calculate battle statistics
     */
    calculateBattleStats() {
        const stats = {
            totalBattles: this.battleHistoryData.length,
            victories: 0,
            defeats: 0,
            draws: 0,
            winRate: 0,
            totalPointsScored: 0,
            totalPointsConceded: 0,
            averagePointsScored: 0,
            averagePointsConceded: 0
        };
        
        this.battleHistoryData.forEach(battle => {
            // Count results
            if (battle.result === 'Victory') stats.victories++;
            else if (battle.result === 'Defeat') stats.defeats++;
            else if (battle.result === 'Draw') stats.draws++;
            
            // Sum points
            const forceScore = parseInt(battle.forceScore) || 0;
            const opponentScore = parseInt(battle.opponentScore) || 0;
            stats.totalPointsScored += forceScore;
            stats.totalPointsConceded += opponentScore;
        });
        
        // Calculate averages and win rate
        if (stats.totalBattles > 0) {
            stats.winRate = Math.round((stats.victories / stats.totalBattles) * 100);
            stats.averagePointsScored = Math.round(stats.totalPointsScored / stats.totalBattles);
            stats.averagePointsConceded = Math.round(stats.totalPointsConceded / stats.totalBattles);
        }
        
        return stats;
    },
    
    /**
     * Get participating crusades for this force
     */
    async getParticipatingCrusades() {
        try {
            // Load crusades using CacheManager
            const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
            const crusadesData = crusadesUrl ? 
                await CacheManager.fetchWithCache(crusadesUrl, 'crusades') : [];
            
            // Load participants to find which crusades this force is in
            const participantsUrl = CrusadeConfig.getSheetUrl('xref_crusade_participants');
            if (!participantsUrl) {
                return [];
            }
            
            const participantsData = await CacheManager.fetchWithCache(
                participantsUrl, 
                'participants',
                `force_${this.forceKey}`
            );
            
            // Find crusades this force participates in
            const crusadeKeys = participantsData
                .slice(1)
                .filter(row => row[2] === this.forceKey) // Force Key is column 2
                .map(row => row[1]); // Crusade Key is column 1
            
            // Get crusade details for each key
            const headers = crusadesData[0];
            const participatingCrusades = crusadesData
                .slice(1)
                .filter(row => crusadeKeys.includes(row[0])) // Filter by crusade key
                .map(row => {
                    const crusade = {};
                    headers.forEach((header, index) => {
                        crusade[header] = row[index];
                    });
                    return crusade;
                });
            
            return participatingCrusades;
            
        } catch (error) {
            console.error('Error loading participating crusades:', error);
            return [];
        }
    },
    
    /**
     * Generate a force key from force name and user name
     */
    generateForceKey(forceName, userKey) {
        // Match the server-side key generation
        const forcePart = clean(forceName);
        return `${forcePart}_${userKey}`;
    },
    
    /**
     * Generic sheet loader for other data types
     */
    async loadSheetData(sheetType) {
        const sheetUrl = CrusadeConfig.getSheetUrl(sheetType);
        
        if (!sheetUrl) {
            return { success: false, configured: false };
        }
        
        try {
            const data = await CacheManager.fetchWithCache(sheetUrl, sheetType);
            
            return {
                success: true,
                configured: true,
                data: data
            };
        } catch (error) {
            console.error(`Error loading ${sheetType} data:`, error);
            return {
                success: false,
                configured: true,
                error: error.message
            };
        }
    }
};

// Make globally available
window.ForceData = ForceData;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForceData;
}

console.log('ForceData module loaded with unified CacheManager');