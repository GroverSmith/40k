window.MFM_BASE = {
    "mfm-versions": {
        "3.2": {
            "version": "3.2",
            "date": "Aug 25"
        },
        "3.3": {
            "version": "3.3",
            "date": "Sep 25"            
        }      
    },
    factions: {
        "Adepta Sororitas": {
            "name": "Adepta Sororitas",
            "supergroup" : "Imperium",
        },
        "Adeptus Custodes": {
            "name": "Adeptus Custodes",
            "supergroup" : "Imperium",
        },
        "Adeptus Mechanicus": {
            "name": "Adeptus Mechanicus",
            "supergroup" : "Imperium",
        },
        "Adeptus Titanicus": {
            "name": "Adeptus Titanicus",
            "supergroup" : "Imperium",
            "allyTo" : "Imperium",
        },
        "Aeldari": {
            "name": "Aeldari",
            "supergroup" : "Xenos",
        },        
        "Astra Militarum": {
            "name": "Astra Militarum",
            "supergroup" : "Imperium",
        },
        "Black Templars": {
            "name": "Black Templars",
            "supergroup" : "Imperium",
        },
        "Blood Angels": {
            "name": "Blood Angels",
            "supergroup" : "Imperium",
        },
        "Chaos Daemons": {
            "name": "Chaos Daemons",
            "supergroup" : "Chaos",
            "allyTo" : "Chaos",
        },
        "Chaos Knights": {
            "name": "Chaos Knights",
            "supergroup" : "Chaos",
            "allyTo" : "Chaos",
        },
        "Chaos Space Marines": {
            "name": "Chaos Space Marines",
            "supergroup" : "Chaos",
        },
        "Dark Angels": {
            "name": "Dark Angels",
            "supergroup" : "Imperium",
        },
        "Death Guard": {
            "name": "Death Guard",
            "supergroup" : "Chaos",
        },
        "Deathwatch": {
            "name": "Deathwatch",
            "supergroup" : "Imperium",
        },
        "Drukhari": {
            "name": "Drukhari",
            "supergroup" : "Xenos",
        },
        "Emperor's Children": {
            "name": "Emperor's Children",
            "supergroup" : "Chaos",
        },
        "Genestealer Cults": {
            "name": "Genestealer Cults",
            "supergroup" : "Xenos",
        },
        "Grey Knights": {
            "name": "Grey Knights",
            "supergroup" : "Imperium",
        },
        "Imperial Agents": {
            "name": "Imperial Agents",
            "supergroup" : "Imperium",
        },
        "Imperial Agents (Allies)": {
            "name": "Imperial Agents (Allies)",
            "supergroup" : "Imperium",
            "allyTo" : "Imperium",
        },
        "Imperial Knights": {
            "name": "Imperial Knights",
            "supergroup" : "Imperium",
            "allyTo" : "Imperium",
        },
        "Leagues of Votann": {
            "name": "Leagues of Votann",
            "supergroup" : "Xenos",
        },
        "Necrons": {
            "name": "Necrons",
            "supergroup" : "Xenos",
        },
        "Orks": {
            "name": "Orks",
            "supergroup" : "Xenos", 
        },
        "Space Marines": {
            "name": "Space Marines",
            "supergroup" : "Imperium",
        },
        "Space Wolves": {
            "name": "Space Wolves",
            "supergroup" : "Imperium",
        },
        "T'au Empire": {
            "name": "T'au Empire",
            "supergroup" : "Xenos",
        },
        "Thousand Sons": {
            "name": "Thousand Sons",
            "supergroup" : "Chaos",
        },
        "Tyranids": {
            "name": "Tyranids",
            "supergroup" : "Xenos",
        },
        "World Eaters": {
            "name": "World Eaters",
            "supergroup" : "Chaos",
        },
    }
};

// Common MFM Version Selector Component
window.MFMVersionSelector = {
    /**
     * Generate HTML for MFM version selector
     * @param {string} containerId - ID of the container element
     * @param {boolean} required - Whether the field is required
     * @param {string} helpText - Custom help text
     * @returns {string} HTML string
     */
    generateHTML(containerId = 'mfm-version-container', required = false, helpText = 'Choose between official MFM data or custom entry') {
        const requiredMark = required ? ' <span class="required">*</span>' : '';
        return `
            <div class="form-group">
                <label>MFM Version${requiredMark}</label>
                <div class="mfm-version-container" id="${containerId}">
                    <div class="mfm-toggle-group">
                        <div class="mfm-toggle-option">
                            <input type="radio" id="mfm-preset-${containerId}" name="mfmMode-${containerId}" value="preset" checked>
                            <label for="mfm-preset-${containerId}">
                                <span class="toggle-label">MFM</span>
                            </label>
                        </div>
                        <div class="mfm-toggle-option">
                            <input type="radio" id="mfm-custom-${containerId}" name="mfmMode-${containerId}" value="custom">
                            <label for="mfm-custom-${containerId}">
                                <span class="toggle-label">Custom</span>
                            </label>
                        </div>
                    </div>
                    <div id="mfm-preset-container-${containerId}" class="mfm-input-container">
                        <select id="mfm-version-preset-${containerId}" name="mfmVersion">
                            <!-- Options will be populated dynamically -->
                        </select>
                    </div>
                    <div id="mfm-custom-container-${containerId}" class="mfm-input-container" style="display: none;">
                        <input type="text" id="mfm-version-custom-${containerId}" name="mfmVersionCustom" 
                               placeholder="e.g., 2025.08 or enter custom">
                    </div>
                </div>
                <small class="help-text">${helpText}</small>
            </div>
        `;
    },

    /**
     * Initialize the MFM version selector
     * @param {string} containerId - ID of the container element
     * @param {function} onVersionChange - Callback function when version changes
     */
    initialize(containerId = 'mfm-version-container', onVersionChange = null) {
        const presetRadio = document.getElementById(`mfm-preset-${containerId}`);
        const customRadio = document.getElementById(`mfm-custom-${containerId}`);
        const presetContainer = document.getElementById(`mfm-preset-container-${containerId}`);
        const customContainer = document.getElementById(`mfm-custom-container-${containerId}`);
        const versionSelect = document.getElementById(`mfm-version-preset-${containerId}`);
        const customInput = document.getElementById(`mfm-version-custom-${containerId}`);

        if (!presetRadio || !customRadio || !presetContainer || !customContainer || !versionSelect || !customInput) {
            console.warn('MFM version selector elements not found for container:', containerId);
            return;
        }

        // Setup version options
        this.populateVersionOptions(versionSelect);

        // Setup toggle functionality
        presetRadio.addEventListener('change', () => {
            if (presetRadio.checked) {
                CoreUtils.dom.show(presetContainer);
                CoreUtils.dom.hide(customContainer);
                if (onVersionChange) onVersionChange(this.getSelectedVersion(containerId));
            }
        });

        customRadio.addEventListener('change', () => {
            if (customRadio.checked) {
                CoreUtils.dom.hide(presetContainer);
                CoreUtils.dom.show(customContainer);
                if (onVersionChange) onVersionChange(this.getSelectedVersion(containerId));
            }
        });

        // Setup version change listeners
        versionSelect.addEventListener('change', () => {
            if (onVersionChange) onVersionChange(this.getSelectedVersion(containerId));
        });

        customInput.addEventListener('input', () => {
            if (onVersionChange) onVersionChange(this.getSelectedVersion(containerId));
        });
    },

    /**
     * Populate version options in the dropdown
     * @param {HTMLElement} selectElement - The select element to populate
     */
    populateVersionOptions(selectElement) {
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '';

        if (typeof window.MFM_BASE === 'undefined' || !window.MFM_BASE['mfm-versions']) {
            // Fallback static options
            const fallbackOptions = [
                { value: '3.2', text: 'MFM 3.2 (Aug 2025)' },
                { value: '3.3', text: 'MFM 3.3 (Sep 2025)' }
            ];
            
            fallbackOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                selectElement.appendChild(optionElement);
            });
            
            // Set default to highest version
            selectElement.value = '3.3';
            return;
        }

        // Dynamic options from MFM_BASE
        const mfmVersions = window.MFM_BASE['mfm-versions'];
        const versions = Object.keys(mfmVersions).map(versionKey => {
            const versionData = mfmVersions[versionKey];
            return {
                value: versionKey,
                displayName: `MFM ${versionKey} (${versionData.date})`
            };
        }).sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));

        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version.value;
            option.textContent = version.displayName;
            selectElement.appendChild(option);
        });

        // Set default selection to the highest available version
        if (versions.length > 0) {
            selectElement.value = versions[versions.length - 1].value;
        }
    },

    /**
     * Get the currently selected version
     * @param {string} containerId - ID of the container element
     * @returns {string} Selected version
     */
    getSelectedVersion(containerId = 'mfm-version-container') {
        const presetRadio = document.getElementById(`mfm-preset-${containerId}`);
        const versionSelect = document.getElementById(`mfm-version-preset-${containerId}`);
        const customInput = document.getElementById(`mfm-version-custom-${containerId}`);

        if (!presetRadio || !versionSelect || !customInput) {
            return '3.2'; // Fallback
        }

        if (presetRadio.checked) {
            return versionSelect.value || '3.2';
        } else {
            return customInput.value || '';
        }
    },

    /**
     * Set the selected version
     * @param {string} version - Version to set
     * @param {string} containerId - ID of the container element
     */
    setSelectedVersion(version, containerId = 'mfm-version-container') {
        const presetRadio = document.getElementById(`mfm-preset-${containerId}`);
        const customRadio = document.getElementById(`mfm-custom-${containerId}`);
        const versionSelect = document.getElementById(`mfm-version-preset-${containerId}`);
        const customInput = document.getElementById(`mfm-version-custom-${containerId}`);

        if (!presetRadio || !customRadio || !versionSelect || !customInput) {
            return;
        }

        // Check if version exists in preset options
        const presetOptions = Array.from(versionSelect.options).map(option => option.value);
        
        if (presetOptions.includes(version)) {
            presetRadio.checked = true;
            customRadio.checked = false;
            versionSelect.value = version;
            CoreUtils.dom.show(document.getElementById(`mfm-preset-container-${containerId}`));
            CoreUtils.dom.hide(document.getElementById(`mfm-custom-container-${containerId}`));
        } else {
            customRadio.checked = true;
            presetRadio.checked = false;
            customInput.value = version;
            CoreUtils.dom.hide(document.getElementById(`mfm-preset-container-${containerId}`));
            CoreUtils.dom.show(document.getElementById(`mfm-custom-container-${containerId}`));
        }
    },

    /**
     * Get units with MFM version context - utility method that calls UnifiedCache
     * @param {string} mfmVersion - The MFM version to use for points override
     * @param {object} criteria - Optional criteria to filter units
     * @returns {Promise<Array>} Units with MFM version and points overridden
     */
    async getUnitsWithMFMVersion(mfmVersion, criteria = {}) {
        if (typeof window.UnifiedCache === 'undefined') {
            console.warn('UnifiedCache not available');
            return [];
        }
        
        return await window.UnifiedCache.getUnitsWithMFMVersion(mfmVersion, criteria);
    }
};
