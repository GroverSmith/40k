// filename: user-api.js
// Server communication for User Management System
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
            
            console.log('Fetching users from Google Sheets...');
            const response = await fetch(usersUrl);
            const responseData = await response.json();
            
            let data;
            if (Array.isArray(responseData)) {
                data = responseData;
            } else if (responseData.success && Array.isArray(responseData.data)) {
                data = responseData.data;
            } else {
                throw new Error('Unable to load users data');
            }
            
            // Convert to user objects (skip header row)
            const users = data.slice(1).map((row, index) => ({
			id: index + 2,
			key: row[0] || '',           // Key
			timestamp: row[1] || new Date(), // Timestamp
			name: row[2] || 'Unknown User',  // Name (now correctly at index 2)
			discordHandle: row[3] || '',     // Discord Handle
			email: row[4] || '',              // Email
			notes: row[5] || '',              // Notes
			selfRating: row[6] || '',         // Self Rating
			yearsExperience: row[7] || '',    // Years Experience
			gamesPerYear: row[8] || '',       // Games Per Year
			isActive: true
		})).filter(user => user.name !== 'Unknown User');
            
            console.log('Loaded users from API:', users);
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
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'User creation failed'));
                    }
                } catch (error) {
                    // Assume success if we can't read the response (CORS)
                    console.log('Could not read response, assuming success');
                    resolve({ success: true });
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

console.log('UserAPI module loaded');