// filename: add-story.js
// Simplified Story Form using base class
// 40k Crusade Campaign Tracker

class StoryForm extends BaseForm {
    constructor() {
        super('story-form', {
            submitUrl: CrusadeConfig.getSheetUrl('stories'),
            successMessage: 'Story submitted successfully!',
            errorMessage: 'Failed to submit story',
            maxCharacters: 50000,
            minCharacters: 100,
            clearCacheOnSuccess: ['stories']
        });

        this.contextData = {};
        this.init();
    }

    async init() {
        // Initialize base functionality
        this.initBase();

        // Load context from URL
        this.loadContext();

        // Setup character counter for story content
        FormUtilities.setupCharacterCounter('story-content', 'char-count', {
            maxCharacters: this.config.maxCharacters,
            minCharacters: this.config.minCharacters
        });

        // Setup related entity selection
        await this.setupRelatedEntities();
    }

    loadContext() {
        const urlParams = new URLSearchParams(window.location.search);

        this.contextData = {
            forceKey: urlParams.get('forceKey'),
            forceName: urlParams.get('forceName'),
            crusadeKey: urlParams.get('crusadeKey'),
            crusadeName: urlParams.get('crusadeName'),
            userName: urlParams.get('userName') || UserStorage.getCurrentUser()?.name || ''
        };

        // Pre-fill related fields if context provided
        if (this.contextData.forceKey) {
            const forceField = document.getElementById('related-force');
            if (forceField) forceField.value = this.contextData.forceKey;
        }

        if (this.contextData.crusadeKey) {
            const crusadeField = document.getElementById('related-crusade');
            if (crusadeField) crusadeField.value = this.contextData.crusadeKey;
        }

        // Update header context
        this.updateHeaderContext();
    }

    updateHeaderContext() {
        const contextEl = document.getElementById('story-context');
        if (!contextEl) return;

        let contextText = 'Write a new campaign story';

        if (this.contextData.forceName) {
            contextText = `Writing story for ${this.contextData.forceName}`;
        } else if (this.contextData.crusadeName) {
            contextText = `Writing story for ${this.contextData.crusadeName} crusade`;
        }

        contextEl.textContent = contextText;
    }

    async setupRelatedEntities() {
        // Load forces for dropdown
        const forceSelect = document.getElementById('related-force');
        if (forceSelect) {
            try {
                const forcesUrl = CrusadeConfig.getSheetUrl('forces');
                const forces = await CacheManager.fetchWithCache(forcesUrl, 'forces');

                forceSelect.innerHTML = '<option value="">Select force (optional)...</option>';

                forces.slice(1).forEach(row => {
                    if (row[0] && row[2]) { // Key and Force Name
                        const option = document.createElement('option');
                        option.value = row[0];
                        option.textContent = `${row[2]} (${row[1]})`; // Force Name (User)
                        forceSelect.appendChild(option);
                    }
                });

                // Re-select if context provided
                if (this.contextData.forceKey) {
                    forceSelect.value = this.contextData.forceKey;
                }
            } catch (error) {
                console.error('Error loading forces:', error);
            }
        }

        // Load crusades for dropdown
        const crusadeSelect = document.getElementById('related-crusade');
        if (crusadeSelect) {
            try {
                const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
                const crusades = await CacheManager.fetchWithCache(crusadesUrl, 'crusades');

                crusadeSelect.innerHTML = '<option value="">Select crusade (optional)...</option>';

                crusades.slice(1).forEach(row => {
                    if (row[0] && row[2]) { // Key and Crusade Name
                        const option = document.createElement('option');
                        option.value = row[0];
                        option.textContent = row[2]; // Crusade Name
                        crusadeSelect.appendChild(option);
                    }
                });

                // Re-select if context provided
                if (this.contextData.crusadeKey) {
                    crusadeSelect.value = this.contextData.crusadeKey;
                }
            } catch (error) {
                console.error('Error loading crusades:', error);
            }
        }
    }

    validateSpecificField(field, value) {
        if (field.id === 'story-title' && value) {
            if (value.length < 3) {
                return {
                    isValid: false,
                    errorMessage: 'Title must be at least 3 characters.'
                };
            }
            if (value.length > 100) {
                return {
                    isValid: false,
                    errorMessage: 'Title must be no more than 100 characters.'
                };
            }
        }

        if (field.id === 'story-content' && value) {
            if (value.length < this.config.minCharacters) {
                return {
                    isValid: false,
                    errorMessage: `Story must be at least ${this.config.minCharacters} characters.`
                };
            }
            if (value.length > this.config.maxCharacters) {
                return {
                    isValid: false,
                    errorMessage: `Story must be no more than ${this.config.maxCharacters.toLocaleString()} characters.`
                };
            }
        }

        return { isValid: true };
    }

    gatherFormData() {
        const formData = super.gatherFormData();

        // Generate story key
        const userKey = KeyUtils.generateUserKey(formData.authorName || formData.userName);
        const storyKey = KeyUtils.generateStoryKey(userKey, formData.storyTitle);

        return {
            key: storyKey,
            ...formData,
            relatedForce: formData.relatedForce || this.contextData.forceKey || '',
            relatedCrusade: formData.relatedCrusade || this.contextData.crusadeKey || '',
            tags: formData.tags || ''
        };
    }
}

// Global functions for backward compatibility
function resetForm() {
    if (window.storyForm) {
        window.storyForm.reset();
    }
}

function hideMessages() {
    FormUtilities.hideAllMessages();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.storyForm = new StoryForm();
});