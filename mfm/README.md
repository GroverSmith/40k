# MFM Parser

A JavaScript tool to parse the Warhammer 40k Munitorum Field Manual (MFM) and extract unit points costs and details.

## Files

- `mfm-parser.js` - Core parser class with Node.js support
- `mfm-parser-ui-standalone.js` - Standalone UI-optimized parser for browser use
- `parse-mfm.js` - Command-line script for parsing MFM files
- `generate-ui-data.js` - Command-line script for generating UI-optimized JSON
- `mfm-parser-test-simple.html` - Web interface for testing the parser (no CORS issues)
- `RAW_MFM_3_2_AUG25.txt` - The raw MFM file to parse

## Usage

### Command Line

```bash
# Basic usage - parse and export to JSON
node parse-mfm.js

# Export to CSV
node parse-mfm.js -f csv -o units.csv

# Get statistics
node parse-mfm.js -f stats

# Filter by faction
node parse-mfm.js --faction "Space Marines" -f csv

# Search for specific units
node parse-mfm.js --search "Terminator" -f json

# Show only Forge World units
node parse-mfm.js --forge-world -f csv
```

### Command Line Options

- `-i, --input <file>` - Input MFM file (default: RAW_MFM_3_2_AUG25.txt)
- `-o, --output <file>` - Output file (default: based on format)
- `-f, --format <format>` - Output format: json, csv, stats (default: json)
- `--faction <name>` - Filter by faction name
- `--search <term>` - Search for units containing term
- `--forge-world` - Show only Forge World units
- `--help` - Show help message

### Web Interface

Open `mfm-parser-test-simple.html` in a web browser to use the interactive parser with:
- File input or drag-and-drop to select MFM file
- Real-time search and filtering
- Statistics display
- Export to UI-optimized JSON/CSV
- Faction filtering
- No CORS issues - works with local files
- Uses improved parser with 1,228 units (vs 464 in original)

### Programmatic Usage

#### Node.js (Command Line)
```javascript
const { MFMParser } = require('./mfm-parser.js');

// Parse MFM content
const parser = new MFMParser();
const units = parser.parse(mfmContent);

// Get statistics
const stats = parser.getStats();

// Filter units
const spaceMarines = parser.filterByFaction('Space Marines');
const terminators = parser.searchUnits('Terminator');

// Export data
const jsonData = parser.exportToJSON();
const csvData = parser.exportToCSV();
```

#### Browser (UI-Optimized)
```javascript
// Load the standalone parser
const parser = new MFMParserUIStandalone();

// Parse for UI-optimized structure
const uiData = parser.parseForUI(mfmContent, "3.2", "AUG25");

// Get faction list for dropdowns
const factions = parser.getFactionList(uiData);

// Get units for selected faction
const units = parser.getUnitList(uiData, "SPACE MARINES");
```

## Output Formats

### Flat Structure (Command Line)
Each parsed unit contains:

```javascript
{
  faction: "SPACE MARINES",           // Faction name
  detachment: "DETACHMENT NAME",      // Detachment (if applicable)
  unitName: "Tactical Squad",         // Unit name
  modelCount: 10,                     // Number of models
  points: 180,                        // Points cost
  isForgeWorld: false,                // Whether it's a Forge World unit
  lineNumber: 123                     // Line number in source file
}
```

### UI-Optimized Structure (Browser)
Hierarchical structure optimized for dropdowns:

```javascript
{
  metadata: {
    version: "3.2",
    date: "AUG25",
    totalUnits: 1228,
    totalPoints: 185385,
    forgeWorldUnits: 41,
    factionCount: 27
  },
  factions: {
    "SPACE MARINES": {
      name: "Space Marines",
      unitCount: 119,
      totalPoints: 15680,
      units: {
        "Tactical Squad": {
          name: "Tactical Squad",
          variants: [
            {
              modelCount: 10,
              points: 180,
              isForgeWorld: false,
              lineNumber: 123
            }
          ]
        }
      }
    }
  }
}
```

## Statistics

The parser provides comprehensive statistics including:
- **1,228 total units** parsed (vs 464 in original version)
- **185,385 total points** across all units
- **27 different factions** represented
- **41 Forge World units** properly identified
- Units per faction breakdown
- Most expensive units ranking

## Example Output

### Statistics
```
Total Units: 1,228
Total Points: 185,385
Forge World Units: 41

Factions:
  SPACE MARINES: 119 units
  AELDARI: 91 units
  ASTRA MILITARUM: 78 units
  CHAOS SPACE MARINES: 78 units
  TYRANIDS: 72 units
  ...
```

### CSV Format
```csv
Faction,Detachment,Unit Name,Model Count,Points,Forge World,Line Number
"SPACE MARINES","","Tactical Squad",10,180,No,123
"AELDARI","","Dire Avengers",5,70,No,456
...
```

## Notes

- The parser handles the specific format of the MFM file with improved accuracy
- Unit names are extracted by looking backwards from points lines
- Faction headers are identified by "CODEX:" or "INDEX:" prefixes
- Forge World sections are properly identified and flagged
- Detachment enhancements are filtered out (only units with points are included)
- Handles inconsistent formatting (varying dot counts, leading spaces)
- Captures all unit variants (multiple model count options per unit)

## Requirements

- Node.js (for command-line usage)
- Modern web browser (for web interface)
- No external dependencies
