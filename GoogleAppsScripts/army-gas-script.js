// filename: army-gas-script.js
// Google Apps Script for Army List Form Submissions with Composite Key System
// Deploy this as a web app to handle form submissions

const SPREADSHEET_ID = '1f_tnBT7tNLc4HtJpcOclg829vg0hahYayXcuIBcPrXE'; 
const SHEET_NAME = 'armies';

// Helper function to filter out deleted rows
function filterActiveRows(data) {
  if (!data || data.length <= 1) return data;
  
  const headers = data[0];
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // If no deleted_timestamp column, return all data
  if (deletedTimestampIndex === -1) return data;
  
  // Filter to only include rows where deleted_timestamp is empty
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

// Key generation functions
function generateForceKey(forceName, userKey) {
  // Match the force key format from forces sheet
  const forcePart = clean(forceName);
  return `${forcePart}_${userKey}`;
}

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate unique army key using UUID
function generateArmyKey() {
  return generateUUID();
}

// Edit function - updates an existing army record
function editArmy(armyKey, userKey, data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const armyKeyIndex = headers.indexOf('army_key');
  const userKeyIndex = headers.indexOf('user_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to update (must match both army_key and user_key)
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[armyKeyIndex] === armyKey && row[userKeyIndex] === userKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Army not found or access denied');
  }
  
  // Prepare updated row data
  const timestamp = new Date();
  const updatedRowData = [
    armyKey,                     // army_key (Primary Key) - Column 0
    data.force_key || '',        // force_key (Foreign Key) - Column 1
    userKey,                     // user_key (Foreign Key) - Column 2
    data.user_name,              // user_name - Column 3
    data.force_name,             // force_name - Column 4
    data.army_name,              // army_name - Column 5
    data.faction || '',          // faction - Column 6
    data.detachment || '',       // detachment - Column 7
    data.mfm_version || '',      // mfm_version - Column 8
    data.points_value || '',     // points_value - Column 9
    data.notes || '',            // notes - Column 10
    data.army_list_text,         // army_list_text - Column 11
    timestamp,                   // timestamp - Column 12
    ''                           // deleted_timestamp - Column 13 (keep empty)
  ];
  
  // Update the row
  sheet.getRange(rowIndex, 1, 1, updatedRowData.length).setValues([updatedRowData]);
  sheet.getRange(rowIndex, 13).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  return { success: true, message: 'Army updated successfully' };
}

// Delete function - soft deletes an army record
function deleteArmy(armyKey, userKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const armyKeyIndex = headers.indexOf('army_key');
  const userKeyIndex = headers.indexOf('user_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to delete (must match both army_key and user_key)
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[armyKeyIndex] === armyKey && row[userKeyIndex] === userKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Army not found or access denied');
  }
  
  // Set deleted timestamp
  const deletedTimestamp = new Date();
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setValue(deletedTimestamp);
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  return { success: true, message: 'Army deleted successfully' };
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
    
    // Handle different operations
    if (data.operation === 'edit') {
      if (!data.army_key || !data.user_key) {
        throw new Error('army_key and user_key are required for edit operation');
      }
      const result = editArmy(data.army_key, data.user_key, data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'delete') {
      if (!data.army_key || !data.user_key) {
        throw new Error('army_key and user_key are required for delete operation');
      }
      const result = deleteArmy(data.army_key, data.user_key);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default operation is create
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
        'army_key',      // Primary key (column 0)
        'force_key',     // Foreign key to Forces sheet (column 1)
        'user_key',      // Foreign key to Users sheet (column 2)
        'user_name',     // Column 3
        'force_name',    // Column 4
        'army_name',     // Column 5
        'faction',       // Column 6
        'detachment',    // Column 7
        'mfm_version',   // Column 8
        'points_value',  // Column 9
        'notes',         // Column 10
        'army_list_text',// Column 11
        'timestamp',     // Column 12
        'deleted_timestamp' // Column 13
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
    const armyKey = generateArmyKey();
    console.log('Generated army key (PK):', armyKey);
    
    // Parse timestamp
    let timestamp;
    if (data.timestamp) {
      timestamp = new Date(data.timestamp);
    } else {
      timestamp = new Date();
    }
    console.log('Using timestamp:', timestamp);
    
    // Prepare the row data to match table-defs.js structure
    const rowData = [
      armyKey,                     // army_key (Primary Key) - Column 0
      forceKey,                    // force_key (Foreign Key) - Column 1
      data.userKey || '',          // user_key (Foreign Key) - Column 2
      data.userName,               // user_name - Column 3
      data.forceName,              // force_name - Column 4
      data.armyName,               // army_name - Column 5
      data.faction || '',          // faction - Column 6
      data.detachment || '',       // detachment - Column 7
      data.mfmVersion || '',       // mfm_version - Column 8
      data.pointsValue || '',      // points_value - Column 9
      data.notes || '',            // notes - Column 10
      data.armyListText,           // army_list_text - Column 11
      timestamp,                   // timestamp - Column 12
      ''                           // deleted_timestamp - Column 13 (empty for new records)
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
    console.log('Successfully added army list with key:', armyKey);
    
    // Return success response with the key
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Army list submitted successfully',
        key: armyKey,
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

function getArmyByKey(armyKey) {
  // Get a specific army list by its key
  console.log('getArmyByKey called with key:', armyKey);
  
  if (!armyKey) {
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
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find by key (Key is column 0)
  const armyListRow = data.find((row, index) => {
    if (index === 0) return false; // Skip header
    // Check if not deleted
    if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
    return row[0] === armyKey;
  });
  
  if (!armyListRow) {
    console.error(`Army list with key "${armyKey}" not found or deleted`);
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
function softDeleteArmy(armyKey) {
  try {
    if (!armyKey) {
      throw new Error('Army list key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Army Lists sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find deleted_timestamp column index
    let deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // If column doesn't exist, throw error instead of adding it
    if (deletedTimestampIndex === -1) {
      throw new Error('deleted_timestamp column not found in sheet structure');
    }
    
    // Find the row with the matching key
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === armyKey) { // Key is in column 0
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted army list:', armyKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Army list soft deleted successfully',
            key: armyKey
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