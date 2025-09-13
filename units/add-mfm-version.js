// Script to add new MFM versions to the embedded data system
// Usage: node add-mfm-version.js <version> <date> <json-file>

const fs = require('fs');
const path = require('path');

function addMFMVersion(version, date, jsonFilePath) {
    try {
        console.log(`Adding MFM version ${version} (${date})...`);
        
        // Validate inputs
        if (!version || !date || !jsonFilePath) {
            throw new Error('Usage: node add-mfm-version.js <version> <date> <json-file>');
        }
        
        if (!fs.existsSync(jsonFilePath)) {
            throw new Error(`JSON file not found: ${jsonFilePath}`);
        }
        
        // Read and parse JSON
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const data = JSON.parse(jsonData);
        
        // Create JavaScript file
        const jsFileName = `mfm-data-${version}.js`;
        const jsFilePath = path.join(__dirname, jsFileName);
        
        const jsContent = `// MFM ${version} Data - Embedded for GitHub Pages
// Generated from ${path.basename(jsonFilePath)}

window.MFM_DATA_${version.replace('.', '_')} = ${JSON.stringify(data, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MFM_DATA_${version.replace('.', '_')};
}`;

        fs.writeFileSync(jsFilePath, jsContent, 'utf8');
        console.log(`✅ Created ${jsFileName}`);
        
        // Update the bundle file
        updateBundleFile(version, date);
        
        // Update HTML file
        updateHTMLFile(version);
        
        console.log(`🎉 Successfully added MFM version ${version}!`);
        console.log(`📝 Don't forget to commit the new files to your repository.`);
        
    } catch (error) {
        console.error(`❌ Error adding MFM version:`, error.message);
        process.exit(1);
    }
}

function updateBundleFile(version, date) {
    const bundlePath = path.join(__dirname, 'mfm-data-bundle.js');
    let bundleContent = fs.readFileSync(bundlePath, 'utf8');
    
    // Add version to the versions object
    const versionEntry = `        "${version}": {
            metadata: {
                version: "${version}",
                date: "${date}",
                displayName: "MFM ${version} (${date})"
            },
            data: null // Will be loaded from embedded data
        },`;
    
    // Find the insertion point (before the closing brace of versions object)
    const versionsEndIndex = bundleContent.lastIndexOf('    },');
    if (versionsEndIndex !== -1) {
        bundleContent = bundleContent.slice(0, versionsEndIndex) + 
                       versionEntry + '\n' + 
                       bundleContent.slice(versionsEndIndex);
        
        fs.writeFileSync(bundlePath, bundleContent, 'utf8');
        console.log(`✅ Updated mfm-data-bundle.js`);
    }
}

function updateHTMLFile(version) {
    const htmlPath = path.join(__dirname, 'unit-add.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Add script tag for the new version
    const scriptTag = `    <script src="mfm-data-${version}.js"></script>\n`;
    
    // Find the insertion point (after the last mfm-data script)
    const lastScriptIndex = htmlContent.lastIndexOf('mfm-data-');
    if (lastScriptIndex !== -1) {
        const endOfLine = htmlContent.indexOf('\n', lastScriptIndex);
        if (endOfLine !== -1) {
            htmlContent = htmlContent.slice(0, endOfLine + 1) + 
                         scriptTag + 
                         htmlContent.slice(endOfLine + 1);
            
            fs.writeFileSync(htmlPath, htmlContent, 'utf8');
            console.log(`✅ Updated unit-add.html`);
        }
    }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.log('Usage: node add-mfm-version.js <version> <date> <json-file>');
    console.log('Example: node add-mfm-version.js 3.4 Oct25 ../mfm/mfm-3_4-Oct25.json');
    process.exit(1);
}

const [version, date, jsonFile] = args;
addMFMVersion(version, date, jsonFile);
