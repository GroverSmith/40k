#!/usr/bin/env node
// filename: mfm/generate-ui-data.js
// Script to generate UI-optimized JSON files from MFM data
// Usage: node generate-ui-data.js [input-file] [output-file]

const fs = require('fs');
const path = require('path');
const { MFMParserUIStandalone } = require('./mfm-parser-ui-standalone.js');

function printUsage() {
    console.log(`
Usage: node generate-ui-data.js [options]

Options:
  -i, --input <file>     Input MFM file (default: RAW_MFM_3_2_AUG25.txt)
  -o, --output <file>    Output JSON file (default: auto-generated)
  --help                 Show this help message

Examples:
  node generate-ui-data.js
  node generate-ui-data.js -i RAW_MFM_3_2_AUG25.txt -o mfm-3.2-aug25.json
`);
}

function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        input: 'RAW_MFM_3_2_AUG25.txt',
        output: null,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '-i':
            case '--input':
                options.input = args[++i];
                break;
            case '-o':
            case '--output':
                options.output = args[++i];
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
            default:
                console.error(`Unknown option: ${arg}`);
                process.exit(1);
        }
    }

    return options;
}

function getDefaultOutputFile(inputFile) {
    const baseName = path.basename(inputFile, path.extname(inputFile));
    
    // Extract version from filename
    const match = baseName.match(/RAW_MFM_(\d+)_(\d+)_(\w+)/);
    if (match) {
        return `mfm-${match[1]}.${match[2]}-${match[3].toLowerCase()}.json`;
    }
    
    return `${baseName}-ui.json`;
}

function main() {
    const options = parseArguments();

    if (options.help) {
        printUsage();
        return;
    }

    // Check if input file exists
    if (!fs.existsSync(options.input)) {
        console.error(`Input file not found: ${options.input}`);
        process.exit(1);
    }

    try {
        console.log(`Generating UI-optimized data from: ${options.input}`);
        
        // Read and parse the file
        const content = fs.readFileSync(options.input, 'utf8');
        
        // Extract version info from filename
        const versionMatch = options.input.match(/RAW_MFM_(\d+)_(\d+)_(\w+)\.txt/);
        const version = versionMatch ? `${versionMatch[1]}.${versionMatch[2]}` : "3.2";
        const date = versionMatch ? versionMatch[3] : "AUG25";
        
        // Parse with UI-optimized parser
        const parser = new MFMParserUIStandalone();
        const uiData = parser.parseForUI(content, version, date);
        
        // Generate output filename if not provided
        const outputFile = options.output || getDefaultOutputFile(options.input);
        
        // Write UI-optimized JSON
        const jsonData = JSON.stringify(uiData, null, 2);
        fs.writeFileSync(outputFile, jsonData);
        
        console.log(`UI-optimized data written to: ${outputFile}`);
        console.log(`\nData Summary:`);
        console.log(`- Version: ${uiData.metadata.version}`);
        console.log(`- Total Units: ${uiData.metadata.totalUnits}`);
        console.log(`- Factions: ${uiData.metadata.factionCount}`);
        console.log(`- Forge World Units: ${uiData.metadata.forgeWorldUnits}`);
        console.log(`- Total Points: ${uiData.metadata.totalPoints.toLocaleString()}`);
        
        // Show faction breakdown
        console.log(`\nTop 10 Factions by Unit Count:`);
        const factions = Object.keys(uiData.factions)
            .map(key => ({
                name: uiData.factions[key].name,
                unitCount: uiData.factions[key].unitCount
            }))
            .sort((a, b) => b.unitCount - a.unitCount)
            .slice(0, 10);
            
        factions.forEach((faction, index) => {
            console.log(`${index + 1}. ${faction.name}: ${faction.unitCount} units`);
        });

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, parseArguments };
