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
    console.log('CrusadeConfig.cache:', CrusadeConfig.cache);
    
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
                    linkColumn: 1,
                    linkPattern: 'crusades/{slug}.html',
                    cacheMinutes: CrusadeConfig.getCacheConfig('default'),
                    hideColumns: [],
                    dateColumns: [3, 4]     // Columns 3 and 4 contain dates
                }
            );
        } else {
            console.warn('Crusades sheet URL not configured');
        }
        
        // Initialize Crusade Forces sheet with form integration
        const crusadeForcesUrl = CrusadeConfig.getSheetUrl('crusadeForces');
        if (crusadeForcesUrl) {
            SheetsManager.embed('crusade-forces-sheet', 
                crusadeForcesUrl, 
                {
                    maxHeight: '350px',
                    showStats: true,
                    sortable: true,
                    linkColumn: 2,          // Force Name column (after hiding timestamp)
                    linkPattern: CrusadeConfig.routes.forceDetailsPattern.replace('{force}', '{slug}'),
                    cacheMinutes: CrusadeConfig.getCacheConfig('default'),
                    hideColumns: [0]        // Hide timestamp column
                }
            );
        } else {
            console.warn('Crusade Forces sheet URL not configured');
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
        const slug = this.createSlug(crusadeName);
        window.location.href = `crusades/${slug}.html`;
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