// filename: forces-gas-script.js
// Google Apps Script for Forces Sheet with Composite Key System
// Deploy this as a web app to handle force creation and retrieval

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

// Edit function - updates an existing force record
function editForce(forceKey, userKey, data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const forceKeyIndex = headers.indexOf('force_key');
  const userKeyIndex = headers.indexOf('user_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to update (must match both force_key and user_key)
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[forceKeyIndex] === forceKey && row[userKeyIndex] === userKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Force not found or access denied');
  }
  
  // Get the existing row data to preserve fields not being updated
  const existingRow = allData[rowIndex - 1]; // -1 because allData is 0-indexed but rowIndex is 1-indexed
  const existingData = {};
  headers.forEach((header, index) => {
    existingData[header] = existingRow[index];
  });
  
  console.log('editForce - Existing data:', existingData);
  console.log('editForce - Update data:', data);
  
  // Prepare updated row data, preserving existing values for fields not provided
  const timestamp = new Date();
  const updatedRowData = [
    forceKey,                                // force_key (column A)
    userKey,                                 // user_key (column B)
    data.hasOwnProperty('user_name') ? data.user_name : existingData.user_name,                          // user_name (column C)
    data.hasOwnProperty('force_name') ? data.force_name : existingData.force_name,                         // force_name (column D)
    data.hasOwnProperty('faction') ? data.faction : existingData.faction,                            // faction (column E)
    data.hasOwnProperty('detachment') ? (data.detachment || '') : (existingData.detachment || ''),                   // detachment (column F)
    data.hasOwnProperty('supply_limit') ? (data.supply_limit || 1000) : (existingData.supply_limit || 1000),               // supply_limit (column G)
    data.hasOwnProperty('mfm_version') ? (data.mfm_version || '3.3') : (existingData.mfm_version || '3.3'),               // mfm_version (column H)
    data.hasOwnProperty('notes') ? (data.notes || '') : (existingData.notes || ''),                        // notes (column I)
    timestamp,                               // timestamp (column J)
    ''                                       // deleted_timestamp (column K) - keep empty
  ];
  
  console.log('editForce - Final updated row data:', updatedRowData);
  
  // Update the row
  sheet.getRange(rowIndex, 1, 1, updatedRowData.length).setValues([updatedRowData]);
  sheet.getRange(rowIndex, 10).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  return { success: true, message: 'Force updated successfully' };
}

// Delete function - soft deletes a force record
function deleteForce(forceKey, userKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const forceKeyIndex = headers.indexOf('force_key');
  const userKeyIndex = headers.indexOf('user_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to delete (must match both force_key and user_key)
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[forceKeyIndex] === forceKey && row[userKeyIndex] === userKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Force not found or access denied');
  }
  
  // Set deleted timestamp
  const deletedTimestamp = new Date();
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setValue(deletedTimestamp);
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  // Trigger cascade deletion in xref tables
  try {
    // Delete from crusade participants
    const crusadeParticipantsUrl = 'https://script.google.com/macros/s/AKfycbx79dYbG5yCDKa-kz0iKPlJowWekbJkhmJRNIJ5b0HjcVfV1JXrJqqeIejxDpHoWzsIZg/exec';
    UrlFetchApp.fetch(crusadeParticipantsUrl, {
      method: 'POST',
      payload: JSON.stringify({
        operation: 'cascade_delete',
        parent_table: 'forces',
        parent_key: forceKey
      }),
      contentType: 'application/json'
    });
    
    // Delete from story forces
    const storyForcesUrl = 'https://script.google.com/macros/s/AKfycbx1KvSAWcliHW0xTxq4kP9cJn2yeW9Oh72nHb7c7q8ThdRWx5ZS6lA_8hyW-yqufqw/exec';
    UrlFetchApp.fetch(storyForcesUrl, {
      method: 'POST',
      payload: JSON.stringify({
        operation: 'cascade_delete',
        parent_table: 'forces',
        parent_key: forceKey
      }),
      contentType: 'application/json'
    });
  } catch (cascadeError) {
    console.error('Cascade deletion error:', cascadeError);
    // Don't fail the main deletion if cascade fails
  }
  
  return { success: true, message: 'Force deleted successfully' };
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
      if (!data.force_key || !data.user_key) {
        throw new Error('force_key and user_key are required for edit operation');
      }
      const result = editForce(data.force_key, data.user_key, data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'delete') {
      if (!data.force_key || !data.user_key) {
        throw new Error('force_key and user_key are required for delete operation');
      }
      const result = deleteForce(data.force_key, data.user_key);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default operation is create
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
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating new sheet:', SHEET_NAME);
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      // Only add headers to completely new sheets
      const headers = ['force_key', 'user_key', 'user_name', 'force_name', 'faction', 'detachment', 'supply_limit', 'mfm_version', 'notes', 'timestamp', 'deleted_timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
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
      data.supply_limit || 1000,               // supply_limit (column G)
      data.mfm_version || '3.3',               // mfm_version (column H)
      data.notes || '',                        // notes (column I)
      timestamp,                                // timestamp (column J)
      ''                                        // deleted_timestamp (column K) - empty for new records
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
    sheet.getRange(newRowNumber, 10).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
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
    // ensureSheetStructure(); // Removed - no dynamic column addition
    
    switch(action) {
      case 'list':
        return getForcesList(e.parameter);
      case 'get':
        return getForceByKey(e.parameter.key);
      case 'get-by-name':
        return getForceByName(e.parameter.name, e.parameter.user);
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

// Helper function removed - no dynamic column addition

function getForcesList(params = {}) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      // Return empty standardized format if sheet doesn't exist
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          count: 0,
          totalCount: 0,
          data: [],
          hasMore: false
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Filter out deleted rows
    const activeData = filterActiveRows(data);
    
    const headers = activeData[0];
    let rows = activeData.slice(1);
    
    console.log('getForcesList - Total active rows found:', rows.length);
    console.log('getForcesList - Headers:', headers);
    
    // Convert to objects with consistent field names
    const forces = rows.map((row) => {
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
    
    console.log('getForcesList - Returning forces with keys:', forces.map(force => ({ 
      name: force['Force Name'] || force.force_name, 
      key: force.key, 
      user: force['User Name'] || force.user_name
    })));
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        count: forces.length,
        totalCount: forces.length,
        data: forces,
        hasMore: false
      }))
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
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
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
    
    // Find deleted_timestamp column index
    let deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // If column doesn't exist, throw error instead of adding it
    if (deletedTimestampIndex === -1) {
      throw new Error('deleted_timestamp column not found in sheet structure');
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
// Test and debug functions removed - no longer needed