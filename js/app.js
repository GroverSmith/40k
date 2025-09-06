// filename: app.js
// Application initialization and configuration
// 40k Crusade Campaign Tracker

// Initialize sheets when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check for success notifications from other pages
    CrusadeApp.checkForSuccessNotifications();
    
    console.log('40k Crusade Campaign Tracker - Initializing...');

    try {
        // Initialize Crusades display using CrusadeTable
        const crusadesContainer = document.getElementById('crusades-sheet');
        if (crusadesContainer) {
            // Wait for all dependencies to be ready
            CrusadeApp.initializeCrusadesTable(crusadesContainer);
        }

        // Initialize Forces display using ForceTable
        const forcesContainer = document.getElementById('crusade-forces-sheet');
        if (forcesContainer) {
            if (window.ForceTable) {
                ForceTable.loadAllForces('crusade-forces-sheet');
            } else {
                // Fallback if ForceTable not loaded yet
                setTimeout(() => {
                    if (window.ForceTable) {
                        ForceTable.loadAllForces('crusade-forces-sheet');
                    } else {
                        console.warn('ForceTable module not available');
                        forcesContainer.innerHTML = '<p class="no-data">⚔️ Crusade forces will be displayed here.</p>';
                    }
                }, 100);
            }
        }

        // Initialize Battles display using BattleTable
        const battlesContainer = document.getElementById('recent-battles-container');
        if (battlesContainer) {
            if (window.BattleTable) {
                BattleTable.loadRecentBattles();
            } else {
                // Fallback if BattleTable not loaded yet
                setTimeout(() => {
                    if (window.BattleTable) {
                        BattleTable.loadRecentBattles();
                    } else {
                        console.warn('BattleTable module not available');
                        battlesContainer.innerHTML = '<p class="no-data">⚔️ Recent battles will be displayed here.</p>';
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

    // Initialize crusades table with proper dependency checking
    async initializeCrusadesTable(container) {
        const maxRetries = 10;
        let retries = 0;
        
        const tryLoad = async () => {
            if (window.CrusadeTable && window.TableBase && window.CacheManager) {
                try {
                    console.log('All dependencies ready, loading crusades...');
                    await CrusadeTable.loadAllCrusades('crusades-sheet');
                } catch (error) {
                    console.error('Error loading crusades:', error);
                    container.innerHTML = '<p class="no-data">Failed to load crusades. Please try refreshing the page.</p>';
                }
            } else if (retries < maxRetries) {
                retries++;
                console.log(`Dependencies not ready, retrying... (${retries}/${maxRetries})`);
                setTimeout(tryLoad, 100);
            } else {
                console.warn('CrusadeTable dependencies not available after retries');
                container.innerHTML = '<p class="no-data">📜 Crusade campaigns will be displayed here.</p>';
            }
        };
        
        tryLoad();
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