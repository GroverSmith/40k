// filename: app.js
// Application initialization and configuration
// 40k Crusade Campaign Tracker - Updated to use centralized config and linkDataColumn

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
                

		// Initialize Forces sheet without add button (it's now in the section header)
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
			
			// Cache data globally for other pages
			const originalLoadData = forcesEmbed.loadData.bind(forcesEmbed);
			forcesEmbed.loadData = async function() {
				await originalLoadData();
				
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
		}

		// Initialize Stories sheet without button (it's now in the section header)
		const storiesUrl = CrusadeConfig.getSheetUrl('stories');
		if (storiesUrl) {
			SheetsManager.embed('stories-sheet', 
				storiesUrl, 
				{
					maxHeight: '350px',
					showStats: true,
					sortable: true,
					linkColumn: 6,          // Display the Title column (index 6) as link
					linkDataColumn: 0,      // Use the Key column (index 0) for link value
					linkPattern: 'stories/view-story.html?key={slug}',
					cacheMinutes: CrusadeConfig.getCacheConfig('default'),
					hideColumns: [0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // Hide technical columns
					dateColumns: [1],       // Timestamp column
					columnNames: {          // Custom column names for display
						1: 'Date',
						2: 'Author',
						5: 'Type',
						6: 'Title'
					},
					maxRows: 10            // Show only recent 10 stories
				}
			);
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
    // Check for success notifications from other pages
    checkForSuccessNotifications() {
        // Check for force creation success
        const forceCreated = sessionStorage.getItem('force_created');
        if (forceCreated) {
            try {
                const data = JSON.parse(forceCreated);
                // Only show if created within last 10 seconds
                if (Date.now() - data.timestamp < 10000) {
                    this.showNotification(`Force "${data.forceName}" created successfully!`, 'success');
                }
            } catch (e) {
                console.error('Error parsing force creation data:', e);
            }
            // Clear it so it doesn't show again
            sessionStorage.removeItem('force_created');
        }
        
        // Check for other success notifications (future expansion)
        const userCreated = sessionStorage.getItem('user_created');
        if (userCreated) {
            try {
                const data = JSON.parse(userCreated);
                if (Date.now() - data.timestamp < 10000) {
                    this.showNotification(`User "${data.userName}" created and selected!`, 'success');
                }
            } catch (e) {
                console.error('Error parsing user creation data:', e);
            }
            sessionStorage.removeItem('user_created');
        }
    },
    
    // Show notification banner
    showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existing = document.querySelector('.app-notification');
        if (existing) {
            existing.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `app-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #1e4a3a 0%, #2c5f4f 100%)' : '#2a2a2a'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            max-width: 400px;
            border-left: 4px solid ${type === 'success' ? '#4ecdc4' : '#ffa500'};
            animation: slideInRight 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        // Add icon
        const icon = document.createElement('span');
        icon.style.fontSize = '20px';
        icon.textContent = type === 'success' ? '✅' : 'ℹ️';
        notification.appendChild(icon);
        
        // Add message
        const messageEl = document.createElement('span');
        messageEl.textContent = message;
        notification.appendChild(messageEl);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            margin-left: 15px;
            opacity: 0.8;
            transition: opacity 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';
        closeBtn.onclick = () => notification.remove();
        notification.appendChild(closeBtn);
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
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