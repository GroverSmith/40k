# Unified Cache Facade Integration Guide

## Overview

The Unified Cache Facade provides a clean, IndexedDB-based caching layer in front of all Google Apps Scripts. It offers:

- **Unified API**: Single interface for all sheet operations
- **Automatic Caching**: IndexedDB storage with TTL-based expiration
- **Deduplication**: Each row is stored only once per sheet
- **Offline Support**: Works with cached data when offline
- **Performance**: Fast local storage with intelligent cache management

## Quick Start

### 1. Include the Scripts

Add these to your HTML files:

```html
<script src="js/core/unified-cache-facade.js"></script>
<script src="js/core/unified-cache-examples.js"></script>
```

### 2. Basic Usage

```javascript
// Wait for initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Get all crusades
    const crusades = await UnifiedCache.getAllRows('crusades');
    
    // Get a specific crusade
    const crusade = await UnifiedCache.getRowByKey('crusades', 'crusade-key-123');
    
    // Get forces for a user
    const userForces = await UnifiedCache.getRowsByField('forces', 'user_key', 'user-123');
});
```

## Migration from Existing Cache

### Before (Old Cache System)

```javascript
// Old way - using CacheManager
const data = await CacheManager.fetchSheetData('crusades');
const crusade = await CacheManager.fetchWithCache(`${url}?action=get&key=${key}`, 'crusades');
```

### After (Unified Cache Facade)

```javascript
// New way - using UnifiedCache
const data = await UnifiedCache.getAllRows('crusades');
const crusade = await UnifiedCache.getRowByKey('crusades', key);
```

## API Reference

### Core Methods

#### `getAllRows(sheetName, forceRefresh = false)`
Get all rows from a sheet.

```javascript
const crusades = await UnifiedCache.getAllRows('crusades');
const forces = await UnifiedCache.getAllRows('forces', true); // Force refresh
```

#### `getRowByKey(sheetName, key)`
Get a specific row by its primary key.

```javascript
const crusade = await UnifiedCache.getRowByKey('crusades', 'crusade-key-123');
const user = await UnifiedCache.getRowByKey('users', 'user-key-456');
```

#### `getRowsByField(sheetName, fieldName, fieldValue)`
Get rows matching a specific field value.

```javascript
const userForces = await UnifiedCache.getRowsByField('forces', 'user_key', 'user-123');
const activeCrusades = await UnifiedCache.getRowsByField('crusades', 'state', 'Active');
```

#### `getRowsByFields(sheetName, criteria)`
Get rows matching multiple field values (AND condition).

```javascript
const userActiveForces = await UnifiedCache.getRowsByFields('forces', {
    user_key: 'user-123',
    faction: 'Space Marines'
});
```

### Cache Management

#### `clearCache(sheetName)`
Clear cache for a specific sheet.

```javascript
await UnifiedCache.clearCache('crusades');
```

#### `clearAllCaches()`
Clear all caches.

```javascript
await UnifiedCache.clearAllCaches();
```

#### `refreshAllCaches()`
Force refresh all caches from the server.

```javascript
await UnifiedCache.refreshAllCaches();
```

#### `getCacheStats()`
Get cache statistics.

```javascript
const stats = await UnifiedCache.getCacheStats();
console.log(stats.crusades.recordCount); // Number of cached crusades
console.log(stats.crusades.cacheValid);  // Whether cache is valid
```

## Supported Sheets

The facade supports all Google Apps Scripts:

| Sheet Name | Primary Key | Description |
|------------|-------------|-------------|
| `users` | `user_key` | User accounts |
| `crusades` | `crusade_key` | Crusade campaigns |
| `forces` | `force_key` | Player forces |
| `armies` | `army_key` | Army lists |
| `units` | `unit_key` | Individual units |
| `stories` | `story_key` | Narrative stories |
| `battle_history` | `battle_key` | Battle reports |
| `xref_crusade_participants` | `crusade_key` + `force_key` | Crusade participants |
| `xref_story_forces` | `story_key` + `force_key` | Story-force relationships |
| `xref_story_units` | `story_key` + `unit_key` | Story-unit relationships |

## Cache Configuration

### TTL Settings

Each sheet has a configurable TTL (Time To Live):

- **Users, Crusades, Forces, Participants**: 24 hours
- **Armies, Units, Stories, Story Relations**: 1 hour
- **Battle History**: 30 minutes

### Automatic Features

- **Deduplication**: Duplicate rows are automatically filtered out
- **Soft Delete Support**: Deleted rows are filtered from results
- **Offline Fallback**: Uses cached data when network is unavailable
- **Error Handling**: Graceful fallbacks and error recovery

## Advanced Usage Examples

### Complex Queries

```javascript
// Get active crusades with their participants
const activeCrusades = await UnifiedCache.getRowsByField('crusades', 'state', 'Active');
const results = [];

for (const crusade of activeCrusades) {
    const participants = await UnifiedCache.getRowsByField(
        'xref_crusade_participants', 
        'crusade_key', 
        crusade.crusade_key
    );
    
    results.push({
        crusade: crusade,
        participants: participants,
        participantCount: participants.length
    });
}
```

### Batch Operations

```javascript
// Load multiple data types in parallel
const [users, crusades, forces] = await Promise.all([
    UnifiedCache.getAllRows('users'),
    UnifiedCache.getAllRows('crusades'),
    UnifiedCache.getAllRows('forces')
]);
```

### User Profile Building

```javascript
async function buildUserProfile(userKey) {
    const user = await UnifiedCache.getRowByKey('users', userKey);
    const forces = await UnifiedCache.getRowsByField('forces', 'user_key', userKey);
    
    const forcesWithDetails = [];
    for (const force of forces) {
        const armies = await UnifiedCache.getRowsByField('armies', 'force_key', force.force_key);
        const units = await UnifiedCache.getRowsByField('units', 'force_key', force.force_key);
        
        forcesWithDetails.push({
            ...force,
            armies: armies,
            units: units
        });
    }
    
    return {
        user: user,
        forces: forcesWithDetails,
        totalForces: forces.length,
        totalArmies: forcesWithDetails.reduce((sum, f) => sum + f.armies.length, 0),
        totalUnits: forcesWithDetails.reduce((sum, f) => sum + f.units.length, 0)
    };
}
```

## Testing

Use the test page to verify functionality:

```html
<!-- Open in browser -->
<script src="js/core/unified-cache-test.html"></script>
```

Or use the examples:

```javascript
// Test basic operations
await CacheExamples.getAllCrusades();
await CacheExamples.getActiveCrusadesWithParticipants();
await CacheExamples.demonstrateCacheManagement();
```

## Performance Benefits

- **Faster Loading**: IndexedDB is much faster than repeated API calls
- **Reduced Network**: Data is cached locally with intelligent refresh
- **Better UX**: Instant responses for cached data
- **Offline Support**: App works even when offline
- **Deduplication**: No duplicate data storage

## Error Handling

The facade includes comprehensive error handling:

- **Network Errors**: Falls back to cached data
- **Invalid Data**: Graceful error messages
- **Cache Corruption**: Automatic cache clearing and refresh
- **Missing Data**: Returns empty arrays/objects instead of crashing

## Browser Compatibility

- **Modern Browsers**: Full IndexedDB support
- **Fallback**: Graceful degradation for older browsers
- **Mobile**: Optimized for mobile devices

## Integration Checklist

- [ ] Include `unified-cache-facade.js` in your HTML
- [ ] Replace `CacheManager.fetchSheetData()` calls with `UnifiedCache.getAllRows()`
- [ ] Replace direct API calls with `UnifiedCache.getRowByKey()`
- [ ] Update filtering logic to use `getRowsByField()` and `getRowsByFields()`
- [ ] Test with the provided test page
- [ ] Update any custom cache management code
- [ ] Verify offline functionality works as expected

## Troubleshooting

### Cache Not Updating
```javascript
// Force refresh specific sheet
await UnifiedCache.getAllRows('crusades', true);

// Or refresh all
await UnifiedCache.refreshAllCaches();
```

### Performance Issues
```javascript
// Check cache stats
const stats = await UnifiedCache.getCacheStats();
console.log('Cache performance:', stats);

// Clear and rebuild cache
await UnifiedCache.clearAllCaches();
```

### Data Inconsistency
```javascript
// Clear specific sheet cache
await UnifiedCache.clearCache('crusades');

// Or clear all and refresh
await UnifiedCache.clearAllCaches();
await UnifiedCache.refreshAllCaches();
```

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live data
- **Conflict Resolution**: Handle concurrent modifications
- **Advanced Queries**: SQL-like query interface
- **Data Validation**: Schema validation for cached data
- **Compression**: Data compression for large datasets
