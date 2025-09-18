// filename: requisitions-gas-script.js
// Google Apps Script for Requisitions Sheet
// Deploy this as a web app to handle requisition creation and retrieval

const SPREADSHEET_ID = '1nBxgMlp1MZo5Ia9C53vmTmHKsStHVrJxZS-AtcRdjMc';
const SHEET_NAME = 'requisitions';

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


// Key generation function
// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate unique requisition key using UUID
function generateRequisitionKey() {
  return generateUUID();
}

// Edit function - updates an existing requisition record
function editRequisition(requisitionKey, data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const requisitionKeyIndex = headers.indexOf('requisition_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to update
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[requisitionKeyIndex] === requisitionKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Requisition not found');
  }
  
  // Prepare updated row data
  const timestamp = new Date();
  const updatedRowData = [
    requisitionKey,                           // requisition_key (column A)
    data.force_key,                           // force_key (column B)
    data.rp_change,                           // rp_change (column C)
    data.event_name,                          // event_name (column D)
    data.notes || '',                         // notes (column E)
    timestamp,                                // timestamp (column F)
    ''                                        // deleted_timestamp (column G) - keep empty
  ];
  
  // Update the row
  sheet.getRange(rowIndex, 1, 1, updatedRowData.length).setValues([updatedRowData]);
  sheet.getRange(rowIndex, 6).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  return { success: true, message: 'Requisition updated successfully' };
}

// Delete function - soft deletes a requisition record
function deleteRequisition(requisitionKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const requisitionKeyIndex = headers.indexOf('requisition_key');
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Find the row to delete
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[requisitionKeyIndex] === requisitionKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Requisition not found');
  }
  
  // Set deleted timestamp
  const deletedTimestamp = new Date();
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setValue(deletedTimestamp);
  sheet.getRange(rowIndex, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  
  return { success: true, message: 'Requisition deleted successfully' };
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
      if (!data.requisition_key) {
        throw new Error('requisition_key is required for edit operation');
      }
      const result = editRequisition(data.requisition_key, data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'delete') {
      if (!data.requisition_key) {
        throw new Error('requisition_key is required for delete operation');
      }
      const result = deleteRequisition(data.requisition_key);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default operation is create
    // Validate required fields
    if (!data.force_key || !data.rp_change || !data.event_name) {
      const missing = [];
      if (!data.force_key) missing.push('force_key');
      if (!data.rp_change === undefined || data.rp_change === null) missing.push('rp_change');
      if (!data.event_name) missing.push('event_name');
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
      const headers = ['requisition_key', 'force_key', 'rp_change', 'event_name', 'notes', 'timestamp', 'deleted_timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
    }
    
    // Parse timestamp
    let timestamp;
    if (data.timestamp) {
      timestamp = new Date(data.timestamp);
    } else {
      timestamp = new Date();
    }
    console.log('Using timestamp:', timestamp);
    
    // Generate the requisition key
    const requisitionKey = generateRequisitionKey();
    console.log('Generated requisition key:', requisitionKey);
    
    // Check if requisition key already exists (and is not deleted)
    if (sheet.getLastRow() > 1) {
      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === requisitionKey) {
          // Check if it's deleted
          if (deletedTimestampIndex !== -1 && allData[i][deletedTimestampIndex]) {
            console.log('Requisition key exists but is deleted, allowing recreation');
          } else {
            console.log('Requisition key already exists and is active:', requisitionKey);
            return ContentService
              .createTextOutput(JSON.stringify({
                success: false,
                error: 'A requisition with this key already exists'
              }))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }
    
    // Prepare the row data with key and deleted timestamp
    const rowData = [
      requisitionKey,                           // requisition_key (column A)
      data.force_key,                           // force_key (column B)
      data.rp_change,                           // rp_change (column C)
      data.event_name,                          // event_name (column D)
      data.notes || '',                         // notes (column E)
      timestamp,                                // timestamp (column F)
      ''                                        // deleted_timestamp (column G) - empty for new records
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
    sheet.getRange(newRowNumber, 6).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Format key column to be bold
    sheet.getRange(newRowNumber, 1).setFontWeight('bold');
    
    // Auto-resize rows to fit content
    sheet.autoResizeRows(newRowNumber, 1);
    
    // Log success
    console.log('Successfully created requisition with key:', requisitionKey);
    
    // Return success response with the key
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Requisition created successfully',
        key: requisitionKey,
        rowNumber: newRowNumber,
        timestamp: timestamp.toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log the error with more detail
    console.error('Error processing requisition creation:', error);
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
    
    switch(action) {
      case 'list':
        return getRequisitionsList(e.parameter);
      case 'get':
        return getRequisitionByKey(e.parameter.key);
      case 'get-by-force':
        return getRequisitionsByForce(e.parameter.force_key);
      case 'delete':
        return softDeleteRequisition(e.parameter.key);
      default:
        return getRequisitionsList(e.parameter);
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

function getRequisitionsList(params = {}) {
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
    
    console.log('getRequisitionsList - Total active rows found:', rows.length);
    console.log('getRequisitionsList - Headers:', headers);
    
    // Apply filtering if force_key is provided
    if (params.force_key) {
      const forceKeyIndex = headers.indexOf('force_key');
      if (forceKeyIndex !== -1) {
        rows = rows.filter(row => row[forceKeyIndex] === params.force_key);
      }
    }
    
    // Convert to objects with consistent field names
    const requisitions = rows.map((row) => {
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
    
    console.log('getRequisitionsList - Returning requisitions with keys:', requisitions.map(req => ({ 
      key: req.key, 
      force: req.force_key,
      event: req.event_name,
      rp_change: req.rp_change
    })));
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        count: requisitions.length,
        totalCount: requisitions.length,
        data: requisitions,
        hasMore: false
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting requisitions list:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getRequisitionByKey(requisitionKey) {
  try {
    console.log('getRequisitionByKey called with:', requisitionKey);
    
    if (!requisitionKey) {
      throw new Error('Requisition key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Requisitions sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Check if row is deleted
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    // Find the requisition by key (Key is in column 0)
    const requisitionRow = data.find((row, index) => {
      if (index === 0) return false; // Skip header
      // Check if not deleted
      if (deletedTimestampIndex !== -1 && row[deletedTimestampIndex]) return false;
      return row[0] === requisitionKey; // Key column
    });
    
    if (!requisitionRow) {
      throw new Error(`Requisition with key "${requisitionKey}" not found or deleted`);
    }
    
    // Convert to object
    const requisition = {};
    headers.forEach((header, index) => {
      requisition[header] = requisitionRow[index];
    });
    
    console.log('getRequisitionByKey - Found requisition:', requisition);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: requisition
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting requisition by key:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getRequisitionsByForce(forceKey) {
  try {
    console.log('getRequisitionsByForce called with:', forceKey);
    
    if (!forceKey) {
      throw new Error('Force key is required');
    }
    
    // Use the list function with force_key filter
    return getRequisitionsList({ force_key: forceKey });
    
  } catch (error) {
    console.error('Error getting requisitions by force:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Soft delete function
function softDeleteRequisition(requisitionKey) {
  try {
    if (!requisitionKey) {
      throw new Error('Requisition key is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Requisitions sheet not found');
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
      if (data[i][0] === requisitionKey) { // Key is in column 0
        // Set the Deleted Timestamp value
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(new Date());
        sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
        
        console.log('Soft deleted requisition:', requisitionKey);
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'Requisition soft deleted successfully',
            key: requisitionKey
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    throw new Error('Requisition not found');
    
  } catch (error) {
    console.error('Error soft deleting requisition:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
