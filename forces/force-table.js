// filename: forces/force-table.js
// Unified force display module for all force-related UI
// 40k Crusade Campaign Tracker

const ForceDisplay = {
    /**
     * Create a hyperlinked force name
     */
    createForceLink(forceName, forceKey, baseUrl = '') {
        if (!forceKey) return forceName || 'Unknown Force';

        // Determine the correct path based on current location
        let path = baseUrl;
        if (!path) {
            if (window.location.pathname.includes('/forces/')) {
                path = ''; // Same directory
            } else if (window.location.pathname.includes('/crusades/')) {
                path = '../forces/';
            } else if (window.location.pathname.includes('/battles/')) {
                path = '../forces/';
            } else if (window.location.pathname.includes('/stories/')) {
                path = '../forces/';
            } else {
                path = 'forces/'; // From root
            }
        }

        return `<a href="${path}force-details.html?key=${encodeURIComponent(forceKey)}">${forceName}</a>`;
    },

    /**
     * Display forces in a table format - used by multiple pages
     */
    displayForcesTable(forces, container, options = {}) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!forces || forces.length === 0) {
            container.innerHTML = '<p class="no-data">No forces found.</p>';
            return;
        }

        const showPlayer = options.showPlayer !== false;
        const showFaction = options.showFaction !== false;
        const showJoined = options.showJoined !== false;
        const tableId = options.tableId || 'forces-table';

        let html = `
            <div class="table-wrapper">
                <table class="data-table" id="${tableId}">
                    <thead>
                        <tr>
                            <th>Force Name</th>
                            ${showPlayer ? '<th>Commander</th>' : ''}
                            ${showFaction ? '<th>Faction</th>' : ''}
                            ${showJoined ? '<th>Joined</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;

        forces.forEach(force => {
            const forceKey = force['Force Key'] || force['Key'] || force.key;
            const forceName = force['Force Name'] || force.forceName || 'Unnamed Force';
            const userName = force['User Name'] || force['Player Name'] || force.playerName || 'Unknown';
            const faction = force['Faction'] || force.faction || 'Unknown';
            const timestamp = force['Timestamp'] || force.timestamp;

            const forceLink = this.createForceLink(forceName, forceKey, options.baseUrl);
            const joinDate = timestamp ? UIHelpers.formatDate(timestamp) : '-';

            html += `
                <tr>
                    <td>${forceLink}</td>
                    ${showPlayer ? `<td>${userName}</td>` : ''}
                    ${showFaction ? `<td>${faction}</td>` : ''}
                    ${showJoined ? `<td>${joinDate}</td>` : ''}
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Make table sortable
        if (window.UIHelpers && UIHelpers.makeSortable) {
            UIHelpers.makeSortable(tableId);
        }
    },

    /**
     * Display forces for a crusade
     */
    displayCrusadeForces(forces, container) {
        this.displayForcesTable(forces, container, {
            showPlayer: true,
            showFaction: true,
            showJoined: true,
            tableId: 'crusade-forces-table',
            baseUrl: '../forces/'
        });
    },

    /**
     * Load and display forces for a crusade with caching
     */
    async loadForCrusade(crusadeKey, containerId) {
        console.log('ForceDisplay.loadForCrusade called:', crusadeKey, containerId);
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        try {
            container.innerHTML = '<div class="loading-spinner"></div><span>Loading forces...</span>';

            const participantsUrl = CrusadeConfig.getSheetUrl('crusadeParticipants');
            if (!participantsUrl) {
                container.innerHTML = '<p class="no-data">Participants tracking not configured.</p>';
                return;
            }

            const fetchUrl = `${participantsUrl}?action=forces-for-crusade&crusade=${encodeURIComponent(crusadeKey)}`;

            const data = await CacheManager.fetchWithCache(
                fetchUrl,
                'crusadeParticipants',
                `crusade_${crusadeKey}_forces`
            );

            console.log('Forces result:', data);

            if (data.success && data.forces && data.forces.length > 0) {
                this.displayCrusadeForces(data.forces, container);
            } else {
                container.innerHTML = '<p class="no-data">No forces registered for this crusade yet.</p>';
            }
        } catch (error) {
            console.error('Error in loadForCrusade:', error);
            container.innerHTML = '<p class="error-message">Failed to load forces.</p>';
        }
    },

    /**
     * Display all forces (for homepage or force list page)
     */
    async loadAllForces(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading-spinner"></div><span>Loading forces...</span>';

            const forcesUrl = CrusadeConfig.getSheetUrl('forces');
            if (!forcesUrl) {
                container.innerHTML = '<p class="no-data">Forces not configured.</p>';
                return;
            }

            const data = await CacheManager.fetchWithCache(forcesUrl, 'forces', 'all');

            if (data && data.length > 1) {
                const headers = data[0];
                const forces = data.slice(1).map(row => {
                    const force = {};
                    headers.forEach((header, index) => {
                        force[header] = row[index];
                    });
                    return force;
                });

                // Sort by timestamp or name
                forces.sort((a, b) => {
                    const dateA = new Date(a['Timestamp'] || 0);
                    const dateB = new Date(b['Timestamp'] || 0);
                    return dateB - dateA;
                });

                this.displayForcesTable(forces, container, {
                    showPlayer: true,
                    showFaction: true,
                    showJoined: true,
                    tableId: 'all-forces-table'
                });
            } else {
                container.innerHTML = '<p class="no-data">No forces registered yet.</p>';
            }
        } catch (error) {
            console.error('Error loading all forces:', error);
            container.innerHTML = '<p class="error-message">Failed to load forces.</p>';
        }
    }
};

// Make globally available
window.ForceDisplay = ForceDisplay;