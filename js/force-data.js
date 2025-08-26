// filename: force-data.js
// Data fetching and management for Force Details
// 40k Crusade Campaign Tracker

const ForceData = {
    /**
     * Load main force data from the Forces sheet
     */
    async loadForceData(forceName) {
        const forceSheetUrl = CrusadeConfig.getSheetUrl('forces');
        
        if (!forceSheetUrl) {
            throw new Error('Crusade Forces sheet URL not configured in CrusadeConfig');
        }
        
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
        console.log('Looking for force name:', forceName);
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No force data available or invalid data format');
        }
        
        // Find the force by name
        const decodedForceName = decodeURIComponent(forceName);
        console.log('Decoded force name for matching:', decodedForceName);
        
        const forceRow = data.find(row => 
            row[1] && row[1].toString().toLowerCase().trim() === decodedForceName.toLowerCase().trim()
        );
        
        if (!forceRow) {
            const availableForces = data.slice(1).map(row => row[1]).filter(name => name);
            console.log('Available forces:', availableForces);
            throw new Error(`Force "${decodedForceName}" not found in the database. Available forces: ${availableForces.join(', ')}`);
        }
        
        // Map the columns from Forces sheet
        const forceData = {
            playerName: forceRow[0] || '',
            forceName: forceRow[1] || '',
            faction: forceRow[2] || '',
            detachment: forceRow[3] || '',
            notes: forceRow[4] || '',
            timestamp: forceRow[5] || ''
        };
        
        console.log('Successfully found and loaded force data:', forceData);
        return forceData;
    },
    
    /**
     * Load army lists for a force
     */
    async loadArmyLists(forceName) {
        const armyListsUrl = CrusadeConfig.getSheetUrl('armyLists');
        
        if (!armyListsUrl) {
            return { success: false, data: [] };
        }
        
        try {
            const fetchUrl = `${armyListsUrl}?action=list&force=${encodeURIComponent(forceName)}`;
            console.log('Fetching army lists from:', fetchUrl);
            
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

console.log('ForceData module loaded');