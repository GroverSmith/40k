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
        // Initialize Crusades sheet with custom column display
        const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
        if (crusadesUrl) {
            SheetsManager.embed('crusades-sheet',
                crusadesUrl,
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    linkColumn: 2,          // Display the Crusade Name column (index 2) as link
                    linkDataColumn: 0,      // Use the Key column (index 0) for link value
                    linkPattern: 'crusades/crusade-details.html?key={slug}',
                    cacheMinutes: CrusadeConfig.getCacheConfig('default'),
                    hideColumns: [0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                    dateColumns: [4, 5],     // Start Date and End Date columns
                    columnNames: {
                        1: 'State',
                        2: 'Name',
                        3: 'Type',
                        4: 'Start',
                        5: 'End'
                    }
                }
            );
        } else {
            console.warn('Crusades sheet URL not configured');
            CoreUtils.dom.setLoading('crusades-sheet', '📜 Crusade campaigns will be displayed here.');
        }

        // Initialize Forces sheet
        const forcesUrl = CrusadeConfig.getSheetUrl('forces');
        if (forcesUrl) {
            const forcesEmbed = SheetsManager.embed('crusade-forces-sheet',
                forcesUrl,
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    linkColumn: 2,
                    linkDataColumn: 0,
                    linkPattern: 'forces/force-details.html?key={slug}',
                    cacheMinutes: CrusadeConfig.getCacheConfig('default'),
                    hideColumns: [0, 6],
                    columnNames: {
                        1: 'User Name',
                        2: 'Force Name',
                        3: 'Faction',
                        4: 'Detachment',
                        5: 'Notes'
                    }
                }
            );

            // Cache data globally for other pages
            const originalLoadData = forcesEmbed.loadData.bind(forcesEmbed);
            forcesEmbed.loadData = async function() {
                await originalLoadData();

                if (this.rawData) {
                    try {
                        CoreUtils.storage.set('forces_cache_global', {
                            data: this.rawData,
                            timestamp: Date.now()
                        });
                        console.log('Forces data cached globally for other pages');
                    } catch (e) {
                        console.warn('Error setting global forces cache:', e);
                    }
                }
            };
        }

        // Initialize Stories sheet
        const storiesUrl = CrusadeConfig.getSheetUrl('stories');
        if (storiesUrl) {
            SheetsManager.embed('stories-sheet',
                storiesUrl,
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    linkColumn: 6,
                    linkDataColumn: 0,
                    linkPattern: 'stories/view-story.html?key={slug}',
                    cacheMinutes: CrusadeConfig.getCacheConfig('default'),
                    hideColumns: [0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                    dateColumns: [1],
                    columnNames: {
                        1: 'Date',
                        2: 'Author',
                        5: 'Type',
                        6: 'Title'
                    },
                    maxRows: 10
                }
            );
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
        SheetsManager.refreshAll();
    },

    // Clear all application caches
    clearAllCaches() {
        console.log('Clearing all application caches...');
        SheetsManager.clearAllCaches();
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