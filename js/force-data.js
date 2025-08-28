// filename: js/force-data.js
// Data fetching and management for Force Details using Key System with global caching
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
            // Check cache first and use it if valid
            const cachedData = UserStorage.loadCachedForces();
            if (cachedData.valid) {
                console.log('Using cached forces data');
                const force = this.findForceInData(cachedData.forces, forceKey);
                this.forceData = force;
                return force;
            }
            
            console.log('Cache miss or expired, loading from API...');
            
            // Load from API if cache miss
            const forceSheetUrl = CrusadeConfig.getSheetUrl('forces');
            
            if (!forceSheetUrl) {
                throw new Error('Crusade Forces sheet URL not configured in CrusadeConfig');
            }
            
            // Get all forces and cache them
            const response = await fetch(forceSheetUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch force data');
            }
            
            const responseData = await response.json();
            
            // Handle different response formats
            let data;
            if (Array.isArray(responseData)) {
                data = responseData;
            } else if (responseData.success && Array.isArray(responseData.data)) {
                data = responseData.data;
            } else if (responseData.values && Array.isArray(responseData.values)) {
                data = responseData.values;
            } else {
                console.error('Unexpected response format:', responseData);
                throw new Error('Unexpected response format from force data API');
            }
            
            // Save to cache for 1 hour
            UserStorage.saveForcesToCache(data);
            
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
        const armyListsUrl = CrusadeConfig.getSheetUrl('armyLists');
        
        if (!armyListsUrl) {
            return { success: false, data: [] };
        }
        
        try {
            const fetchUrl = `${armyListsUrl}?action=force-lists&forceKey=${encodeURIComponent(forceKey || this.forceKey)}`;
            console.log('Fetching army lists for force key:', forceKey || this.forceKey);
            
            const response = await fetch(fetchUrl);
            const data = await response.json();
            
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
    async loadBattleHistory(forceKey) {
        try {
            const battleHistoryUrl = CrusadeConfig.getSheetUrl('battleHistory');
            if (!battleHistoryUrl) {
                console.warn('Battle History sheet URL not configured');
                return [];
            }
            
            const key = forceKey || this.forceKey;
            console.log('Loading battle history for force:', key);
            
            const response = await fetch(`${battleHistoryUrl}?action=force-battles&forceKey=${encodeURIComponent(key)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseData = await response.json();
            
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
                // Determine if this force won, lost, or drew
                if (battle['Force 1 Key'] === key) {
                    // This force was Force 1
                    battle.wasForce1 = true;
                    battle.opponent = battle['Force 2'];
                    battle.opponentPlayer = battle['Player 2'];
                    battle.forceScore = battle['Player 1 Score'];
                    battle.opponentScore = battle['Player 2 Score'];
                    
                    if (battle.Victor === 'Player 1') {
                        battle.result = 'Victory';
                    } else if (battle.Victor === 'Player 2') {
                        battle.result = 'Defeat';
                    } else {
                        battle.result = 'Draw';
                    }
                } else if (battle['Force 2 Key'] === key) {
                    // This force was Force 2
                    battle.wasForce1 = false;
                    battle.opponent = battle['Force 1'];
                    battle.opponentPlayer = battle['Player 1'];
                    battle.forceScore = battle['Player 2 Score'];
                    battle.opponentScore = battle['Player 1 Score'];
                    
                    if (battle.Victor === 'Player 2') {
                        battle.result = 'Victory';
                    } else if (battle.Victor === 'Player 1') {
                        battle.result = 'Defeat';
                    } else {
                        battle.result = 'Draw';
                    }
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
            // Load crusades from cache if available
            const cachedCrusades = UserStorage.loadCachedCrusades();
            let crusadesData;
            
            if (cachedCrusades.valid) {
                console.log('Using cached crusades data for participating crusades');
                crusadesData = cachedCrusades.crusades;
            } else {
                const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
                if (!crusadesUrl) {
                    return [];
                }
                
                const response = await fetch(crusadesUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                crusadesData = await response.json();
                UserStorage.saveCrusadesToCache(crusadesData);
            }
            
            // Load participants to find which crusades this force is in
            const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
            if (!participantsUrl) {
                return [];
            }
            
            const participantsResponse = await fetch(participantsUrl);
            if (!participantsResponse.ok) {
                return [];
            }
            
            const participantsData = await participantsResponse.json();
            
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
    generateForceKey(forceName, userName) {
        // Match the server-side key generation
        const forcePart = forceName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
        const userPart = userName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
        return `${forcePart}_${userPart}`;
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
            const response = await fetch(sheetUrl);
            const data = await response.json();
            
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

console.log('ForceData module loaded with key system and caching support');