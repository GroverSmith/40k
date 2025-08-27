// filename: app.js
// Application initialization and configuration
// 40k Crusade Campaign Tracker - Updated to use centralized config and linkDataColumn

// Initialize sheets when the page loads
document.addEventListener('DOMContentLoaded', function() {
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
                    hideColumns: [0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // Hide Key column (0) and columns 6+
                    dateColumns: [4, 5],     // Start Date and End Date columns (now indices 4 and 5)
                    columnNames: {           // Custom column display names matching new indices
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
            // Show placeholder content
            document.getElementById('crusades-sheet').innerHTML = `
                <div class="no-data-message">
                    <p>📜 Crusade campaigns will be displayed here.</p>
                    <p><em>Configure crusades URL in CrusadeConfig to enable this feature.</em></p>
                </div>
            `;
        }
		
		// Initialize Forces sheet with form integration
        const forcesUrl = CrusadeConfig.getSheetUrl('forces');
        if (forcesUrl) {
            const forcesEmbed = SheetsManager.embed('crusade-forces-sheet', 
                forcesUrl, 
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    linkColumn: 2,          // Display the Force Name column (index 2) as link
                    linkDataColumn: 0,      // Use the Key column (index 0) for link value
                    linkPattern: 'forces/force-details.html?key={slug}',
                    cacheMinutes: CrusadeConfig.getCacheConfig('default'),
                    hideColumns: [0, 6],    // Hide Key column (0) and Timestamp column (6)
                    columnNames: {          // Custom column names for clarity
                        1: 'User Name',
                        2: 'Force Name',
                        3: 'Faction',
                        4: 'Detachment',
                        5: 'Notes'
                    }
                }
            );
            
            // After loading, also cache the data globally for other pages to use
            const originalLoadData = forcesEmbed.loadData.bind(forcesEmbed);
            forcesEmbed.loadData = async function() {
                await originalLoadData();
                
                // Cache the raw data globally for the register force modal
                if (this.rawData) {
                    try {
                        localStorage.setItem('forces_cache_global', JSON.stringify({
                            data: this.rawData,
                            timestamp: Date.now()
                        }));
                        console.log('Forces data cached globally for other pages');
                    } catch (e) {
                        console.warn('Error setting global forces cache:', e);
                    }
                }
            };
        } else {
            console.warn('Forces sheet URL not configured');
            // Show placeholder content
            document.getElementById('crusade-forces-sheet').innerHTML = `
                <div class="no-data-message">
                    <p>⚔️ Crusade forces will be displayed here.</p>
                    <p><em>Configure forces URL in CrusadeConfig to enable this feature.</em></p>
                </div>
            `;
        }
        
        console.log('Sheets initialized successfully');
        
    } catch (error) {
        console.error('Error initializing sheets:', error);
        
        // Try to provide more debugging info
        if (CrusadeConfig && CrusadeConfig.debugConfig) {
            CrusadeConfig.debugConfig();
        }
    }
});

// Application-specific utility functions
const CrusadeApp = {
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
    },
    
    // Create URL-friendly slug from text
    createSlug(text) {
        return String(text)
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
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