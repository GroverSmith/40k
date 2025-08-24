// filename: army-gas-script.js
// Google Apps Script for Army List Form Submissions
// Deploy this as a web app to handle form submissions


const SPREADSHEET_ID = '1f_tnBT7tNLc4HtJpcOclg829vg0hahYayXcuIBcPrXE'; 
const SHEET_NAME = 'Army Lists'; // Name of the sheet tab for army lists

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
    
    // Log the spreadsheet ID being used
    console.log('Using spreadsheet ID:', SPREADSHEET_ID);
    console.log('Using sheet name:', SHEET_NAME);
    
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
      
      // Add header row
      const headers = [
        'Timestamp',
        'User Name',
        'Force Name', 
        'Army Name',
        'Faction',
        'Detachment',
        'MFM Version',
        'Points Value',
        'Notes',
        'Army List Text'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 150); // Timestamp
      sheet.setColumnWidth(2, 150); // User Name
      sheet.setColumnWidth(3, 200); // Force Name
      sheet.setColumnWidth(4, 200); // Army Name
      sheet.setColumnWidth(5, 120); // Faction
      sheet.setColumnWidth(6, 120); // Detachment
      sheet.setColumnWidth(7, 100); // MFM Version
      sheet.setColumnWidth(8, 100); // Points Value
      sheet.setColumnWidth(9, 300); // Notes
      sheet.setColumnWidth(10, 400); // Army List Text (will auto-expand)
      
      console.log('Created new sheet with headers');
    }
    
    // Parse timestamp - handle both ISO string and direct timestamp
    let timestamp;
    if (data.timestamp) {
      timestamp = new Date(data.timestamp);
    } else {
      timestamp = new Date(); // Use current time if not provided
    }
    console.log('Using timestamp:', timestamp);
    
    // Prepare the row data
    const rowData = [
      timestamp,                   // Timestamp
      data.userName,               // User Name
      data.forceName,              // Force Name
      data.armyName,               // Army Name
      data.faction || '',          // Faction
      data.detachment || '',       // Detachment
      data.mfmVersion || '',       // MFM Version
      data.pointsValue || '',      // Points Value
      data.notes || '',            // Notes
      data.armyListText            // Army List Text
    ];
    
    console.log('Row data prepared - first few fields:', [
      timestamp, 
      data.userName, 
      data.forceName, 
      data.armyName, 
      data.faction
    ]);
    
    // Find the next empty row and append the data
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    console.log('Writing to row:', newRowNumber);
    
    // Insert the data
    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);
    console.log('Data written to sheet successfully');
    
    // Format the new row
    sheet.getRange(newRowNumber, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Format points column as number
    if (data.pointsValue) {
      sheet.getRange(newRowNumber, 8).setNumberFormat('#,##0');
    }
    
    // Set text wrapping for notes and army list text columns
    sheet.getRange(newRowNumber, 9).setWrap(true);  // Notes
    sheet.getRange(newRowNumber, 10).setWrap(true); // Army List Text
    
    // Auto-resize row height to fit content
    sheet.autoResizeRows(newRowNumber, 1);
    
    // Log success
    console.log('Successfully added army list:', data.armyName, 'for force:', data.forceName);
    
    // Return success response (without setHeaders which isn't supported)
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Army list submitted successfully',
        rowNumber: newRowNumber,
        timestamp: timestamp.toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log the error with more detail
    console.error('Error processing army list submission:', error);
    console.error('Error stack:', error.stack);
    
    // Return error response (without setHeaders)
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
        return getArmyListById(e.parameter.id);
      case 'test':
        return getRecentArmyLists(); // The original test functionality
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
  const { force, limit, offset } = params;
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Army Lists sheet not found');
  }
  
  // Get all data
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let rows = data.slice(1);
  
  console.log('getArmyLists - Total rows found:', rows.length);
  console.log('getArmyLists - Headers:', headers);
  console.log('getArmyLists - Filter for force:', force);
  
  // Filter by force name if specified (Force Name is now column 2, index 2)
  if (force) {
    const originalRowCount = rows.length;
    rows = rows.filter(row => 
      row[2] && row[2].toString().toLowerCase().trim() === force.toLowerCase().trim()
    );
    console.log(`getArmyLists - Filtered from ${originalRowCount} to ${rows.length} rows for force "${force}"`);
    
    // Debug: show what force names are available
    if (rows.length === 0) {
      const availableForces = data.slice(1).map(row => row[2]).filter(name => name);
      console.log('getArmyLists - Available forces in sheet:', availableForces);
    }
  }
  
  // Apply pagination if specified
  const startIndex = parseInt(offset) || 0;
  const maxResults = parseInt(limit) || rows.length;
  const paginatedRows = rows.slice(startIndex, startIndex + maxResults);
  
  // Convert to objects with CORRECT ID mapping
  const armyLists = paginatedRows.map((row, index) => {
    // FIXED: Calculate the correct row number in the original sheet
    // We need to account for:
    // 1. Header row (+1)
    // 2. Original row position in filtered data
    // 3. Current position in paginated data
    
    // Find the original row index by matching the data
    const originalRowIndex = data.findIndex(dataRow => 
      dataRow[1] === row[1] && // User Name
      dataRow[2] === row[2] && // Force Name  
      dataRow[3] === row[3] && // Army Name
      dataRow[0] && row[0] && new Date(dataRow[0]).getTime() === new Date(row[0]).getTime() // Timestamp match
    );
    
    // The sheet row number is originalRowIndex + 1 (because sheet rows are 1-indexed, not 0-indexed)
    const sheetRowNumber = originalRowIndex > 0 ? originalRowIndex + 1 : null;
    
    console.log(`Army list "${row[3]}" - Array index: ${originalRowIndex}, Sheet row: ${sheetRowNumber}`);
    
    const obj = { 
      id: sheetRowNumber // This is the ACTUAL row number in the Google Sheet
    };
    
    headers.forEach((header, headerIndex) => {
      obj[header] = row[headerIndex];
    });
    
    return obj;
  });
  
  console.log('getArmyLists - Final army lists with IDs:', armyLists.map(list => ({ 
    name: list['Army Name'], 
    id: list.id, 
    force: list['Force Name'] 
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

function getArmyListById(id) {
  // Get a specific army list by row ID
  console.log('getArmyListById called with ID:', id);
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Army Lists sheet not found');
  }
  
  const rowNumber = parseInt(id);
  if (!rowNumber || rowNumber < 2) {
    console.error('Invalid army list ID:', id);
    throw new Error('Invalid army list ID: ' + id);
  }
  
  // Check if the row number is within the valid range
  const lastRow = sheet.getLastRow();
  if (rowNumber > lastRow) {
    console.error(`Row ${rowNumber} does not exist. Sheet has ${lastRow} rows.`);
    throw new Error('Army list not found - row does not exist');
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  console.log('getArmyListById - Headers:', headers);
  console.log('getArmyListById - Row data:', rowData);
  
  if (!rowData || rowData.every(cell => !cell)) {
    console.error('Empty row data for row:', rowNumber);
    throw new Error('Army list not found - empty row');
  }
  
  // Convert to object
  const armyList = { id: rowNumber };
  headers.forEach((header, index) => {
    armyList[header] = rowData[index];
  });
  
  console.log('getArmyListById - Final army list object:', armyList);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: armyList
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRecentArmyLists() {
  // Original functionality for testing - get recent entries
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: 'Army Lists sheet not found'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get all data (limit to recent entries for testing)
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1, 11); // Get last 10 entries for testing
  
  const result = rows.map((row, index) => {
    const obj = { id: index + 2 }; // +2 because we start from row 2 (after header)
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

// Utility function to test the script manually
function testSubmission() {
  const testData = {
    timestamp: new Date().toISOString(),
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
  
  // Also test direct sheet writing
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    console.log('Spreadsheet found:', !!spreadsheet);
    console.log('Sheet found:', !!sheet);
    console.log('Last row:', sheet ? sheet.getLastRow() : 'N/A');
  } catch (error) {
    console.error('Direct sheet access error:', error);
  }
}

// Test function specifically for army list retrieval
function testArmyListRetrieval() {
  console.log('=== Testing Army List Retrieval ===');
  
  try {
    // Test getting all army lists
    const allLists = getArmyLists({});
    console.log('All lists result:', JSON.parse(allLists.getContent()));
    
    // Test getting lists for a specific force (you'll need to update this with an actual force name)
    const forceLists = getArmyLists({ force: 'Test Force' });
    console.log('Force lists result:', JSON.parse(forceLists.getContent()));
    
    // Test getting a specific army list by ID (you'll need to update this with an actual ID)
    const singleList = getArmyListById('2');
    console.log('Single list result:', JSON.parse(singleList.getContent()));
    
  } catch (error) {
    console.error('Test error:', error);
  }
}