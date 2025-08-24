// filename: app.js
// Application initialization and configuration
// 40k Crusade Campaign Tracker - Updated to use centralized config

// Initialize sheets when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for config to be available
    if (typeof CrusadeConfig === 'undefined') {
        console.error('CrusadeConfig not loaded! Make sure config.js is included before app.js');
        return;
    }
    
    // Debug the config to see what's missing
    console.log('CrusadeConfig available:', !!CrusadeConfig);
    console.log('CrusadeConfig.cache:', CrusadeConfig.app.cache);
    
    console.log('40k Crusade Campaign Tracker - Initializing...');
    
    try {
        // Initialize Crusades sheet
        const crusadesUrl = CrusadeConfig.getSheetUrl('crusades');
        if (crusadesUrl) {
            SheetsManager.embed('crusades-sheet', 
                crusadesUrl, 
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    linkColumn: 1,          // Crusade Name column
                    linkPattern: CrusadeConfig.routes.crusadeDetailsPattern.replace('{crusade}', '{slug}'),
                    cacheMinutes: CrusadeConfig.getCacheConfig('default'),
                    hideColumns: [],
                    dateColumns: [3, 4]     // Start Date and End Date columns
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
            SheetsManager.embed('crusade-forces-sheet', 
                forcesUrl, 
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    linkColumn: 1,          // Force Name column
                    linkPattern: CrusadeConfig.routes.forceDetailsPattern.replace('{force}', '{slug}'),
                    cacheMinutes: CrusadeConfig.getCacheConfig('default'),
                    hideColumns: [5]        // Hide timestamp column
                }
            );
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