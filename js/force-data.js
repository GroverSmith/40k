// filename: force-data.js
// Data fetching and management for Force Details using Key System
// 40k Crusade Campaign Tracker

const ForceData = {
    /**
     * Load main force data from the Forces sheet by key
     */
    async loadForceData(forceKey) {
        const forceSheetUrl = CrusadeConfig.getSheetUrl('forces');
        
        if (!forceSheetUrl) {
            throw new Error('Crusade Forces sheet URL not configured in CrusadeConfig');
        }
        
        // First try to get by key
        const keyUrl = `${forceSheetUrl}?action=get&key=${encodeURIComponent(forceKey)}`;
        
        try {
            const keyResponse = await fetch(keyUrl);
            if (keyResponse.ok) {
                const keyData = await keyResponse.json();
                if (keyData.success && keyData.data) {
                    console.log('Force loaded by key:', keyData.data);
                    // Transform the data to match expected structure
                    return {
                        key: keyData.data.Key,
                        forceName: keyData.data['Force Name'],
                        playerName: keyData.data['User Name'],
                        faction: keyData.data.Faction,
                        detachment: keyData.data.Detachment,
                        notes: keyData.data.Notes,
                        timestamp: keyData.data.Timestamp
                    };
                }
            }
        } catch (error) {
            console.log('Could not load by key, trying list method:', error);
        }
        
        // Fallback: Get all forces and find by key
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
            const fetchUrl = `${armyListsUrl}?action=force-lists&forceKey=${encodeURIComponent(forceKey)}`;
            console.log('Fetching army lists for force key:', forceKey);
            
            const response = await fetch(fetchUrl);
            const data = await response.json();
            
            console.log('Army lists response:', data);
            
            if (data.success && data.count > 0) {
                return { success: true, data: data.data };
            }
            
            return { success: true, data: [] };
            
        } catch (error) {
            console.error('Error fetching army lists:', error);
            return { success: false, data: [], error: error.message };
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

console.log('ForceData module loaded with key system support');