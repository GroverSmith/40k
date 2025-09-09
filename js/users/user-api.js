// filename: js/user-api.js
// Server communication for User Management System (using UnifiedCache)
// 40k Crusade Campaign Tracker

const UserAPI = {
    // Loading state
    isLoadingUsers: false,
    
    /**
     * Load all users from the backend using UnifiedCache
     */
    async loadUsers() {
        // Prevent multiple simultaneous loads
        if (this.isLoadingUsers) {
            console.log('Already loading users, skipping duplicate request');
            return null;
        }
        
        this.isLoadingUsers = true;
        
        try {
            // Use UnifiedCache for fetching users
            const users = await UnifiedCache.getAllRows('users');
            
            console.log('Loaded users from UnifiedCache:', users);
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
            
            iframe.onload = async () => {
                clearTimeout(timeout);
                try {
                    const response = iframe.contentWindow.document.body.textContent;
                    const result = JSON.parse(response);
                    
                    if (result.success) {
                        // Clear users cache in UnifiedCache to force reload
                        await UnifiedCache.clearCache('users');
                        
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
                    
                    // Clear users cache in UnifiedCache
                    await UnifiedCache.clearCache('users');
                    
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
        const usersUrl = TableDefs.users?.url;
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

console.log('UserAPI module loaded (using UnifiedCache)');