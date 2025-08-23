// Application initialization and configuration
// 40k Crusade Campaign Tracker

// Initialize sheets when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('40k Crusade Campaign Tracker - Initializing...');
    
    // Initialize Crusades sheet
    SheetsManager.embed('crusades-sheet', 
        'https://script.google.com/macros/s/AKfycbyYInudtrcqZvk4BYepzUxEGSLRPkIUuQknOtUOL-I0Rl4LVDGqyD0QMso3ds_Cu_BqZw/exec', 
        {
            maxHeight: '350px',
            showStats: true,
            sortable: true,
            linkColumn: 1,
            linkPattern: 'crusades/{slug}.html',
            cacheMinutes: 1440,     // Cache for 24 hours
            hideColumns: [],
            dateColumns: [3, 4]     // Columns 3 and 4 contain dates
        }
    );
    
    // Initialize Crusade Forces sheet with form integration - Updated to use query parameter
    SheetsManager.embed('crusade-forces-sheet', 
        'https://script.google.com/macros/s/AKfycbw81ZEFEAzOrfvOxWBHHT17kGqLrk3g-VpXuDeUbK_8YehP1dNe8FEUMf6PuDzZ4JnH/exec', 
        {
            maxHeight: '350px',
            showStats: true,
            sortable: true,
            linkColumn: 2,          // Force Name column (after hiding timestamp)
            linkPattern: 'forces/force-details.html?force={slug}',  // Updated filename
            cacheMinutes: 1440,     // Cache for 24 hours
            hideColumns: [0]        // Hide timestamp column
        }
    );
    
    console.log('Sheets initialized successfully');
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
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    },
    
    // Get application version (could be useful for cache busting)
    getVersion() {
        return '1.0.0';
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
        const encodedName = encodeURIComponent(forceName);
        window.location.href = `forces/?force=${encodedName}`;
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

// Log initialization complete
console.log('40k Crusade Campaign Tracker v' + CrusadeApp.getVersion() + ' initialized');
console.log('Development mode:', CrusadeApp.isDevelopment());