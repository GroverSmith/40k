// filename: crusades/leaderboard-shared.js
// Shared Leaderboard Logic for 40k Crusade Campaign Tracker

class LeaderboardShared {
    /**
     * Load and display leaderboard for a given crusade
     * @param {string} crusadeKey - The crusade key to load leaderboard for
     * @param {string} containerId - The DOM element ID to display the leaderboard in
     * @returns {Promise<void>}
     */
    static async loadLeaderboard(crusadeKey, containerId) {
        const container = CoreUtils.dom.getElement(containerId);
        if (!container) {
            console.error('Leaderboard container not found:', containerId);
            return;
        }

        try {
            console.log('Loading leaderboard for crusade:', crusadeKey);
            
            // Get all required data in parallel
            const [pointsLogEntries, allForces, pointsCategories] = await Promise.all([
                UnifiedCache.getAllRows('crusade_points_log'),
                UnifiedCache.getAllRows('forces'),
                UnifiedCache.getAllRows('crusade_points_categories')
            ]);
            
            // Filter for this crusade and active entries
            const crusadePoints = pointsLogEntries.filter(entry => {
                const entryCrusadeKey = entry.crusade_key || entry['Crusade Key'] || entry['crusade_key'];
                const isDeleted = entry.deleted_timestamp || entry['Deleted Timestamp'] || entry['deleted_timestamp'];
                return entryCrusadeKey === crusadeKey && !isDeleted;
            });

            // Filter categories for this crusade
            const crusadeCategories = pointsCategories.filter(cat => {
                const catCrusadeKey = cat.crusade_key || cat['Crusade Key'] || cat['crusade_key'];
                const isDeleted = cat.deleted_timestamp || cat['Deleted Timestamp'] || cat['deleted_timestamp'];
                return catCrusadeKey === crusadeKey && !isDeleted;
            });

            // Calculate points with category limits enforced
            const forcePoints = LeaderboardShared.calculateForcePointsWithLimits(crusadePoints, crusadeCategories);

            // Convert to array and sort by total points (descending)
            const leaderboardData = Object.values(forcePoints).sort((a, b) => b.totalPoints - a.totalPoints);

            // Build leaderboard HTML
            const leaderboardHTML = LeaderboardShared.buildLeaderboardHTML(leaderboardData, allForces);
            
            container.innerHTML = leaderboardHTML;

        } catch (error) {
            console.error('Error loading leaderboard:', error);
            container.innerHTML = '<div class="error-message">Failed to load leaderboard data.</div>';
        }
    }

    /**
     * Calculate force points with category limits enforced
     * @param {Array} crusadePoints - Array of points log entries for the crusade
     * @param {Array} crusadeCategories - Array of category limits for the crusade
     * @returns {Object} Object with force points data including category tracking
     */
    static calculateForcePointsWithLimits(crusadePoints, crusadeCategories) {
        const forcePoints = {};
        
        // Create a map of category limits for quick lookup
        const categoryLimits = {};
        crusadeCategories.forEach(cat => {
            const phaseKey = cat.phase_key || cat['Phase Key'] || cat['phase_key'];
            const category = cat.category || cat['Category'] || cat['category'];
            const maxPoints = Number(cat.max_popints_for_phase || cat['Max Points For Phase'] || cat['max_points_for_phase'] || 0);
            
            if (phaseKey && category) {
                const key = `${phaseKey}:${category}`;
                categoryLimits[key] = maxPoints;
            }
        });

        // Process each points entry
        crusadePoints.forEach(entry => {
            const forceKey = entry.force_key || entry['Force Key'] || entry['force_key'];
            const phaseKey = entry.phase_key || entry['Phase Key'] || entry['phase_key'];
            const points = Number(entry.points || entry['Points'] || entry['points'] || 0);
            
            if (forceKey) {
                if (!forcePoints[forceKey]) {
                    forcePoints[forceKey] = {
                        forceKey: forceKey,
                        totalPoints: 0,
                        entries: [],
                        categoryTotals: {} // Track points per category per phase
                    };
                }
                
                // Determine category from event (this might need to be enhanced based on your data structure)
                // For now, we'll use a simple approach - you may need to map events to categories
                const event = entry.event || entry['Event'] || entry['event'] || '';
                const category = LeaderboardShared.determineCategoryFromEvent(event);
                
                if (category) {
                    const categoryKey = `${phaseKey}:${category}`;
                    const maxPoints = categoryLimits[categoryKey];
                    
                    if (maxPoints > 0) {
                        // Initialize category tracking if not exists
                        if (!forcePoints[forceKey].categoryTotals[categoryKey]) {
                            forcePoints[forceKey].categoryTotals[categoryKey] = {
                                used: 0,
                                max: maxPoints,
                                category: category,
                                phaseKey: phaseKey
                            };
                        }
                        
                        const categoryTotal = forcePoints[forceKey].categoryTotals[categoryKey];
                        const remainingCapacity = categoryTotal.max - categoryTotal.used;
                        
                        // Calculate how many points can be applied
                        let pointsToApply = 0;
                        if (points > 0) {
                            // Positive points - apply up to remaining capacity
                            pointsToApply = Math.min(points, remainingCapacity);
                        } else {
                            // Negative points - always apply (penalties)
                            pointsToApply = points;
                        }
                        
                        // Update category totals
                        categoryTotal.used += pointsToApply;
                        
                        // Add to total points
                        forcePoints[forceKey].totalPoints += pointsToApply;
                        
                        // Store entry with category info
                        forcePoints[forceKey].entries.push({
                            ...entry,
                            category: category,
                            pointsApplied: pointsToApply,
                            pointsOriginal: points,
                            categoryLimit: maxPoints,
                            categoryUsed: categoryTotal.used
                        });
                    } else {
                        // No limit - apply all points
                        forcePoints[forceKey].totalPoints += points;
                        forcePoints[forceKey].entries.push({
                            ...entry,
                            category: category,
                            pointsApplied: points,
                            pointsOriginal: points,
                            categoryLimit: null,
                            categoryUsed: null
                        });
                    }
                } else {
                    // No category determined - apply all points
                    forcePoints[forceKey].totalPoints += points;
                    forcePoints[forceKey].entries.push({
                        ...entry,
                        category: null,
                        pointsApplied: points,
                        pointsOriginal: points,
                        categoryLimit: null,
                        categoryUsed: null
                    });
                }
            }
        });

        return forcePoints;
    }

    /**
     * Determine category from event name (this is a simple implementation)
     * You may need to enhance this based on your specific event naming conventions
     * @param {string} event - The event name
     * @returns {string|null} The category name or null if not determined
     */
    static determineCategoryFromEvent(event) {
        if (!event) return null;
        
        const eventLower = event.toLowerCase();
        
        // Simple category mapping - you may need to enhance this
        if (eventLower.includes('battle') || eventLower.includes('combat')) {
            return 'Battle';
        } else if (eventLower.includes('objective') || eventLower.includes('mission')) {
            return 'Objectives';
        } else if (eventLower.includes('narrative') || eventLower.includes('story')) {
            return 'Narrative';
        } else if (eventLower.includes('painting') || eventLower.includes('model')) {
            return 'Painting';
        } else if (eventLower.includes('terrain') || eventLower.includes('building')) {
            return 'Terrain';
        }
        
        // Default category if no match
        return 'General';
    }

    /**
     * Build HTML for the leaderboard display
     * @param {Array} leaderboardData - Array of force data with points
     * @param {Array} allForces - Array of all forces for name resolution
     * @returns {string} HTML string for the leaderboard
     */
    static buildLeaderboardHTML(leaderboardData, allForces) {
        if (leaderboardData.length === 0) {
            return `
                <div class="leaderboard-empty">
                    <p>No points have been recorded yet for this crusade.</p>
                    <p>Points will appear here once battles and events are logged.</p>
                </div>
            `;
        }

        let html = `
            <div class="leaderboard-container">
                <div class="leaderboard-table">
        `;

        leaderboardData.forEach((forceData, index) => {
            const rank = index + 1;
            const forceKey = forceData.forceKey;
            
            // Find the force name from allForces
            const force = allForces.find(f => {
                const fKey = f.force_key || f['Force Key'] || f['force_key'];
                return fKey === forceKey;
            });
            
            const forceName = force ? (force.force_name || force['Force Name'] || force['force_name'] || 'Unknown Force') : 'Unknown Force';
            const totalPoints = forceData.totalPoints;
            const entryCount = forceData.entries.length;

            // Add ranking emoji
            let rankEmoji = '';
            if (rank === 1) rankEmoji = '🥇';
            else if (rank === 2) rankEmoji = '🥈';
            else if (rank === 3) rankEmoji = '🥉';
            else rankEmoji = `#${rank}`;

            html += `
                <div class="leaderboard-row ${rank <= 3 ? 'top-three' : ''}">
                    <div class="leaderboard-rank">
                        <span class="rank-emoji">${rankEmoji}</span>
                    </div>
                    <div class="leaderboard-force">
                        <div class="force-name">${CoreUtils.strings.escapeHtml(forceName)}</div>
                        <div class="force-details">
                            <span class="entry-count">${entryCount} event${entryCount !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div class="leaderboard-points">
                        <span class="total-points">${totalPoints}</span>
                        <span class="points-label">points</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }
}
