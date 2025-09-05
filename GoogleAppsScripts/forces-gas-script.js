// filename: forces-gas-script.js
// Google Apps Script for Forces Sheet with Composite Key System
// Deploy this as a web app to handle force creation and retrieval
// Updated to include Deleted Timestamp column for soft deletion

const SPREADSHEET_ID = '13n56kfJPSMoeV9VyiTXYajWT1LuBmnpj2oSwcek_osg';
const SHEET_NAME = 'forces';

// Helper function to filter out deleted rows
function filterActiveRows(data) {
  if (!data || data.length <= 1) return data;
  
  const headers = data[0];
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // If no Deleted Timestamp column, return all data
  if (deletedTimestampIndex === -1) return data;
  
  // Filter to only include rows where Deleted Timestamp is empty
  const activeRows = [headers].concat(
    data.slice(1).filter(row => !row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')
  );
  
  return activeRows;
}

// Clean function to remove non-alphanumeric characters and truncate
function clean(text, maxLength = 30) {
  if (!text) return '';
  return String(text).replace(/[^a-zA-Z0-9]/g, '').substring(0, maxLength);
}

// Key generation function
function generateForceKey(force_name, user_key) {
  // Remove spaces and special characters, limit length for readability
  const forcePart = clean(force_name);
  return `${forcePart}_${user_key}`;
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
    if (!data.user_name || !data.force_name || !data.faction) {
      const missing = [];
      if (!data.user_name) missing.push('user_name');
      if (!data.force_name) missing.push('force_name');
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
    
    // Check if sheet has the correct headers (with key column first and deleted_timestamp at end)
    let needsHeaderUpdate = false;
    if (sheet.getLastRow() === 0) {
      needsHeaderUpdate = true;
    } else {
      const firstCell = sheet.getRange(1, 1).getValue();
      if (firstCell !== 'key') {
        needsHeaderUpdate = true;
      }
    }
    
    if (needsHeaderUpdate) {
      console.log('Updating headers to include Key column and Deleted Timestamp');
      
      // If sheet has existing data without key column, we need to migrate it
      if (sheet.getLastRow() > 0 && sheet.getRange(1, 1).getValue() !== 'key') {
        console.log('Migrating existing data to new structure');
        
        // Get existing data
        const existingData = sheet.getDataRange().getValues();
        
        // Clear the sheet
        sheet.clear();
        
        // Set new headers with deleted_timestamp
        const headers = ['key', 'user_key', 'user_name', 'force_name', 'faction', 'detachment', 'notes', 'timestamp', 'deleted_timestamp'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        
        // Migrate existing data with generated keys
        if (existingData.length > 1) {
          const migratedData = [];
          for (let i = 1; i < existingData.length; i++) {
            const row = existingData[i];
            // Assume old structure was: User Name, Force Name, Faction, Detachment, Notes, Timestamp
            const user_name = row[0] || '';
            const force_name = row[1] || '';
            const forceKey = generateForceKey(force_name, user_name);
            
            migratedData.push([
              forceKey,
              '', // user_key (will be populated later)
              user_name,
              force_name,
              row[2] || '', // Faction
              row[3] || '', // Detachment
              row[4] || '', // Notes
              row[5] || new Date(), // Timestamp
              '' // deleted_timestamp (empty for existing records)
            ]);
          }
          
          if (migratedData.length > 0) {
            sheet.getRange(2, 1, migratedData.length, 9).setValues(migratedData);
            console.log(`Migrated ${migratedData.length} existing forces`);
          }
        }
      } else {
        // Just add headers to empty sheet
        const headers = ['key', 'user_key', 'user_name', 'force_name', 'faction', 'detachment', 'notes', 'timestamp', 'deleted_timestamp'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 200); // key
      sheet.setColumnWidth(2, 150); // user_key
      sheet.setColumnWidth(3, 150); // user_name
      sheet.setColumnWidth(4, 200); // force_name
      sheet.setColumnWidth(5, 150); // faction
      sheet.setColumnWidth(6, 150); // detachment
      sheet.setColumnWidth(7, 300); // notes
      sheet.setColumnWidth(8, 150); // timestamp
      sheet.setColumnWidth(9, 150); // deleted_timestamp
    }
    
    // Generate the force key
    const forceKey = generateForceKey(data.force_name, data.user_key);
    console.log('Generated force key:', forceKey);
    
    // Check if force key already exists (and is not deleted)
    if (sheet.getLastRow() > 1) {
      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === forceKey) {
          // Check if it's deleted
          if (deletedTimestampIndex !== -1 && allData[i][deletedTimestampIndex]) {
            console.log('Force key exists but is deleted, allowing recreation');
          } else {
            console.log('Force key already exists and is active:', forceKey);
            return ContentService
              .createTextOutput(JSON.stringify({
                success: false,
                error: 'A force with this name already exists for this user'
              }))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
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
    
    // Prepare the row data with key and deleted timestamp
    const rowData = [
      forceKey,                                // key (column A)
      data.user_key || '',                     // user_key (column B)
      data.user_name,                          // user_name (column C)
      data.force_name,                         // force_name (column D)
      data.faction,                            // faction (column E)
      data.detachment || '',                   // detachment (column F)
      data.notes || '',                        // notes (column G)
      timestamp,                                // timestamp (column H)
      ''                                        // deleted_timestamp (column I) - empty for new records
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
    sheet.getRange(newRowNumber, 8).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
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
      case 'delete':
        return softDeleteForce(e.parameter.key);
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
    
    // Check if Deleted Timestamp column exists
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes('Deleted Timestamp')) {
      const newColumnIndex = sheet.getLastColumn() + 1;
      sheet.getRange(1, newColumnIndex).setValue('Deleted Timestamp');
      sheet.getRange(1, newColumnIndex).setFontWeight('bold');
      sheet.getRange(1, newColumnIndex).setBackground('#4ecdc4');
      sheet.getRange(1, newColumnIndex).setFontColor('#ffffff');
      sheet.setColumnWidth(newColumnIndex, 150);
      console.log('Added Deleted Timestamp column to Forces sheet');
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
          ['Key', 'User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp', 'Deleted Timestamp']
        ]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Filter out deleted rows
    const activeData = filterActiveRows(data);
    
    console.log('getForcesList - Total active rows found:', activeData.length);
    
    // Return raw data for compatibility with existing sheets system
    return ContentService
      .createTextOutput(JSON.stringify(activeData))
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
    
    // Check if row is deleted
    const deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
    
    // Find the force by key (Key is in column 0)
    const forceRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header
      // Check if not deleted
      if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
      return row[0] === forceKey; // Key column
    });
    
    if (!forceRow) {
      throw new Error(`Force with key "${forceKey}" not found or deleted`);
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
    
    // Filter out deleted rows first
    const activeData = filterActiveRows(data);
    
    const headers = activeData[0];
    
    // Filter for this user's forces (User Name is now column 1)
    const userForces = activeData.slice(1)
      .filter(row => row[1] && row[1].toString().toLowerCase().trim() === userName.toLowerCase().trim())
      .map(row => {
        const force = {};
        headers.forEach((header, index) => {
          force[header] = row[index];
        });
        return force;
      });
    
    console.log(`Found ${userForces.length} active forces for user "${userName}"`);
    
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

// Soft delete function
function softDeleteForce(forceKey) {
  try {
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
    
    // Find Deleted Timestamp column index
    let deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
    
    // If column doesn't exist, add it
    if (deletedTimestampIndex === -1) {
      sheet.insertColumnAfter(headers.length);
      sheet.getRange(1, headers.length + 1).setValue('Deleted Timestamp');
      sheet.getRange(1, headers.length + 1).setFontWeight('bold');
      sheet.getRange(1, headers.length + 1).setBackground('#4ecdc4');
      sheet.getRange(1, headers.length + 1).setFontColor('#ffffff');
      deletedTimestampIndex = headers.length;
    }
    
    // Find the row with the matching key
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === forceKey) { // Key is in column 0
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted force:', forceKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Force soft deleted successfully',
            key: forceKey
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    throw new Error('Force not found');
    
  } catch (error) {
    console.error('Error soft deleting force:', error);
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