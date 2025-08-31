// filename: js/force-display.js
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
            } else if (window.location.pathname.includes('/battle-reports/')) {
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
    }
};

// Make globally available
window.ForceDisplay = ForceDisplay;