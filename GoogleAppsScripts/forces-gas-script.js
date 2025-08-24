// filename: forces-gas-script.js
// Google Apps Script for Forces Sheet
// Deploy this as a web app to handle force creation and retrieval

const SPREADSHEET_ID = '13n56kfJPSMoeV9VyiTXYajWT1LuBmnpj2oSwcek_osg';
const SHEET_NAME = 'Forces';

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
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating new sheet:', SHEET_NAME);
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      // Add headers
      const headers = ['User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
      
      // Set column widths
      sheet.setColumnWidth(1, 150); // User Name
      sheet.setColumnWidth(2, 200); // Force Name
      sheet.setColumnWidth(3, 150); // Faction
      sheet.setColumnWidth(4, 150); // Detachment
      sheet.setColumnWidth(5, 300); // Notes
      sheet.setColumnWidth(6, 150); // Timestamp
      
      console.log('Created new sheet with headers');
    }
    
    // Check if force already exists for this user
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    const existingForce = values.find((row, index) => {
      if (index === 0) return false; // Skip header
      return row[0] === data.userName && row[1] === data.forceName;
    });
    
    if (existingForce) {
      console.log('Force already exists for this user');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'A force with this name already exists for this user'
        }))
        .setMimeType(ContentService.MimeType.JSON);
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
      data.userName,                           // User Name
      data.forceName,                          // Force Name
      data.faction,                            // Faction
      data.detachment || '',                   // Detachment
      data.notes || '',                        // Notes
      timestamp                                 // Timestamp
    ];
    
    console.log('Row data prepared:', rowData);
    
    // Find the next empty row and append the data
    const lastRow = sheet.getLastRow();
    const newRowNumber = lastRow + 1;
    console.log('Writing to row:', newRowNumber);
    
    // Insert the data
    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);
    console.log('Data written to sheet successfully');
    
    // Format timestamp column
    sheet.getRange(newRowNumber, 6).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Auto-resize rows to fit content
    sheet.autoResizeRows(newRowNumber, 1);
    
    // Log success
    console.log('Successfully created force:', data.forceName, 'for user:', data.userName);
    
    // Return success response (without setHeaders which isn't supported)
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Force created successfully',
        rowNumber: newRowNumber,
        timestamp: timestamp.toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log the error with more detail
    console.error('Error processing force creation:', error);
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
  try {
    const action = e.parameter.action || 'list';
    
    switch(action) {
      case 'list':
        return getForcesList(e.parameter);
      case 'get':
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

function getForcesList(params = {}) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      // Return empty array with headers if sheet doesn't exist
      return ContentService
        .createTextOutput(JSON.stringify([
          ['User Name', 'Force Name', 'Faction', 'Detachment', 'Notes', 'Timestamp']
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

function getForceByName(forceName, userName) {
  try {
    console.log('getForceByName called with:', forceName, userName);
    
    if (!forceName) {
      throw new Error('Force name is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Forces sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find the force by name and optionally by user
    const forceRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header
      
      const rowForceName = row[1]; // Force Name column
      const rowUserName = row[0];  // User Name column
      
      if (!rowForceName) return false;
      
      // Case-insensitive comparison
      const forceMatches = rowForceName.toString().toLowerCase().trim() === 
                          forceName.toLowerCase().trim();
      
      // If userName provided, also check that
      if (userName) {
        const userMatches = rowUserName.toString().toLowerCase().trim() === 
                           userName.toLowerCase().trim();
        return forceMatches && userMatches;
      }
      
      return forceMatches;
    });
    
    if (!forceRow) {
      throw new Error(`Force "${forceName}" not found`);
    }
    
    // Convert to object
    const force = {};
    headers.forEach((header, index) => {
      force[header] = forceRow[index];
    });
    
    console.log('getForceByName - Found force:', force);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: force
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
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
    
    // Filter for this user's forces
    const userForces = data.slice(1)
      .filter(row => row[0] && row[0].toString().toLowerCase().trim() === userName.toLowerCase().trim())
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
    // Test getting all forces
    const allForces = getForcesList({});
    console.log('All forces result:', JSON.parse(allForces.getContent()));
    
    // Test creating a force (commented out to avoid creating test data)
    // const testForce = {
    //   userName: 'Test User',
    //   forceName: 'Test Marines',
    //   faction: 'Space Marines',
    //   detachment: 'Gladius Task Force',
    //   notes: 'Test force for development'
    // };
    // const createResult = doPost({ parameter: testForce });
    // console.log('Create force result:', JSON.parse(createResult.getContent()));
    
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