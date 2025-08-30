// filename: army-gas-script.js
// Google Apps Script for Army List Form Submissions with Composite Key System
// Deploy this as a web app to handle form submissions
// Updated to have Force Key as the second column (between Key and Timestamp)
// Updated to include Deleted Timestamp column for soft deletion

const SPREADSHEET_ID = '1f_tnBT7tNLc4HtJpcOclg829vg0hahYayXcuIBcPrXE'; 
const SHEET_NAME = 'Army Lists';

// Helper function to filter out deleted rows
function filterActiveRows(data) {
  if (!data || data.length <= 1) return data;
  
  const headers = data[0];
  const deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
  
  // If no Deleted Timestamp column, return all data
  if (deletedTimestampIndex === -1) return data;
  
  // Filter to only include rows where Deleted Timestamp is empty
  const activeRows = [headers].concat(
    data.slice(1).filter(row => !row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')
  );
  
  return activeRows;
}

// Key generation functions
function generateForceKey(forceName, userName) {
  // Match the force key format from forces sheet
  const forcePart = forceName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const userPart = userName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  return `${forcePart}_${userPart}`;
}

function generateArmyListKey(forceKey, armyName, sheet) {
  // Generate base key
  const armyPart = armyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  const baseKey = `${forceKey}_${armyPart}`;
  
  // Find the next sequence number
  let sequence = 1;
  if (sheet.getLastRow() > 1) {
    const existingKeys = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const matchingKeys = existingKeys.filter(k => k && k.startsWith(baseKey + '_'));
    
    if (matchingKeys.length > 0) {
      const sequences = matchingKeys.map(k => {
        const parts = k.split('_');
        const seq = parseInt(parts[parts.length - 1]);
        return isNaN(seq) ? 0 : seq;
      });
      sequence = Math.max(...sequences) + 1;
    }
  }
  
  return `${baseKey}_${String(sequence).padStart(2, '0')}`;
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
    if (!data.userName || !data.forceName || !data.armyName || !data.armyListText) {
      const missing = [];
      if (!data.userName) missing.push('userName');
      if (!data.forceName) missing.push('forceName'); 
      if (!data.armyName) missing.push('armyName');
      if (!data.armyListText) missing.push('armyListText');
      throw new Error('Missing required fields: ' + missing.join(', '));
    }
    
    console.log('Validation passed, opening spreadsheet...');
    
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Spreadsheet opened successfully');
    
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    console.log('Sheet found:', !!sheet);
    
    // Create the sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating new sheet:', SHEET_NAME);
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      // Add header row with Force Key as second column and Deleted Timestamp at end
      const headers = [
        'Key',           // Primary key (column 0)
        'Force Key',     // Foreign key to Forces sheet (column 1)
        'Timestamp',     // Column 2
        'User Name',     // Column 3
        'Force Name',    // Column 4
        'Army Name',     // Column 5
        'Faction',       // Column 6
        'Detachment',    // Column 7
        'MFM Version',   // Column 8
        'Points Value',  // Column 9
        'Notes',         // Column 10
        'Army List Text',// Column 11
        'Deleted Timestamp' // Column 12
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 250); // Key
      sheet.setColumnWidth(2, 200); // Force Key
      sheet.setColumnWidth(3, 150); // Timestamp
      sheet.setColumnWidth(4, 150); // User Name
      sheet.setColumnWidth(5, 200); // Force Name
      sheet.setColumnWidth(6, 200); // Army Name
      sheet.setColumnWidth(7, 120); // Faction
      sheet.setColumnWidth(8, 120); // Detachment
      sheet.setColumnWidth(9, 100); // MFM Version
      sheet.setColumnWidth(10, 100); // Points Value
      sheet.setColumnWidth(11, 300); // Notes
      sheet.setColumnWidth(12, 400); // Army List Text
      sheet.setColumnWidth(13, 150); // Deleted Timestamp
      
      console.log('Created new sheet with headers including Force Key as second column and Deleted Timestamp');
    }
    
    // Generate or use provided force key
    let forceKey;
    if (data.forceKey) {
      // Force key provided directly from form
      forceKey = data.forceKey;
      console.log('Using provided force key:', forceKey);
    } else {
      // Generate force key from force name and user name
      forceKey = generateForceKey(data.forceName, data.userName);
      console.log('Generated force key (FK):', forceKey);
    }
    
    // Generate the army list key (primary key)
    const armyListKey = generateArmyListKey(forceKey, data.armyName, sheet);
    console.log('Generated army list key (PK):', armyListKey);
    
    // Parse timestamp
    let timestamp;
    if (data.timestamp) {
      timestamp = new Date(data.timestamp);
    } else {
      timestamp = new Date();
    }
    console.log('Using timestamp:', timestamp);
    
    // Prepare the row data with Force Key as second column
    const rowData = [
      armyListKey,                 // Key (Primary Key) - Column 0
      forceKey,                    // Force Key (Foreign Key) - Column 1
      timestamp,                   // Timestamp - Column 2
      data.userName,               // User Name - Column 3
      data.forceName,              // Force Name - Column 4
      data.armyName,               // Army Name - Column 5
      data.faction || '',          // Faction - Column 6
      data.detachment || '',       // Detachment - Column 7
      data.mfmVersion || '',       // MFM Version - Column 8
      data.pointsValue || '',      // Points Value - Column 9
      data.notes || '',            // Notes - Column 10
      data.armyListText,           // Army List Text - Column 11
      ''                           // Deleted Timestamp - Column 12 (empty for new records)
    ];
    
    console.log('Row data prepared with Force Key as second column');
    
    // Find the next empty row and append the data
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    console.log('Writing to row:', newRowNumber);
    
    // Insert the data
    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);
    console.log('Data written to sheet successfully');
    
    // Format the new row
    sheet.getRange(newRowNumber, 1).setFontWeight('bold'); // Key column
    sheet.getRange(newRowNumber, 2).setFontWeight('bold'); // Force Key column
    sheet.getRange(newRowNumber, 3).setNumberFormat('yyyy-mm-dd hh:mm:ss'); // Timestamp
    
    // Format points column as number
    if (data.pointsValue) {
      sheet.getRange(newRowNumber, 10).setNumberFormat('#,##0');
    }
    
    // Set text wrapping for notes and army list text columns
    sheet.getRange(newRowNumber, 11).setWrap(true);  // Notes
    sheet.getRange(newRowNumber, 12).setWrap(true); // Army List Text
    
    // Auto-resize row height to fit content
    sheet.autoResizeRows(newRowNumber, 1);
    
    // Log success
    console.log('Successfully added army list with key:', armyListKey);
    
    // Return success response with the key
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Army list submitted successfully',
        key: armyListKey,
        forceKey: forceKey,
        rowNumber: newRowNumber,
        timestamp: timestamp.toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log the error with more detail
    console.error('Error processing army list submission:', error);
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
  // Handle GET requests with multiple actions
  try {
    const action = e.parameter.action || 'list';
    
    switch(action) {
      case 'list':
        return getArmyLists(e.parameter);
      case 'get':
        return getArmyListByKey(e.parameter.key);
      case 'force-lists':
        return getArmyListsForForce(e.parameter.forceKey);
      case 'test':
        return getRecentArmyLists();
      case 'delete':
        return softDeleteArmyList(e.parameter.key);
      default:
        return getArmyLists(e.parameter);
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

function getArmyLists(params = {}) {
  // Get army lists with optional filtering
  const { forceKey, limit, offset } = params;
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Army Lists sheet not found');
  }
  
  // Get all data
  const data = sheet.getDataRange().getValues();
  
  // Filter out deleted rows
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  let rows = activeData.slice(1);
  
  console.log('getArmyLists - Total active rows found:', rows.length);
  console.log('getArmyLists - Headers:', headers);
  
  // Filter by force key if specified (Force Key is now column 1)
  if (forceKey) {
    const originalRowCount = rows.length;
    rows = rows.filter(row => row[1] === forceKey); // Force Key is at index 1
    console.log(`getArmyLists - Filtered from ${originalRowCount} to ${rows.length} rows for force key "${forceKey}"`);
  }
  
  // Apply pagination if specified
  const startIndex = parseInt(offset) || 0;
  const maxResults = parseInt(limit) || rows.length;
  const paginatedRows = rows.slice(startIndex, startIndex + maxResults);
  
  // Convert to objects with key as identifier
  const armyLists = paginatedRows.map((row) => {
    const obj = { 
      id: row[0], // Use the key as ID
      key: row[0], // Also include as 'key' for clarity
      Key: row[0]  // Include uppercase for compatibility
    };
    
    headers.forEach((header, headerIndex) => {
      obj[header] = row[headerIndex];
    });
    
    return obj;
  });
  
  console.log('getArmyLists - Returning army lists with keys:', armyLists.map(list => ({ 
    name: list['Army Name'], 
    key: list.key, 
    forceKey: list['Force Key'] 
  })));
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      count: armyLists.length,
      totalCount: rows.length,
      data: armyLists,
      hasMore: startIndex + maxResults < rows.length
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getArmyListByKey(armyListKey) {
  // Get a specific army list by its key
  console.log('getArmyListByKey called with key:', armyListKey);
  
  if (!armyListKey) {
    throw new Error('Army list key is required');
  }
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Army Lists sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Check if row is deleted
  const deletedTimestampIndex = headers.indexOf('Deleted Timestamp');
  
  // Find by key (Key is column 0)
  const armyListRow = data.find((row, index) => {
    if (index === 0) return false; // Skip header
    // Check if not deleted
    if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
    return row[0] === armyListKey;
  });
  
  if (!armyListRow) {
    console.error(`Army list with key "${armyListKey}" not found or deleted`);
    throw new Error('Army list not found');
  }
  
  // Convert to object
  const armyList = { 
    id: armyListRow[0], // Use key as ID
    key: armyListRow[0],
    Key: armyListRow[0] // Include uppercase for compatibility
  };
  headers.forEach((header, index) => {
    armyList[header] = armyListRow[index];
  });
  
  console.log('getArmyListByKey - Found army list:', armyList);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: armyList
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getArmyListsForForce(forceKey) {
  // Get all army lists for a specific force
  console.log('getArmyListsForForce called with force key:', forceKey);
  
  if (!forceKey) {
    throw new Error('Force key is required');
  }
  
  return getArmyLists({ forceKey: forceKey });
}

function getRecentArmyLists() {
  // Get recent entries for testing
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: 'Army Lists sheet not found'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get all data and filter out deleted
  const data = sheet.getDataRange().getValues();
  const activeData = filterActiveRows(data);
  
  const headers = activeData[0];
  const rows = activeData.slice(1, 11); // Get last 10 entries for testing
  
  const result = rows.map((row) => {
    const obj = { 
      id: row[0], // Use key as ID
      key: row[0],
      Key: row[0] // Include uppercase for compatibility
    };
    headers.forEach((header, headerIndex) => {
      obj[header] = row[headerIndex];
    });
    return obj;
  });
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      count: result.length,
      data: result,
      message: 'Recent army lists (test mode)'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Soft delete function
function softDeleteArmyList(armyListKey) {
  try {
    if (!armyListKey) {
      throw new Error('Army list key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Army Lists sheet not found');
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
      if (data[i][0] === armyListKey) { // Key is in column 0
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted army list:', armyListKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Army list soft deleted successfully',
            key: armyListKey
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    throw new Error('Army list not found');
    
  } catch (error) {
    console.error('Error soft deleting army list:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test functions
function testSubmission() {
  const testData = {
    timestamp: new Date().toISOString(),
    forceKey: 'TestForce_TestUser',
    userName: 'Test User',
    forceName: 'Test Force',
    armyName: 'Test Army List',
    faction: 'Space Marines',
    detachment: 'Battalion',
    mfmVersion: '2024.1',
    pointsValue: '1000',
    notes: 'Test notes',
    armyListText: 'This is a test army list with some sample text to verify the submission works correctly.'
  };
  
  // Simulate a form POST request
  const mockEvent = {
    postData: {
      type: 'application/x-www-form-urlencoded',
      contents: null
    },
    parameter: testData
  };
  
  const result = doPost(mockEvent);
  console.log('Test result:', result.getContent());
}

function testArmyListRetrieval() {
  console.log('=== Testing Army List Retrieval ===');
  
  try {
    // Test getting all army lists
    const allLists = getArmyLists({});
    console.log('All lists result:', JSON.parse(allLists.getContent()));
    
    // Test key generation
    const testForceKey = generateForceKey('Test Force', 'Test User');
    console.log('Test force key:', testForceKey);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}