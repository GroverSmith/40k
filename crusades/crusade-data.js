// filename: crusades/crusade-data.js
// Data loading and management for Crusade Details page using unified CacheManager
// 40k Crusade Campaign Tracker

const CrusadeData = {
    crusadeKey: null,
    crusadeData: null,
    forcesData: [],
    participantsData: [],
    
    /**
     * Load crusade data from cache or API
     */
    async loadCrusadeData(crusadeKey) {
        this.crusadeKey = crusadeKey;
        
        try {
            const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
            if (!crusadesUrl) {
                throw new Error('Crusades sheet URL not configured');
            }
            
            // Use CacheManager for unified caching
            const data = await CacheManager.fetchWithCache(crusadesUrl, 'crusades');
            
            return this.findCrusadeInData(data, crusadeKey);
            
        } catch (error) {
            console.error('Error loading crusade data:', error);
            throw error;
        }
    },
    
    /**
     * Find specific crusade in data array
     */
    findCrusadeInData(data, crusadeKey) {
        if (!data || data.length < 2) {
            throw new Error('No crusade data available');
        }
        
        // Find crusade by key (column 0)
        const crusadeRow = data.find((row, index) => {
            if (index === 0) return false; // Skip header
            return row[0] === crusadeKey;
        });
        
        if (!crusadeRow) {
            throw new Error(`Crusade with key "${crusadeKey}" not found`);
        }
        
        // Map to object using header
        const headers = data[0];
        const crusade = {};
        headers.forEach((header, index) => {
            crusade[header] = crusadeRow[index];
        });
        
        this.crusadeData = crusade;
        return crusade;
    },
    
        
    /**
     * Load all available forces (for registration dropdown)
     */
    async loadAvailableForces() {
        try {
            const forcesUrl = CrusadeConfig.getSheetUrl('forces');
            if (!forcesUrl) {
                throw new Error('Forces sheet URL not configured');
            }
            
            // Use CacheManager for unified caching
            return await CacheManager.fetchWithCache(forcesUrl, 'forces');
            
        } catch (error) {
            console.error('Error loading available forces:', error);
            throw error;
        }
    },
    
    /**
     * Register a force for a crusade
     */
    async registerForce(registrationData) {
        const participantsUrl = CrusadeConfig.getSheetUrl('xref_crusade_participants');
        
        if (!participantsUrl) {
            throw new Error('Participants sheet URL not configured');
        }
        
        // Submit registration
        const response = await fetch(participantsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(registrationData).toString()
        });
        
        if (!response.ok) {
            throw new Error('Failed to register force');
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Clear the participants cache
            CacheManager.clear('participants');
        }
        
        return result;
    },
    
};

// Make globally available
window.CrusadeData = CrusadeData;

console.log('CrusadeData module loaded with unified CacheManager');