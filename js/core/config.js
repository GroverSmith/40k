// filename: config.js
// Centralized Configuration for 40k Crusade Campaign Tracker
// Updated with composite key definitions

const CrusadeConfig = {
    // Application Configuration
    app: {
        name: '40k Crusade Campaign Tracker',
        version: '2.0.0', // Bumped for key system implementation
        
        // Cache settings
        cache: {
            defaultMinutes: 1440, // 24 hours
            forcePageMinutes: 60,  // 1 hour for force pages
            armyListMinutes: 30    // 30 minutes for army lists
        },
        
        // Form validation settings
        validation: {
            armyList: {
                maxCharacters: 50000,
                minCharacters: 50,
                maxPointsValue: 5000
            },
            userName: {
                minLength: 2,
                maxLength: 100
            },
            forceName: {
                minLength: 3,
                maxLength: 100
            }
        },
        
        // UI Settings
        ui: {
            maxRowsPerPage: 50,
            defaultMaxHeight: '400px',
            animationDuration: 300
        }
    },
    
    // URL Patterns and Routes
    routes: {
        // Main pages
        home: 'index.html',
        forceDetails: 'forces/force-details.html',
        crusadeDetails: 'crusades/crusade-details.html',
        addArmyList: 'armies/add-army-list.html',
        
        // Dynamic patterns - now using keys instead of names
        forceDetailsPattern: 'forces/force-details.html?key={key}',
        crusadeDetailsPattern: 'crusades/crusade-details.html?key={key}',
        armyListViewPattern: 'armies/view-army-list.html?key={key}',
        
        // External links
        addForceForm: 'forces/add-force.html'
    },
    
    // 40k Game Data
    gameData: {
        factions: [
            'Adepta Sororitas',
            'Adeptus Custodes',
            'Adeptus Mechanicus',
            'Aeldari',
            'Agents of the Imperium',
            'Astra Militarum',
            'Blood Angels',
            'Chaos Daemons',
            'Chaos Knights',
            'Chaos Space Marines',
            'Dark Angels',
            'Death Guard',
            'Drukhari',
            'Genestealer Cults',
            'Grey Knights',
            'Imperial Knights',
            'Leagues of Votann',
            'Necrons',
            'Orks',
            'Space Marines',
            'Space Wolves',
            'T\'au Empire',
            'Thousand Sons',
            'Tyranids',
            'World Eaters'
        ],
        
        
        
        mfmVersions: [
            '3.2 (Aug 25)',
            '2.7 (Jun 25)'            
        ],
		
		storyTypes: [
            'Battle Report',
            'Character Story',
            'Campaign Narrative',
            'Force Background',
            'Unit History',
            'Victory Celebration',
            'Defeat Analysis',
            'Strategic Planning',
            'Personal Log',
            'Propaganda',
            'Historical Event',            
            'Other'
        ]
    },
    
    // Environment Detection
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    },
    
    // Helper Methods
    getSheetUrl(sheetName) {
        const sheet = window.TableDefs[sheetName];
        if (!sheet || !sheet.url) {
            console.warn(`Sheet configuration not found or URL missing for: ${sheetName}`);
            return null;
        }
        return sheet.url;
    },
    
    // Updated URL builders to use keys
    buildForceUrl(forceKey, basePath = '') {
        const encodedKey = encodeURIComponent(forceKey);
        if (basePath) {
            return `${basePath}${this.routes.forceDetailsPattern.replace('{key}', encodedKey)}`;
        }
        return this.routes.forceDetailsPattern.replace('{key}', encodedKey);
    },
    
    buildCrusadeUrl(crusadeKey, basePath = '') {
        const encodedKey = encodeURIComponent(crusadeKey);
        if (basePath) {
            return `${basePath}${this.routes.crusadeDetailsPattern.replace('{key}', encodedKey)}`;
        }
        return this.routes.crusadeDetailsPattern.replace('{key}', encodedKey);
    },
    
    buildArmyListUrl(armyListKey, basePath = '') {
        const encodedKey = encodeURIComponent(armyListKey);
        if (basePath) {
            return `${basePath}${this.routes.armyListViewPattern.replace('{key}', encodedKey)}`;
        }
        return this.routes.armyListViewPattern.replace('{key}', encodedKey);
    },
    
    // Build URLs from different directories
    buildForceUrlFromRoot(forceKey) {
        return this.buildForceUrl(forceKey, '');
    },
    
    buildForceUrlFromSubdir(forceKey) {
        return this.buildForceUrl(forceKey, '../');
    },
    
    buildCrusadeUrlFromRoot(crusadeKey) {
        return this.buildCrusadeUrl(crusadeKey, '');
    },
    
    buildCrusadeUrlFromSubdir(crusadeKey) {
        return this.buildCrusadeUrl(crusadeKey, '../');
    },
    
    // Debug method
    debugConfig() {
        console.log('CrusadeConfig debug:');
        console.log('- Version:', this.app.version);
        console.log('- Sheets:', window.TableDefs);
        console.log('- Routes:', this.routes);
        console.log('- TableDefs available:', !!window.TableDefs);
    },
    
    // Get configuration for specific use cases
    getFormConfig() {
        return {
            maxCharacters: this.app.validation.armyList.maxCharacters,
            minCharacters: this.app.validation.armyList.minCharacters,
            factions: this.gameData.factions,
            detachments: this.gameData.detachmentTypes,
            mfmVersions: this.gameData.mfmVersions
        };
    },
    
    getCacheConfig(type = 'default') {
        if (!this.app.cache) {
            console.warn('Cache configuration not found, using default value');
            return 1440;
        }
        
        let cacheKey;
        switch(type) {
            case 'forcePage':
                cacheKey = 'forcePageMinutes';
                break;
            case 'armyList':
                cacheKey = 'armyListMinutes';
                break;
            case 'default':
            default:
                cacheKey = 'defaultMinutes';
                break;
        }
        
        return this.app.cache[cacheKey] || 1440;
    }
};

// Make it globally available
window.CrusadeConfig = CrusadeConfig;

// Export for use in modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrusadeConfig;
}

console.log('CrusadeConfig loaded:', CrusadeConfig.app.name, 'v' + CrusadeConfig.app.version);
console.log('Key system initialized for relational data management');