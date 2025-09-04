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

        // Pre-fill user name if available
        const userNameField = document.getElementById('user-name');
        if (userNameField && this.contextData.userName) {
            userNameField.value = this.contextData.userName;
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

    setupStoryCharacterCounters() {
        // Story Text 1
        const textarea1 = document.getElementById('story-text-1');
        const counter1 = document.getElementById('count-1');
        if (textarea1 && counter1) {
            const updateCount1 = () => {
                const length = textarea1.value.length;
                counter1.textContent = `${length.toLocaleString()} / 10,000 characters`;

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
            updateCount1();
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

    async setupRelatedEntities() {
        // Load forces for dropdown (now with multi-select)
        const forceSelect = document.getElementById('force-select');
        if (forceSelect) {
            // Enable multi-select
            forceSelect.setAttribute('multiple', 'multiple');
            forceSelect.setAttribute('size', '5');
            forceSelect.classList.add('multi-select');

            try {
                const forcesUrl = CrusadeConfig.getSheetUrl('forces');
                const forces = await CacheManager.fetchWithCache(forcesUrl, 'forces');

                forceSelect.innerHTML = '';

                forces.slice(1).forEach(row => {
                    if (row[0] && row[2]) { // Key and Force Name
                        const option = document.createElement('option');
                        option.value = row[0];
                        option.textContent = `${row[2]} (${row[1]})`; // Force Name (User)
                        forceSelect.appendChild(option);
                    }
                });

                // Pre-select if context provided
                if (this.contextData.forceKey) {
                    const options = forceSelect.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value === this.contextData.forceKey) {
                            options[i].selected = true;
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading forces:', error);
            }
        }

        // Load crusades for dropdown
        const crusadeSelect = document.getElementById('crusade-select');
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
        if (field.id === 'title' && value) {
            if (value.length < 3) {
                return {
                    isValid: false,
                    errorMessage: 'Title must be at least 3 characters.'
                };
            }
            if (value.length > 200) {
                return {
                    isValid: false,
                    errorMessage: 'Title must be no more than 200 characters.'
                };
            }
        }

        // Validate at least one story text field has content
        if (field.id === 'story-text-1') {
            const text1 = document.getElementById('story-text-1')?.value || '';
            const text2 = document.getElementById('story-text-2')?.value || '';
            const text3 = document.getElementById('story-text-3')?.value || '';
            const totalText = text1 + text2 + text3;

            if (totalText.length < 100) {
                return {
                    isValid: false,
                    errorMessage: 'Story must be at least 100 characters total.'
                };
            }
        }

        return { isValid: true };
    }

    /**
     * Override handleSubmit to add junction table creation
     */
    async handleSubmit(event) {
        event.preventDefault();

        if (this.isSubmitting) {
            console.log('Already submitting, please wait');
            return;
        }

        this.setLoadingState(true);

        try {
            // Validate form
            if (this.config.validateOnSubmit && !this.validateForm()) {
                throw new Error('Please fix the form errors and try again.');
            }

            // Gather form data
            const formData = this.gatherFormData();

            // Submit main story to Google Sheets
            const response = await this.submitToGoogleSheets(formData);

            // Create junction table relationships if we have multiple forces
            if (response && response.key && formData.selectedForces && formData.selectedForces.length > 0) {
                await this.createStoryForceRelationships(response.key, formData.selectedForces);
            }

            // Clear specified caches
            this.clearCachesOnSuccess();

            // Show success
            this.showSuccess();

            // Handle redirect or reset
            if (this.config.redirectUrl) {
                setTimeout(() => {
                    window.location.href = this.config.redirectUrl;
                }, this.config.redirectDelay);
            } else {
                this.form.style.display = 'none';
            }

        } catch (error) {
            console.error('Form submission error:', error);
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Create story-force relationships in junction table
     */
    async createStoryForceRelationships(storyKey, forceKeys) {
        const junctionUrl = CrusadeConfig.getSheetUrl('storyForces');
        if (!junctionUrl) {
            console.warn('Story-Forces junction table URL not configured');
            return;
        }

        try {
            const response = await fetch(junctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    storyKey: storyKey,
                    forceKeys: forceKeys.join(',')
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('Created story-force relationships:', result.count);
            }
        } catch (error) {
            console.error('Error creating story-force relationships:', error);
            // Don't throw - this is a non-critical enhancement
        }
    }

    gatherFormData() {
        const formData = super.gatherFormData();

        // Get selected forces (multiple)
        const forceSelect = document.getElementById('force-select');
        const selectedForces = [];
        if (forceSelect) {
            for (let option of forceSelect.selectedOptions) {
                selectedForces.push(option.value);
            }
        }

        // Get user name from field or context
        const userName = document.getElementById('user-name')?.value ||
                        this.contextData.userName ||
                        formData.userName ||
                        'Unknown';

        // Generate keys
        const userKey = KeyUtils.generateUserKey(userName);
        const storyKey = KeyUtils.generateStoryKey(userKey, formData.title || 'Untitled');

        return {
            key: storyKey,
            userKey: userKey,
            userName: userName,
            // For backward compatibility, store first force in main table
            forceKey: selectedForces[0] || this.contextData.forceKey || '',
            // Store array of selected forces for junction table
            selectedForces: selectedForces,
            // Crusade key
            crusadeKey: document.getElementById('crusade-select')?.value || this.contextData.crusadeKey || '',
            // Story content fields
            storyText1: document.getElementById('story-text-1')?.value || '',
            storyText2: document.getElementById('story-text-2')?.value || '',
            storyText3: document.getElementById('story-text-3')?.value || '',
            // Other fields
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

    /**
     * Submit to Google Sheets (override to parse response properly)
     */
    async submitToGoogleSheets(data) {
        if (!this.config.submitUrl) {
            throw new Error('Submit URL not configured');
        }

        const response = await fetch(this.config.submitUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data).toString()
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || this.config.errorMessage);
        }

        return result;
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