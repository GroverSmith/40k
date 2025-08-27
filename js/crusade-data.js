// filename: crusade-data.js
// Data fetching and management for Crusade Details using Key System
// 40k Crusade Campaign Tracker

const CrusadeData = {
    /**
     * Generate a crusade key from crusade name
     */
    generateCrusadeKey(crusadeName) {
        // Match the server-side key generation
        return crusadeName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
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
     * Load main crusade data from API using key
     */
    async loadCrusadeData(crusadeKey) {
        const crusadeSheetUrl = CrusadeConfig.getSheetUrl('crusades');
        
        if (!crusadeSheetUrl) {
            throw new Error('Crusades sheet URL not configured in CrusadeConfig');
        }
        
        // Try to get by key first
        const fetchUrl = `${crusadeSheetUrl}?action=get&key=${encodeURIComponent(crusadeKey)}`;
        
        try {
            const response = await fetch(fetchUrl);
            
            if (response.ok) {
                const responseData = await response.json();
                console.log('Crusade API response:', responseData);
                
                if (responseData.success && responseData.data) {
                    // Add the key to the data for reference
                    responseData.data.key = responseData.data.Key || crusadeKey;
                    return responseData.data;
                }
            }
        } catch (error) {
            console.log('Could not load by key, trying by name:', error);
        }
        
        // Fallback: try to load by name (for backward compatibility)
        const nameUrl = `${crusadeSheetUrl}?action=get-by-name&name=${encodeURIComponent(crusadeKey)}`;
        const nameResponse = await fetch(nameUrl);
        
        if (!nameResponse.ok) {
            throw new Error('Failed to fetch crusade data');
        }
        
        const nameData = await nameResponse.json();
        console.log('Crusade API response (by name):', nameData);
        
        if (!nameData.success || !nameData.data) {
            throw new Error(nameData.error || 'Crusade not found');
        }
        
        // Add the key to the data
        nameData.data.key = nameData.data.Key || this.generateCrusadeKey(nameData.data['Crusade Name']);
        return nameData.data;
    },
    
    /**
     * Load forces participating in a crusade using crusade key
     */
    async loadParticipatingForces(crusadeKey) {
        const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
        
        if (!participantsUrl) {
            return { success: false, forces: [] };
        }
        
        const fetchUrl = `${participantsUrl}?action=forces-for-crusade&crusadeKey=${encodeURIComponent(crusadeKey)}`;
        
        try {
            const response = await fetch(fetchUrl);
            const data = await response.json();
            
            console.log('Participating forces response:', data);
            
            if (data.success && data.forces && data.forces.length > 0) {
                return { success: true, forces: data.forces };
            }
            
            return { success: true, forces: [] };
        } catch (error) {
            console.error('Error loading participating forces:', error);
            return { success: false, forces: [], error: error.message };
        }
    },
    
    /**
     * Load available forces for registration
     */
    async loadAvailableForces() {
        const forcesUrl = CrusadeConfig.getSheetUrl('forces');
        
        if (!forcesUrl) {
            throw new Error('Forces sheet not configured');
        }
        
        // Try cached data first
        const cachedData = this.getCachedForces();
        if (cachedData) {
            console.log('Using cached forces data');
            return cachedData;
        }
        
        // Fetch fresh data
        console.log('Fetching fresh forces data...');
        const response = await fetch(forcesUrl);
        const responseData = await response.json();
        
        let data;
        if (Array.isArray(responseData)) {
            data = responseData;
        } else if (responseData.success && Array.isArray(responseData.data)) {
            data = responseData.data;
        } else {
            throw new Error('Unable to load forces data');
        }
        
        // Cache for future use
        this.cacheForces(data);
        
        return data;
    },
    
    /**
     * Register a force for a crusade using keys
     */
    async registerForce(registrationData) {
        const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
        
        if (!participantsUrl) {
            throw new Error('Crusade Participants sheet not configured');
        }
        
        // Ensure we have keys
        if (!registrationData.crusadeKey) {
            registrationData.crusadeKey = this.generateCrusadeKey(registrationData.crusadeName);
        }
        if (!registrationData.forceKey && registrationData.forceName && registrationData.userName) {
            registrationData.forceKey = this.generateForceKey(registrationData.forceName, registrationData.userName);
        }
        
        console.log('Registering with keys:', {
            crusadeKey: registrationData.crusadeKey,
            forceKey: registrationData.forceKey
        });
        
        // Create form for submission
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = participantsUrl;
        form.target = 'register-submit-frame';
        form.style.display = 'none';
        
        Object.entries(registrationData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });
        
        // Create iframe for submission
        let iframe = document.getElementById('register-submit-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.name = 'register-submit-frame';
            iframe.id = 'register-submit-frame';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }
        
        document.body.appendChild(form);
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                document.body.removeChild(form);
                reject(new Error('Registration timeout'));
            }, 15000);
            
            iframe.onload = () => {
                clearTimeout(timeout);
                try {
                    const response = iframe.contentWindow.document.body.textContent;
                    const result = JSON.parse(response);
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Registration failed'));
                    }
                } catch (error) {
                    // Assume success if we can't read response (CORS)
                    console.log('Could not read response, assuming success');
                    resolve({ success: true });
                }
                
                document.body.removeChild(form);
            };
            
            form.submit();
        });
    },
    
    /**
     * Get cached forces data
     */
    getCachedForces() {
        const cacheKey = 'forces_cache_global';
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                const cacheAge = Date.now() - cachedData.timestamp;
                const cacheMaxAge = (CrusadeConfig.getCacheConfig('default') || 1440) * 60 * 1000;
                
                if (cacheAge < cacheMaxAge) {
                    console.log(`Using cached forces data (${Math.round(cacheAge / 60000)} minutes old)`);
                    return cachedData.data;
                }
            } catch (e) {
                console.warn('Error reading forces cache:', e);
            }
        }
        
        return null;
    },
    
    /**
     * Cache forces data
     */
    cacheForces(data) {
        const cacheKey = 'forces_cache_global';
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
            console.log('Forces data cached for future use');
        } catch (e) {
            console.warn('Error caching forces data:', e);
        }
    }
};

// Make globally available
window.CrusadeData = CrusadeData;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeData;
}

console.log('CrusadeData module loaded with key system support');