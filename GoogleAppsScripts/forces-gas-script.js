// filename: forces-gas-script.js
// Google Apps Script for Forces Sheet with Composite Key System
// Deploy this as a web app to handle force creation and retrieval

const SPREADSHEET_ID = '13n56kfJPSMoeV9VyiTXYajWT1LuBmnpj2oSwcek_osg';
const SHEET_NAME = 'Forces';

// Key generation function
function generateForceKey(forceName, userName) {
  // Remove spaces and special characters, limit length for readability
  const forcePart = forceName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const userPart = userName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  return `${forcePart}_${userPart}`;
}

function doPost(e) {
  try {
    console.log('doPost called - raw data:', e.postData ? e.postData.contents : 'No postData');
    console.log('Parameters:', e.parameter);
    
    let data;
    
    // The form submission comes as URL-encoded parameters
    if (e.parameter) {
      data = e.parameter;
      console.log('Using form parameters:', data);
    } else if (e.postData && e.postData.contents) {
      try {
        // Try to parse as JSON (fallback)
        data = JSON.parse(e.postData.contents);
        console.log('Parsed JSON data:', data);
      } catch (jsonError) {
        console.error('Not JSON data:', jsonError.message);
        throw new Error('No valid data received');
      }
    } else {
      throw new Error('No data received in request');
    }
    
    // Validate required fields
    if (!data.userName || !data.forceName || !data.faction) {
      const missing = [];
      if (!data.userName) missing.push('userName');
      if (!data.forceName) missing.push('forceName');
      if (!data.faction) missing.push('faction');
      throw new Error('Missing required fields: ' + missing.join(', '));
    }
    
    console.log('Validation passed, opening spreadsheet...');
    
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Spreadsheet opened successfully');
    
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    console.log('Sheet found:', !!sheet);
    
    // Create sheet if it doesn't exist OR update existing sheet structure
    if (!sheet) {
      console.log('Creating new sheet:', SHEET_NAME);
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }
    
    // Check if sheet has the correct headers (with Key column first)
    let needsHeaderUpdate = false;
    if (sheet.getLastRow() === 0) {
      needsHeaderUpdate = true;
    } else {
      const firstCell = sheet.getRange(1, 1).getValue();
      if (firstCell !== 'Key') {
        needsHeaderUpdate = true;
      }
    }
    
    if (needsHeaderUpdate) {
      console.log('Updating headers to include Key column');
      
      // If sheet has existing data without Key column, we need to migrate it
      if (sheet.getLastRow() > 0 && sheet.getRange(1, 1).getValue() !== 'Key') {
        console.log('Migrating existing data to new structure');
        
        // Get existing data
        const existingData = sheet.getDataRange().getValues();
        
        // Clear the sheet
        sheet.clear();
        
        // Set new headers
        const headers = ['Key', 'User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        
        // Migrate existing data with generated keys
        if (existingData.length > 1) {
          const migratedData = [];
          for (let i = 1; i < existingData.length; i++) {
            const row = existingData[i];
            // Assume old structure was: User Name, Force Name, Faction, Detachment, Notes, Timestamp
            const userName = row[0] || '';
            const forceName = row[1] || '';
            const forceKey = generateForceKey(forceName, userName);
            
            migratedData.push([
              forceKey,
              userName,
              forceName,
              row[2] || '', // Faction
              row[3] || '', // Detachment
              row[4] || '', // Notes
              row[5] || new Date() // Timestamp
            ]);
          }
          
          if (migratedData.length > 0) {
            sheet.getRange(2, 1, migratedData.length, 7).setValues(migratedData);
            console.log(`Migrated ${migratedData.length} existing forces`);
          }
        }
      } else {
        // Just add headers to empty sheet
        const headers = ['Key', 'User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 200); // Key
      sheet.setColumnWidth(2, 150); // User Name
      sheet.setColumnWidth(3, 200); // Force Name
      sheet.setColumnWidth(4, 150); // Faction
      sheet.setColumnWidth(5, 150); // Detachment
      sheet.setColumnWidth(6, 300); // Notes
      sheet.setColumnWidth(7, 150); // Timestamp
    }
    
    // Generate the force key
    const forceKey = generateForceKey(data.forceName, data.userName);
    console.log('Generated force key:', forceKey);
    
    // Check if force key already exists
    if (sheet.getLastRow() > 1) {
      const existingKeys = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
      
      if (existingKeys.includes(forceKey)) {
        console.log('Force key already exists:', forceKey);
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'A force with this name already exists for this user'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Parse timestamp
    let timestamp;
    if (data.timestamp) {
      timestamp = new Date(data.timestamp);
    } else {
      timestamp = new Date();
    }
    console.log('Using timestamp:', timestamp);
    
    // Prepare the row data with key
    const rowData = [
      forceKey,                                // Key (column A)
      data.userName,                           // User Name (column B)
      data.forceName,                          // Force Name (column C)
      data.faction,                            // Faction (column D)
      data.detachment || '',                   // Detachment (column E)
      data.notes || '',                        // Notes (column F)
      timestamp                                 // Timestamp (column G)
    ];
    
    console.log('Row data prepared with key:', rowData);
    
    // Find the next empty row and append the data
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    console.log('Writing to row:', newRowNumber);
    
    // Insert the data
    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);
    console.log('Data written to sheet successfully');
    
    // Format timestamp column
    sheet.getRange(newRowNumber, 7).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Format key column to be bold
    sheet.getRange(newRowNumber, 1).setFontWeight('bold');
    
    // Auto-resize rows to fit content
    sheet.autoResizeRows(newRowNumber, 1);
    
    // Log success
    console.log('Successfully created force with key:', forceKey);
    
    // Return success response with the key
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Force created successfully',
        key: forceKey,
        rowNumber: newRowNumber,
        timestamp: timestamp.toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log the error with more detail
    console.error('Error processing force creation:', error);
    console.error('Error stack:', error.stack);
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    
    // Ensure sheet has correct structure before any GET operation
    ensureSheetStructure();
    
    switch(action) {
      case 'list':
        return getForcesList(e.parameter);
      case 'get':
        return getForceByKey(e.parameter.key);
      case 'get-by-name':
        return getForceByName(e.parameter.name, e.parameter.user);
      case 'user-forces':
        return getUserForces(e.parameter.user);
      default:
        return getForcesList(e.parameter);
    }
    
  } catch (error) {
    console.error('Error handling GET request:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureSheetStructure() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return; // Sheet will be created when needed
    }
    
    // Check if first row has Key column
    if (sheet.getLastRow() > 0) {
      const firstCell = sheet.getRange(1, 1).getValue();
      if (firstCell !== 'Key') {
        console.log('Sheet needs structure update - first column is not Key');
        
        // Get all existing data
        const existingData = sheet.getDataRange().getValues();
        
        // Clear and rebuild with Key column
        sheet.clear();
        
        // Add proper headers
        const headers = ['Key', 'User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        
        // Format headers
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#4ecdc4');
        headerRange.setFontColor('#ffffff');
        
        // Migrate data if it exists (skip header row)
        if (existingData.length > 1) {
          const migratedData = [];
          for (let i = 1; i < existingData.length; i++) {
            const row = existingData[i];
            const userName = row[0] || '';
            const forceName = row[1] || '';
            const forceKey = generateForceKey(forceName, userName);
            
            migratedData.push([
              forceKey,
              userName,
              forceName,
              row[2] || '', // Faction
              row[3] || '', // Detachment
              row[4] || '', // Notes
              row[5] || new Date() // Timestamp
            ]);
          }
          
          if (migratedData.length > 0) {
            sheet.getRange(2, 1, migratedData.length, 7).setValues(migratedData);
            
            // Format timestamp column
            sheet.getRange(2, 7, migratedData.length, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
            
            // Format key column
            sheet.getRange(2, 1, migratedData.length, 1).setFontWeight('bold');
            
            console.log(`Migrated ${migratedData.length} forces to new structure`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring sheet structure:', error);
  }
}

function getForcesList(params = {}) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      // Return empty array with headers if sheet doesn't exist
      return ContentService
        .createTextOutput(JSON.stringify([
          ['Key', 'User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp']
        ]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    console.log('getForcesList - Total rows found:', data.length);
    
    // Return raw data for compatibility with existing sheets system
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting forces list:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getForceByKey(forceKey) {
  try {
    console.log('getForceByKey called with:', forceKey);
    
    if (!forceKey) {
      throw new Error('Force key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Forces sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find the force by key (Key is in column 0)
    const forceRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header
      return row[0] === forceKey; // Key column
    });
    
    if (!forceRow) {
      throw new Error(`Force with key "${forceKey}" not found`);
    }
    
    // Convert to object
    const force = {};
    headers.forEach((header, index) => {
      force[header] = forceRow[index];
    });
    
    console.log('getForceByKey - Found force:', force);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: force
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting force by key:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getForceByName(forceName, userName) {
  try {
    console.log('getForceByName called with:', forceName, userName);
    
    if (!forceName) {
      throw new Error('Force name is required');
    }
    
    // Generate the key from name and user
    const forceKey = generateForceKey(forceName, userName || '');
    
    // Use the key-based lookup
    return getForceByKey(forceKey);
    
  } catch (error) {
    console.error('Error getting force by name:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getUserForces(userName) {
  try {
    console.log('getUserForces called for:', userName);
    
    if (!userName) {
      throw new Error('User name is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          forces: []
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Filter for this user's forces (User Name is now column 1)
    const userForces = data.slice(1)
      .filter(row => row[1] && row[1].toString().toLowerCase().trim() === userName.toLowerCase().trim())
      .map(row => {
        const force = {};
        headers.forEach((header, index) => {
          force[header] = row[index];
        });
        return force;
      });
    
    console.log(`Found ${userForces.length} forces for user "${userName}"`);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        forces: userForces
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting user forces:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test functions
function testForcesScript() {
  console.log('=== Testing Forces Script ===');
  
  try {
    // First ensure structure
    ensureSheetStructure();
    
    // Test getting all forces
    const allForces = getForcesList({});
    console.log('All forces result:', JSON.parse(allForces.getContent()));
    
    // Test key generation
    const testKey = generateForceKey('Ultramarines 2nd Company', 'John Smith');
    console.log('Test key generation:', testKey);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

function debugForcesSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Spreadsheet name:', spreadsheet.getName());
    
    const sheets = spreadsheet.getSheets();
    console.log('Available sheets:');
    sheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.getName()} (${sheet.getLastRow()} rows, ${sheet.getLastColumn()} columns)`);
    });
    
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (sheet) {
      console.log(`Using sheet: ${SHEET_NAME}`);
      const data = sheet.getDataRange().getValues();
      console.log('Headers:', data[0]);
      console.log(`Sample data (first 3 rows):`, data.slice(0, 3));
    } else {
      console.log(`Sheet "${SHEET_NAME}" not found!`);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}