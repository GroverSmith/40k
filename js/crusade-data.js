// filename: crusade-data.js
// Data fetching and management for Crusade Details
// 40k Crusade Campaign Tracker

const CrusadeData = {
    /**
     * Load main crusade data from API
     */
    async loadCrusadeData(crusadeName) {
        const crusadeSheetUrl = CrusadeConfig.getSheetUrl('crusades');
        
        if (!crusadeSheetUrl) {
            throw new Error('Crusades sheet URL not configured in CrusadeConfig');
        }
        
        const fetchUrl = `${crusadeSheetUrl}?action=get&name=${encodeURIComponent(crusadeName)}`;
        const response = await fetch(fetchUrl);
        
        if (!response.ok) {
            throw new Error('Failed to fetch crusade data');
        }
        
        const responseData = await response.json();
        console.log('Crusade API response:', responseData);
        
        if (!responseData.success || !responseData.data) {
            throw new Error(responseData.error || 'Crusade not found');
        }
        
        return responseData.data;
    },
    
    /**
     * Load forces participating in a crusade
     */
    async loadParticipatingForces(crusadeName) {
        const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
        
        if (!participantsUrl) {
            return { success: false, forces: [] };
        }
        
        const fetchUrl = `${participantsUrl}?action=forces-for-crusade&crusade=${encodeURIComponent(crusadeName)}`;
        
        try {
            const response = await fetch(fetchUrl);
            const data = await response.json();
            
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
     * Register a force for a crusade
     */
    async registerForce(registrationData) {
        const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
        
        if (!participantsUrl) {
            throw new Error('Crusade Participants sheet not configured');
        }
        
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

console.log('CrusadeData module loaded');