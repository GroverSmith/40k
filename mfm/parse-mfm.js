#!/usr/bin/env node
// filename: mfm/parse-mfm.js
// Command-line script to parse MFM file and export data
// Usage: node parse-mfm.js [input-file] [output-format] [output-file]

const fs = require('fs');
const path = require('path');
const { MFMParser } = require('./mfm-parser.js');

function printUsage() {
    console.log(`
Usage: node parse-mfm.js [options]

Options:
  -i, --input <file>     Input MFM file (default: RAW_MFM_3_2_AUG25.txt)
  -o, --output <file>    Output file (default: based on format)
  -f, --format <format>  Output format: json, csv, stats (default: json)
  --faction <name>       Filter by faction name
  --search <term>        Search for units containing term
  --forge-world          Show only Forge World units
  --help                 Show this help message

Examples:
  node parse-mfm.js
  node parse-mfm.js -i RAW_MFM_3_2_AUG25.txt -f csv -o units.csv
  node parse-mfm.js --faction "Space Marines" --format json
  node parse-mfm.js --search "Terminator" --format csv
`);
}

function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        input: 'RAW_MFM_3_2_AUG25.txt',
        output: null,
        format: 'json',
        faction: null,
        search: null,
        forgeWorld: false,
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
            case '-f':
            case '--format':
                options.format = args[++i];
                break;
            case '--faction':
                options.faction = args[++i];
                break;
            case '--search':
                options.search = args[++i];
                break;
            case '--forge-world':
                options.forgeWorld = true;
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

function getDefaultOutputFile(inputFile, format) {
    const baseName = path.basename(inputFile, path.extname(inputFile));
    const extensions = {
        json: '.json',
        csv: '.csv',
        stats: '.txt'
    };
    
    return `${baseName}_parsed${extensions[format] || '.json'}`;
}

function main() {
    const options = parseArguments();

    if (options.help) {
        printUsage();
        return;
    }

    // Validate format
    if (!['json', 'csv', 'stats'].includes(options.format)) {
        console.error('Invalid format. Must be: json, csv, or stats');
        process.exit(1);
    }

    // Check if input file exists
    if (!fs.existsSync(options.input)) {
        console.error(`Input file not found: ${options.input}`);
        process.exit(1);
    }

    try {
        console.log(`Parsing MFM file: ${options.input}`);
        
        // Read and parse the file
        const content = fs.readFileSync(options.input, 'utf8');
        const parser = new MFMParser();
        let units = parser.parse(content);

        console.log(`Parsed ${units.length} units`);

        // Apply filters
        if (options.faction) {
            units = parser.filterByFaction(options.faction);
            console.log(`Filtered to ${units.length} units for faction: ${options.faction}`);
        }

        if (options.search) {
            units = parser.searchUnits(options.search);
            console.log(`Filtered to ${units.length} units matching: ${options.search}`);
        }

        if (options.forgeWorld) {
            units = units.filter(unit => unit.isForgeWorld);
            console.log(`Filtered to ${units.length} Forge World units`);
        }

        // Generate output
        let output;
        let outputFile = options.output || getDefaultOutputFile(options.input, options.format);

        switch (options.format) {
            case 'json':
                output = JSON.stringify(units, null, 2);
                break;
            case 'csv':
                parser.units = units;
                output = parser.exportToCSV();
                break;
            case 'stats':
                const stats = parser.getStats();
                output = `MFM Parser Statistics
====================

Total Units: ${stats.totalUnits}
Total Points: ${stats.totalPoints.toLocaleString()}
Forge World Units: ${stats.forgeWorldUnits}

Factions:
${Object.entries(stats.factions)
    .sort(([,a], [,b]) => b - a)
    .map(([faction, count]) => `  ${faction}: ${count} units`)
    .join('\n')}

Top 10 Most Expensive Units:
${units
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)
    .map((unit, i) => `${i + 1}. ${unit.unitName} (${unit.faction}) - ${unit.points} pts`)
    .join('\n')}
`;
                break;
        }

        // Write output file
        fs.writeFileSync(outputFile, output);
        console.log(`Output written to: ${outputFile}`);

        // Display summary
        if (options.format === 'stats') {
            console.log('\n' + output);
        } else {
            const stats = parser.getStats();
            console.log(`
Summary:
- Total units: ${stats.totalUnits}
- Factions: ${Object.keys(stats.factions).length}
- Forge World units: ${stats.forgeWorldUnits}
- Total points: ${stats.totalPoints.toLocaleString()}
`);
        }

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
