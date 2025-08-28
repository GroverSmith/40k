// filename: js/crusade-data.js
// Data loading and management for Crusade Details page with global caching
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
            // Check cache first
            const cachedData = UserStorage.loadCachedCrusades();
            if (cachedData.valid) {
                console.log('Using cached crusades data');
                return this.findCrusadeInData(cachedData.crusades, crusadeKey);
            }
            
            // Load from API if cache miss
            const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
            if (!crusadesUrl) {
                throw new Error('Crusades sheet URL not configured');
            }
            
            console.log('Loading crusades from API...');
            const response = await fetch(crusadesUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Save to cache for 24 hours
            UserStorage.saveCrusadesToCache(data);
            
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
     * Load forces participating in this crusade from cache or API
     */
    async loadParticipatingForces() {
        try {
            // First load all forces (check cache first)
            const cachedForces = UserStorage.loadCachedForces();
            let forcesData;
            
            if (cachedForces.valid) {
                console.log('Using cached forces data');
                forcesData = cachedForces.forces;
            } else {
                const forcesUrl = CrusadeConfig.getSheetUrl('forces');
                if (!forcesUrl) {
                    console.warn('Forces sheet URL not configured');
                    return [];
                }
                
                console.log('Loading forces from API...');
                const response = await fetch(forcesUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                forcesData = await response.json();
                
                // Save to cache
                UserStorage.saveForcesToCache(forcesData);
            }
            
            this.forcesData = forcesData;
            
            // Now load participants to filter forces
            await this.loadParticipants();
            
            // Filter forces that are participating in this crusade
            return this.filterParticipatingForces();
            
        } catch (error) {
            console.error('Error loading participating forces:', error);
            return [];
        }
    },
    
    /**
     * Load crusade participants data
     */
    async loadParticipants() {
        try {
            const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
            
            if (!participantsUrl) {
                console.warn('Participants sheet URL not configured');
                return [];
            }
            
            const response = await fetch(participantsUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.participantsData = data;
            
            return data;
            
        } catch (error) {
            console.error('Error loading participants:', error);
            return [];
        }
    },
    
    /**
     * Filter forces that are registered for this crusade
     */
    filterParticipatingForces() {
        if (!this.forcesData || this.forcesData.length < 2) {
            return [];
        }
        
        if (!this.participantsData || this.participantsData.length < 2) {
            // No participants yet, return empty
            return [];
        }
        
        // Get participant force keys for this crusade
        // Participants structure: 0=Key, 1=Crusade Key, 2=Force Key
        const participantForceKeys = this.participantsData
            .slice(1) // Skip header
            .filter(row => row[1] === this.crusadeKey) // Filter by crusade key
            .map(row => row[2]); // Get force keys
        
        // Filter forces that are participating
        const headers = this.forcesData[0];
        const participatingForces = this.forcesData
            .slice(1) // Skip header
            .filter(row => participantForceKeys.includes(row[0])) // Filter by force key
            .map(row => {
                const force = {};
                headers.forEach((header, index) => {
                    force[header] = row[index];
                });
                return force;
            });
        
        return participatingForces;
    },
    
    /**
     * Get all available forces for registration dropdown
     */
    getAllAvailableForces() {
        if (!this.forcesData || this.forcesData.length < 2) {
            return [];
        }
        
        const headers = this.forcesData[0];
        const forces = this.forcesData.slice(1).map(row => {
            const force = {};
            headers.forEach((header, index) => {
                force[header] = row[index];
            });
            return force;
        });
        
        return forces;
    },
    
    /**
     * Check if a force is already registered
     */
    isForceRegistered(forceKey) {
        if (!this.participantsData || this.participantsData.length < 2) {
            return false;
        }
        
        return this.participantsData.slice(1).some(row => 
            row[1] === this.crusadeKey && row[2] === forceKey
        );
    }
};

// Make globally available
window.CrusadeData = CrusadeData;

console.log('CrusadeData module loaded with global caching support');