// filename: crusades/crusade-data.js
// Data loading and management for Crusade Details page using unified CacheManager
// 40k Crusade Campaign Tracker

const CrusadeData = {
    
    
        
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