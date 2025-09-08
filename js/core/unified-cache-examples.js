// filename: js/core/unified-cache-examples.js
// Usage Examples for UnifiedCacheFacade
// 40k Crusade Campaign Tracker

/**
 * USAGE EXAMPLES FOR UNIFIED CACHE FACADE
 * 
 * This file demonstrates how to use the UnifiedCacheFacade to interact
 * with all Google Apps Scripts through a clean, cached interface.
 */

// Wait for the cache to be initialized
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit for UnifiedCache to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Example usage functions
    window.CacheExamples = {
        
        /**
         * EXAMPLE 1: Get all crusades
         */
        async getAllCrusades() {
            try {
                console.log('=== Getting All Crusades ===');
                const crusades = await UnifiedCache.getAllRows('crusades');
                console.log(`Found ${crusades.length} crusades:`, crusades);
                return crusades;
            } catch (error) {
                console.error('Error getting crusades:', error);
                return [];
            }
        },

        /**
         * EXAMPLE 2: Get a specific crusade by key
         */
        async getCrusadeByKey(crusadeKey) {
            try {
                console.log(`=== Getting Crusade: ${crusadeKey} ===`);
                const crusade = await UnifiedCache.getRowByKey('crusades', crusadeKey);
                console.log('Found crusade:', crusade);
                return crusade;
            } catch (error) {
                console.error('Error getting crusade:', error);
                return null;
            }
        },

        /**
         * EXAMPLE 3: Get all forces for a specific user
         */
        async getForcesByUser(userKey) {
            try {
                console.log(`=== Getting Forces for User: ${userKey} ===`);
                const forces = await UnifiedCache.getRowsByField('forces', 'user_key', userKey);
                console.log(`Found ${forces.length} forces for user:`, forces);
                return forces;
            } catch (error) {
                console.error('Error getting user forces:', error);
                return [];
            }
        },

        /**
         * EXAMPLE 4: Get all participants for a crusade
         */
        async getCrusadeParticipants(crusadeKey) {
            try {
                console.log(`=== Getting Participants for Crusade: ${crusadeKey} ===`);
                const participants = await UnifiedCache.getRowsByField('xref_crusade_participants', 'crusade_key', crusadeKey);
                console.log(`Found ${participants.length} participants:`, participants);
                return participants;
            } catch (error) {
                console.error('Error getting crusade participants:', error);
                return [];
            }
        },

        /**
         * EXAMPLE 5: Get all units for a specific force
         */
        async getUnitsByForce(forceKey) {
            try {
                console.log(`=== Getting Units for Force: ${forceKey} ===`);
                const units = await UnifiedCache.getRowsByField('units', 'force_key', forceKey);
                console.log(`Found ${units.length} units:`, units);
                return units;
            } catch (error) {
                console.error('Error getting force units:', error);
                return [];
            }
        },

        /**
         * EXAMPLE 6: Get stories by type
         */
        async getStoriesByType(storyType) {
            try {
                console.log(`=== Getting Stories of Type: ${storyType} ===`);
                const stories = await UnifiedCache.getRowsByField('stories', 'story_type', storyType);
                console.log(`Found ${stories.length} stories:`, stories);
                return stories;
            } catch (error) {
                console.error('Error getting stories by type:', error);
                return [];
            }
        },

        /**
         * EXAMPLE 7: Complex query - Get all active crusades with their participants
         */
        async getActiveCrusadesWithParticipants() {
            try {
                console.log('=== Getting Active Crusades with Participants ===');
                
                // Get all crusades
                const allCrusades = await UnifiedCache.getAllRows('crusades');
                
                // Filter for active crusades
                const activeCrusades = allCrusades.filter(crusade => 
                    crusade.state && crusade.state.toLowerCase() === 'active'
                );
                
                console.log(`Found ${activeCrusades.length} active crusades`);
                
                // Get participants for each active crusade
                const result = [];
                for (const crusade of activeCrusades) {
                    const participants = await UnifiedCache.getRowsByField(
                        'xref_crusade_participants', 
                        'crusade_key', 
                        crusade.crusade_key
                    );
                    
                    result.push({
                        crusade: crusade,
                        participants: participants,
                        participantCount: participants.length
                    });
                }
                
                console.log('Active crusades with participants:', result);
                return result;
            } catch (error) {
                console.error('Error getting active crusades with participants:', error);
                return [];
            }
        },

        /**
         * EXAMPLE 8: Get user's complete profile (user + forces + armies + units)
         */
        async getUserCompleteProfile(userKey) {
            try {
                console.log(`=== Getting Complete Profile for User: ${userKey} ===`);
                
                // Get user data
                const user = await UnifiedCache.getRowByKey('users', userKey);
                if (!user) {
                    console.log('User not found');
                    return null;
                }
                
                // Get user's forces
                const forces = await UnifiedCache.getRowsByField('forces', 'user_key', userKey);
                
                // Get armies for each force
                const forcesWithArmies = [];
                for (const force of forces) {
                    const armies = await UnifiedCache.getRowsByField('armies', 'force_key', force.force_key);
                    forcesWithArmies.push({
                        ...force,
                        armies: armies
                    });
                }
                
                // Get units for each force
                const forcesWithUnits = [];
                for (const force of forcesWithArmies) {
                    const units = await UnifiedCache.getRowsByField('units', 'force_key', force.force_key);
                    forcesWithUnits.push({
                        ...force,
                        units: units
                    });
                }
                
                // Get crusades the user participates in
                const crusadeParticipants = await UnifiedCache.getRowsByField('xref_crusade_participants', 'user_key', userKey);
                const crusadeKeys = crusadeParticipants.map(p => p.crusade_key);
                const crusades = [];
                for (const crusadeKey of crusadeKeys) {
                    const crusade = await UnifiedCache.getRowByKey('crusades', crusadeKey);
                    if (crusade) crusades.push(crusade);
                }
                
                const profile = {
                    user: user,
                    forces: forcesWithUnits,
                    crusades: crusades,
                    totalForces: forces.length,
                    totalArmies: forcesWithArmies.reduce((sum, force) => sum + force.armies.length, 0),
                    totalUnits: forcesWithUnits.reduce((sum, force) => sum + force.units.length, 0),
                    totalCrusades: crusades.length
                };
                
                console.log('Complete user profile:', profile);
                return profile;
            } catch (error) {
                console.error('Error getting user profile:', error);
                return null;
            }
        },

        /**
         * EXAMPLE 9: Cache management operations
         */
        async demonstrateCacheManagement() {
            try {
                console.log('=== Cache Management Examples ===');
                
                // Get cache statistics
                const stats = await UnifiedCache.getCacheStats();
                console.log('Cache statistics:', stats);
                
                // Force refresh a specific cache
                console.log('Force refreshing crusades cache...');
                await UnifiedCache.getAllRows('crusades', true);
                
                // Clear a specific cache
                console.log('Clearing forces cache...');
                await UnifiedCache.clearCache('forces');
                
                // Get updated stats
                const updatedStats = await UnifiedCache.getCacheStats();
                console.log('Updated cache statistics:', updatedStats);
                
            } catch (error) {
                console.error('Error in cache management:', error);
            }
        },

        /**
         * EXAMPLE 10: Batch operations for performance
         */
        async demonstrateBatchOperations() {
            try {
                console.log('=== Batch Operations Example ===');
                
                // Get multiple data types in parallel
                const [users, crusades, forces] = await Promise.all([
                    UnifiedCache.getAllRows('users'),
                    UnifiedCache.getAllRows('crusades'),
                    UnifiedCache.getAllRows('forces')
                ]);
                
                console.log(`Batch loaded: ${users.length} users, ${crusades.length} crusades, ${forces.length} forces`);
                
                // Process data
                const activeCrusades = crusades.filter(c => c.state === 'Active');
                const userForces = forces.reduce((acc, force) => {
                    if (!acc[force.user_key]) acc[force.user_key] = [];
                    acc[force.user_key].push(force);
                    return acc;
                }, {});
                
                console.log(`Found ${activeCrusades.length} active crusades`);
                console.log('Forces by user:', userForces);
                
            } catch (error) {
                console.error('Error in batch operations:', error);
            }
        }
    };
    
    console.log('CacheExamples loaded and ready to use!');
    console.log('Try: CacheExamples.getAllCrusades()');
    console.log('Try: CacheExamples.getActiveCrusadesWithParticipants()');
    console.log('Try: CacheExamples.demonstrateCacheManagement()');
});

/**
 * INTEGRATION GUIDE
 * 
 * To integrate UnifiedCacheFacade into your existing code:
 * 
 * 1. Include the script in your HTML:
 *    <script src="js/core/unified-cache-facade.js"></script>
 * 
 * 2. Replace existing API calls:
 *    OLD: const data = await CacheManager.fetchSheetData('crusades');
 *    NEW: const data = await UnifiedCache.getAllRows('crusades');
 * 
 * 3. For specific records:
 *    OLD: const crusade = await fetch(`${url}?action=get&key=${key}`);
 *    NEW: const crusade = await UnifiedCache.getRowByKey('crusades', key);
 * 
 * 4. For filtered data:
 *    OLD: Filter after fetching all data
 *    NEW: const userForces = await UnifiedCache.getRowsByField('forces', 'user_key', userKey);
 * 
 * 5. For complex queries:
 *    Use multiple calls and combine results, or extend the facade with custom methods
 * 
 * BENEFITS:
 * - Automatic caching with TTL
 * - Deduplication of rows
 * - Offline capability
 * - Consistent API across all sheets
 * - Better performance through IndexedDB
 * - Built-in error handling and fallbacks
 */
