// filename: story-form.js
// Story form functionality for 40k Crusade Campaign Tracker

class StoryForm extends BaseForm {
    constructor() {
        super('story-form', {
            submitUrl: '', // Will be set from config
            requiredFields: ['userName', 'storyType', 'title', 'storyText1'],
            successMessage: 'Story submitted successfully!',
            errorMessage: 'Failed to submit story. Please try again.',
            redirectUrl: '../index.html'
        });
        
        this.forces = [];
        this.crusades = [];
    }
    
    async init() {
        console.log('Initializing Story Form...');
        
        // Set submit URL from config
        if (typeof CrusadeConfig !== 'undefined') {
            this.config.submitUrl = CrusadeConfig.getSheetUrl('stories');
        }
        
        if (!this.config.submitUrl) {
            console.error('Stories sheet URL not configured');
            this.showError('Story submission is not configured. Please contact administrator.');
            return;
        }
        
        // Initialize base form functionality
        this.initBase();
        
        // Set up character counters
        this.setupCharacterCounters();
        
        // Load forces and crusades for dropdowns
        await this.loadAssociations();
        
        console.log('Story Form initialized');
    }
    
    /**
     * Set up character counters for text areas
     */
    setupCharacterCounters() {
        for (let i = 1; i <= 3; i++) {
            const textarea = document.getElementById(`story-text-${i}`);
            const counter = document.getElementById(`count-${i}`);
            
            if (textarea && counter) {
                textarea.addEventListener('input', () => {
                    const length = textarea.value.length;
                    const maxLength = parseInt(textarea.maxLength);
                    
                    counter.textContent = `${length.toLocaleString()} / ${maxLength.toLocaleString()} characters`;
                    
                    // Update counter color based on usage
                    counter.classList.remove('warning', 'error');
                    if (length >= maxLength) {
                        counter.classList.add('error');
                    } else if (length >= maxLength * 0.9) {
                        counter.classList.add('warning');
                    }
                });
            }
        }
    }
    
    /**
     * Load forces and crusades for association dropdowns
     */
    async loadAssociations() {
        try {
            // Load forces
            await this.loadForces();
            
            // Load crusades
            await this.loadCrusades();
            
        } catch (error) {
            console.error('Error loading associations:', error);
        }
    }
    
    /**
     * Load forces from API or cache
     */
    async loadForces() {
        const forceSelect = document.getElementById('force-select');
        if (!forceSelect) return;
        
        try {
            const forcesUrl = CrusadeConfig.getSheetUrl('forces');
            if (!forcesUrl) return;
            
            // Use CacheManager for fetching
            const data = await CacheManager.fetchWithCache(forcesUrl, 'forces');
            
            if (data && data.length > 1) {
                // Skip header row
                this.forces = data.slice(1).map(row => ({
                    key: row[0],
                    userName: row[1],
                    forceName: row[2],
                    faction: row[3]
                }));
                
                // Sort by force name
                this.forces.sort((a, b) => a.forceName.localeCompare(b.forceName));
                
                // Populate dropdown
                this.forces.forEach(force => {
                    const option = document.createElement('option');
                    option.value = force.key;
                    option.textContent = `${force.forceName} (${force.userName}) - ${force.faction}`;
                    forceSelect.appendChild(option);
                });
                
                console.log(`Loaded ${this.forces.length} forces`);
            }
        } catch (error) {
            console.error('Error loading forces:', error);
        }
    }
    
    /**
     * Load crusades from API or cache
     */
    async loadCrusades() {
        const crusadeSelect = document.getElementById('crusade-select');
        if (!crusadeSelect) return;
        
        try {
            const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
            if (!crusadesUrl) return;
            
            // Use CacheManager for fetching
            const data = await CacheManager.fetchWithCache(crusadesUrl, 'crusades');
            
            if (data && data.length > 1) {
                // Skip header row
                this.crusades = data.slice(1).map(row => ({
                    key: row[0],
                    state: row[1],
                    crusadeName: row[2],
                    crusadeType: row[3]
                }));
                
                // Sort by crusade name
                this.crusades.sort((a, b) => a.crusadeName.localeCompare(b.crusadeName));
                
                // Populate dropdown
                this.crusades.forEach(crusade => {
                    const option = document.createElement('option');
                    option.value = crusade.key;
                    option.textContent = `${crusade.crusadeName} (${crusade.state})`;
                    crusadeSelect.appendChild(option);
                });
                
                console.log(`Loaded ${this.crusades.length} crusades`);
            }
        } catch (error) {
            console.error('Error loading crusades:', error);
        }
    }
    
    /**
     * Validate specific fields
     */
    validateSpecificField(field, value) {
        const fieldName = field.name || field.id;
        
        switch(fieldName) {
            case 'title':
                if (value.length < 3) {
                    return {
                        isValid: false,
                        errorMessage: 'Title must be at least 3 characters long.'
                    };
                }
                break;
                
            case 'storyText1':
                if (value.length < 50) {
                    return {
                        isValid: false,
                        errorMessage: 'Story must be at least 50 characters long.'
                    };
                }
                break;
                
            case 'image1':
            case 'image2':
            case 'image3':
            case 'textLink':
            case 'audioLink':
                if (value && !this.isValidUrl(value)) {
                    return {
                        isValid: false,
                        errorMessage: 'Please enter a valid URL.'
                    };
                }
                break;
        }
        
        return { isValid: true };
    }
    
    /**
     * Check if a URL is valid
     */
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    /**
     * Gather form data
     */
    gatherFormData() {
        const formData = new FormData(this.form);
        const currentUser = UserManager.getCurrentUser();
        
        // Generate user key
        let userKey = '';
        const userName = formData.get('userName');
        if (currentUser && currentUser.key) {
            userKey = currentUser.key;
        } else if (userName) {
            // Generate key from name if no user selected
            userKey = userName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
        }
        
        return {
            timestamp: new Date().toISOString(),
            userKey: userKey,
            userName: userName,
            forceKey: formData.get('forceKey') || '',
            crusadeKey: formData.get('crusadeKey') || '',
            storyType: formData.get('storyType'),
            title: formData.get('title'),
            imperialDate: formData.get('imperialDate') || '',
            storyText1: formData.get('storyText1'),
            storyText2: formData.get('storyText2') || '',
            storyText3: formData.get('storyText3') || '',
            textLink: formData.get('textLink') || '',
            image1: formData.get('image1') || '',
            image2: formData.get('image2') || '',
            image3: formData.get('image3') || '',
            audioLink: formData.get('audioLink') || ''
        };
    }
    
    /**
     * Get form instance name for onclick handlers
     */
    getFormInstanceName() {
        return 'storyForm';
    }
    
    /**
     * Show success with specific message
     */
    showSuccess() {
        super.showSuccess();
        
        // Store success notification for the home page
        sessionStorage.setItem('story_created', JSON.stringify({
            title: document.getElementById('title').value,
            timestamp: Date.now()
        }));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for config to load
    if (typeof CrusadeConfig === 'undefined') {
        console.log('Waiting for CrusadeConfig...');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Create and initialize form
    window.storyForm = new StoryForm();
    await storyForm.init();
});

console.log('StoryForm module loaded');