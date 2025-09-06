// filename: app.js
// Application initialization and configuration
// 40k Crusade Campaign Tracker
// REFACTORED: Using CoreUtils for common utilities

// Initialize sheets when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check for success notifications from other pages
    CrusadeApp.checkForSuccessNotifications();

    // Wait for config to be available
    if (typeof CrusadeConfig === 'undefined') {
        console.error('CrusadeConfig not loaded! Make sure config.js is included before app.js');
        return;
    }

    // Debug the config to see what's available
    console.log('CrusadeConfig available:', !!CrusadeConfig);
    console.log('CrusadeConfig.cache:', CrusadeConfig.app.cache);

    console.log('40k Crusade Campaign Tracker - Initializing...');

    try {
        // Initialize Crusades display using CrusadeTable
        const crusadesContainer = document.getElementById('crusades-sheet');
        if (crusadesContainer) {
            // Use CrusadeTable for consistent crusade display
            if (window.CrusadeTable) {
                CrusadeTable.displayCrusades('crusades-sheet', {
                    sortable: true
                });
            } else {
                // Fallback if CrusadeTable not loaded yet
                setTimeout(() => {
                    if (window.CrusadeTable) {
                        CrusadeTable.displayCrusades('crusades-sheet', {
                            sortable: true
                        });
                    } else {
                        console.warn('CrusadeTable module not available');
                        crusadesContainer.innerHTML = '<p class="no-data">📜 Crusade campaigns will be displayed here.</p>';
                    }
                }, 100);
            }
        }

        // Initialize Forces display using ForceTable
        const forcesContainer = document.getElementById('crusade-forces-sheet');
        if (forcesContainer) {
            // Use ForceTable for consistent force display
            if (window.ForceTable) {
                ForceTable.displayForces('crusade-forces-sheet', {
                    columns: ['force', 'commander', 'faction', 'detachment', 'joined'],
                    sortable: true
                });
            } else {
                // Fallback if ForceTable not loaded yet
                setTimeout(() => {
                    if (window.ForceTable) {
                        ForceTable.displayForces('crusade-forces-sheet', {
                            columns: ['force', 'commander', 'faction', 'detachment', 'joined'],
                            sortable: true
                        });
                    } else {
                        console.warn('ForceTable module not available');
                        forcesContainer.innerHTML = '<p class="no-data">⚔️ Crusade forces will be displayed here.</p>';
                    }
                }, 100);
            }
        }

        // Initialize Stories display using StoryTable
        const storiesContainer = document.getElementById('stories-sheet');
        if (storiesContainer) {
            // Use StoryTable for consistent story display
            if (window.StoryTable) {
                StoryTable.loadStories('recent', null, storiesContainer);
            } else {
                // Fallback if StoryTable not loaded yet
                setTimeout(() => {
                    if (window.StoryTable) {
                        StoryTable.loadStories('recent', null, storiesContainer);
                    } else {
                        console.warn('StoryTable module not available');
                        storiesContainer.innerHTML = '<p class="no-data">📚 Stories will be displayed here.</p>';
                    }
                }, 100);
            }
        }
        console.log('Sheets initialized successfully');

    } catch (error) {
        console.error('Error initializing sheets:', error);

        if (CrusadeConfig && CrusadeConfig.debugConfig) {
            CrusadeConfig.debugConfig();
        }
    }
});

// Application-specific utility functions
const CrusadeApp = {
    // Check for success notifications from other pages
    checkForSuccessNotifications() {
        // Check for force creation success
        const forceCreated = CoreUtils.storage.getSession('force_created');
        if (forceCreated) {
            // Only show if created within last 10 seconds
            if (Date.now() - forceCreated.timestamp < 10000) {
                CoreUtils.notifications.success(`Force "${forceCreated.forceName}" created successfully!`);
            }
            // Clear it so it doesn't show again
            sessionStorage.removeItem('force_created');
        }

        // Check for user creation success
        const userCreated = CoreUtils.storage.getSession('user_created');
        if (userCreated) {
            if (Date.now() - userCreated.timestamp < 10000) {
                CoreUtils.notifications.success(`User "${userCreated.userName}" created and selected!`);
            }
            sessionStorage.removeItem('user_created');
        }
    },

    // Initialize error handling for the application
    initErrorHandling() {
        window.addEventListener('error', function(event) {
            console.error('Application error:', event.error);
            // Could send to analytics or error reporting service
        });

        window.addEventListener('unhandledrejection', function(event) {
            console.error('Unhandled promise rejection:', event.reason);
            event.preventDefault();
        });
    },

    // Check if the application is running in development mode
    isDevelopment() {
        return CrusadeConfig ? CrusadeConfig.isDevelopment() : false;
    },

    // Get application version
    getVersion() {
        return CrusadeConfig ? CrusadeConfig.app.version : '1.0.0';
    },

    // Refresh all data in the application
    refreshAllData() {
        console.log('Refreshing all application data...');
        // Force refresh by clearing caches and reloading page
        this.clearAllCaches();
        location.reload();
    },

    // Clear all application caches
    clearAllCaches() {
        console.log('Clearing all application caches...');
        CacheManager.clearAll();
    },

    // Navigate to a specific crusade force page
    viewForce(forceName) {
        if (CrusadeConfig) {
            window.location.href = CrusadeConfig.buildForceUrl(forceName);
        } else {
            // Fallback if config not loaded
            const encodedName = encodeURIComponent(forceName);
            window.location.href = `forces/force-details.html?force=${encodedName}`;
        }
    },

    // Navigate to a specific crusade page
    viewCrusade(crusadeName) {
        if (CrusadeConfig) {
            window.location.href = CrusadeConfig.buildCrusadeUrl(crusadeName);
        } else {
            // Fallback if config not loaded
            const encodedName = encodeURIComponent(crusadeName);
            window.location.href = `crusades/crusade-details.html?crusade=${encodedName}`;
        }
    }
};

// Initialize error handling
CrusadeApp.initErrorHandling();

// Make CrusadeApp globally available for debugging
window.CrusadeApp = CrusadeApp;

// Log initialization complete (wait for config to be ready)
if (typeof CrusadeConfig !== 'undefined') {
    console.log(CrusadeConfig.app.name + ' v' + CrusadeApp.getVersion() + ' initialized');
    console.log('Development mode:', CrusadeApp.isDevelopment());
} else {
    console.warn('CrusadeConfig not available during app initialization');
}