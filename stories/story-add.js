// filename: stories/story-add.js
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

        // Setup character counters for each story text field
        this.setupStoryCharacterCounters();

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
            userName: urlParams.get('userName') || UserManager.getCurrentUser()?.name || ''
        };

        // Pre-fill related fields if context provided
        if (this.contextData.forceKey) {
            const forceField = document.getElementById('force-select');  // Changed from 'related-force'
            if (forceField) forceField.value = this.contextData.forceKey;
        }

        if (this.contextData.crusadeKey) {
            const crusadeField = document.getElementById('crusade-select');  // Changed from 'related-crusade'
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
        const forceSelect = document.getElementById('force-select');  // Changed from 'related-force'
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
        const crusadeSelect = document.getElementById('crusade-select');  // Changed from 'related-crusade'
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
        const userKey = KeyUtils.generateUserKey(formData.userName || 'Unknown');
        const storyKey = KeyUtils.generateStoryKey(userKey, formData.title || 'Untitled');

        return {
            key: storyKey,
            userKey: userKey,
            ...formData,
            storyText1: document.getElementById('story-text-1')?.value || '',
            storyText2: document.getElementById('story-text-2')?.value || '',
            storyText3: document.getElementById('story-text-3')?.value || '',
            forceKey: document.getElementById('force-select')?.value || '',
            crusadeKey: document.getElementById('crusade-select')?.value || '',
            storyType: document.getElementById('story-type')?.value || '',
            title: document.getElementById('title')?.value || '',
            imperialDate: document.getElementById('imperial-date')?.value || '',
            image1: document.getElementById('image-1')?.value || '',
            image2: document.getElementById('image-2')?.value || '',
            image3: document.getElementById('image-3')?.value || '',
            audioLink: document.getElementById('audio-link')?.value || '',
            textLink: document.getElementById('text-link')?.value || ''
        };
    }

    setupStoryCharacterCounters() {
        // Story Text 1
        const textarea1 = document.getElementById('story-text-1');
        const counter1 = document.getElementById('count-1');
        if (textarea1 && counter1) {
            const updateCount1 = () => {
                const length = textarea1.value.length;
                counter1.textContent = `${length.toLocaleString()} / 10,000 characters`;

                // Update color based on length
                if (length > 10000) {
                    counter1.style.color = 'var(--color-error, #ff6b6b)';
                } else if (length < 100) {
                    counter1.style.color = 'var(--color-warning, #ffa500)';
                } else {
                    counter1.style.color = 'var(--color-success, #4ecdc4)';
                }
            };

            textarea1.addEventListener('input', updateCount1);
            textarea1.addEventListener('paste', () => setTimeout(updateCount1, 10));
            updateCount1(); // Initial count
        }

        // Story Text 2
        const textarea2 = document.getElementById('story-text-2');
        const counter2 = document.getElementById('count-2');
        if (textarea2 && counter2) {
            const updateCount2 = () => {
                const length = textarea2.value.length;
                counter2.textContent = `${length.toLocaleString()} / 10,000 characters`;

                if (length > 10000) {
                    counter2.style.color = 'var(--color-error, #ff6b6b)';
                } else {
                    counter2.style.color = 'var(--color-secondary, #999)';
                }
            };

            textarea2.addEventListener('input', updateCount2);
            textarea2.addEventListener('paste', () => setTimeout(updateCount2, 10));
            updateCount2();
        }

        // Story Text 3
        const textarea3 = document.getElementById('story-text-3');
        const counter3 = document.getElementById('count-3');
        if (textarea3 && counter3) {
            const updateCount3 = () => {
                const length = textarea3.value.length;
                counter3.textContent = `${length.toLocaleString()} / 10,000 characters`;

                if (length > 10000) {
                    counter3.style.color = 'var(--color-error, #ff6b6b)';
                } else {
                    counter3.style.color = 'var(--color-secondary, #999)';
                }
            };

            textarea3.addEventListener('input', updateCount3);
            textarea3.addEventListener('paste', () => setTimeout(updateCount3, 10));
            updateCount3();
        }
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