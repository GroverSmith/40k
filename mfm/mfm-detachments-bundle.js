// MFM Detachments Data Bundle - All Versions
// This file manages all MFM detachments versions for the force and army modules

window.MFM_DETACHMENTS_BUNDLE = {
    versions: {
        "3.2": {
            metadata: {
                version: "3.2",
                date: "Aug25",
                displayName: "MFM 3.2 (Aug 2025)"
            },
            data: null // Will be loaded from embedded data
        },
        "3.3": {
            metadata: {
                version: "3.3", 
                date: "Sep25",
                displayName: "MFM 3.3 (Sep 2025)"
            },
            data: null // Will be loaded from embedded data
        }
    },
    
    // Load a specific version from embedded data
    async loadVersion(version) {
        if (this.versions[version] && this.versions[version].data) {
            return this.versions[version].data;
        }
        
        try {
            // Get data from embedded JavaScript files
            const dataKey = `MFM_DETACHMENTS_${version.replace('.', '_')}`;
            const data = window[dataKey];
            
            if (!data) {
                throw new Error(`MFM detachments version ${version} data not found. Make sure mfm-detachments-${version.replace('.', '_')}.js is loaded.`);
            }
            
            this.versions[version].data = data;
            return data;
        } catch (error) {
            console.error(`Error loading MFM detachments version ${version}:`, error);
            throw error;
        }
    },
    
    // Get available versions
    getAvailableVersions() {
        return Object.keys(this.versions).map(version => ({
            value: version,
            displayName: this.versions[version].metadata.displayName
        }));
    },
    
    // Get current loaded data (for backward compatibility)
    getCurrentData() {
        return window.EMBEDDED_MFM_DETACHMENTS_DATA;
    }
};

// For backward compatibility, set the default loaded data
window.EMBEDDED_MFM_DETACHMENTS_DATA = null;
