// filename: js/user-api.js
// Server communication for User Management System (using CacheManager)
// 40k Crusade Campaign Tracker

const UserAPI = {
    // Loading state
    isLoadingUsers: false,
    
    /**
     * Load all users from the backend
     */
    async loadUsers() {
        // Prevent multiple simultaneous loads
        if (this.isLoadingUsers) {
            console.log('Already loading users, skipping duplicate request');
            return null;
        }
        
        this.isLoadingUsers = true;
        
        try {
            const usersUrl = CrusadeConfig.getSheetUrl('users');
            
            if (!usersUrl) {
                console.warn('Users sheet URL not configured');
                return [];
            }
            
            // Use CacheManager for fetching with cache
            const data = await CacheManager.fetchWithCache(usersUrl, 'users');
            
            // Convert to user objects (skip header row)
            const users = data.slice(1).map((row, index) => ({
                id: index + 2,
                key: row[0] || '',
                timestamp: row[1] || new Date(),
                name: row[2] || 'Unknown User',
                discordHandle: row[3] || '',
                email: row[4] || '',
                notes: row[5] || '',
                selfRating: row[6] || '',
                yearsExperience: row[7] || '',
                gamesPerYear: row[8] || '',
                isActive: true
            })).filter(user => user.name !== 'Unknown User');
            
            console.log('Loaded users from API/cache:', users);
            return users;
            
        } catch (error) {
            console.error('Error loading users:', error);
            return [];
        } finally {
            this.isLoadingUsers = false;
        }
    },
    
    /**
     * Submit user creation via hidden form
     */
    async submitUserCreation(userData, url) {
        return new Promise((resolve, reject) => {
            // Create hidden form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = 'create-user-frame';
            form.style.display = 'none';
            
            Object.entries(userData).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                }
            });
            
            // Create iframe
            let iframe = document.getElementById('create-user-frame');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.name = 'create-user-frame';
                iframe.id = 'create-user-frame';
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
            }
            
            document.body.appendChild(form);
            
            // Handle response
            const timeout = setTimeout(() => {
                document.body.removeChild(form);
                reject(new Error('User creation timeout'));
            }, 15000);
            
            iframe.onload = () => {
                clearTimeout(timeout);
                try {
                    const response = iframe.contentWindow.document.body.textContent;
                    const result = JSON.parse(response);
                    
                    if (result.success) {
                        // Clear ALL user-related caches to force reload
                        CacheManager.clear('users');
                        CacheManager.clearType('users');
                        
                        // Include the user data in the response if available
                        if (result.user) {
                            resolve(result);
                        } else {
                            // Include the submitted data as the user object
                            resolve({ 
                                success: true, 
                                user: userData,
                                message: result.message || 'User created successfully'
                            });
                        }
                    } else {
                        reject(new Error(result.error || 'User creation failed'));
                    }
                } catch (error) {
                    // Assume success if we can't read the response (CORS)
                    console.log('Could not read response, assuming success');
                    
                    // Clear ALL user-related caches
                    CacheManager.clear('users');
                    CacheManager.clearType('users');
                    
                    resolve({ 
                        success: true,
                        user: userData,
                        message: 'User created (unconfirmed due to CORS)'
                    });
                }
                
                document.body.removeChild(form);
            };
            
            iframe.onerror = () => {
                clearTimeout(timeout);
                document.body.removeChild(form);
                reject(new Error('Form submission failed'));
            };
            
            form.submit();
        });
    },
    
    /**
     * Create a new user
     */
    async createUser(userData) {
        const usersUrl = CrusadeConfig.getSheetUrl('users');
        if (!usersUrl) {
            throw new Error('Users sheet not configured');
        }
        
        // Validate required fields
        if (!userData.name) {
            throw new Error('Name is required');
        }
        
        return await this.submitUserCreation(userData, usersUrl);
    },
    
    /**
     * Check if loading is in progress
     */
    isLoading() {
        return this.isLoadingUsers;
    }
};

// Make globally available
window.UserAPI = UserAPI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserAPI;
}

console.log('UserAPI module loaded (using CacheManager)');