// filename: xref-army-units-gas-script.js
// Google Apps Script for Army_Units Junction Table
// Deploy this as a web app

const SPREADSHEET_ID = '1PAINakiIbzCyB34AN06lOeBe5vLdFpKo9YWSlyq-wlg';
const SHEET_NAME = 'xref_army_units';

// Cascade delete function - soft deletes all xref records when a parent record is deleted
function cascadeDeleteByParent(parentTable, parentKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    console.log('Army units sheet not found');
    return { success: true, message: 'No xref records to clean up' };
  }
  
  const allData = sheet.getDataRange().getValues();
  if (allData.length <= 1) {
    return { success: true, message: 'No xref records to clean up' };
  }
  
  const headers = allData[0];
  const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
  
  // Determine which column to check based on parent table
  let parentKeyColumn = -1;
  if (parentTable === 'armies') {
    parentKeyColumn = headers.indexOf('army_key');
  } else if (parentTable === 'units') {
    parentKeyColumn = headers.indexOf('unit_key');
  }
  
  if (parentKeyColumn === -1) {
    console.log(`Unknown parent table: ${parentTable}`);
    return { success: true, message: 'Unknown parent table' };
  }
  
  let deletedCount = 0;
  const deletedTimestamp = new Date();
  
  // Find and soft-delete all matching records
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[parentKeyColumn] === parentKey && 
        (!row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')) {
      // Soft delete this record
      sheet.getRange(i + 1, deletedTimestampIndex + 1).setValue(deletedTimestamp);
      sheet.getRange(i + 1, deletedTimestampIndex + 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
      deletedCount++;
    }
  }
  
  console.log(`Cascade deleted ${deletedCount} xref records for ${parentTable}:${parentKey}`);
  return { success: true, message: `Cascade deleted ${deletedCount} xref records` };
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

    // Handle cascade delete operation
    if (data.operation === 'cascade_delete') {
      const result = cascadeDeleteByParent(data.parent_table, data.parent_key);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default operation is create army-unit relationships
    console.log('Processing army-unit relationships with data:', data);
    
    let { armyKey, unitKeys } = data;
    
    // If unitKeys is a string (from URL parameters), parse it as JSON
    if (typeof unitKeys === 'string') {
      try {
        unitKeys = JSON.parse(unitKeys);
        console.log('Parsed unitKeys from string:', unitKeys);
      } catch (parseError) {
        console.error('Failed to parse unitKeys JSON:', parseError);
        throw new Error('Invalid unitKeys format');
      }
    }
    
    if (!armyKey || !unitKeys || !Array.isArray(unitKeys)) {
      console.error('Validation failed - armyKey:', armyKey, 'unitKeys:', unitKeys, 'isArray:', Array.isArray(unitKeys));
      throw new Error('armyKey and unitKeys array are required');
    }
    
    console.log('Validation passed, processing relationships for army:', armyKey, 'with', unitKeys.length, 'units');

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating army units sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      const headers = ['army_key', 'unit_key', 'timestamp', 'deleted_timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
    }

    const timestamp = new Date();
    
    // Create rows for each unit key
    if (unitKeys.length > 0) {
      const rows = unitKeys.map(unitKey => [
        armyKey,
        unitKey.trim(),
        timestamp,
        '' // Deleted Timestamp
      ]);

      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rows.length, 4).setValues(rows);
      
      console.log('Successfully created', unitKeys.length, 'army-unit relationships');
    }

    // Log success
    console.log('Successfully processed army-unit relationships for army:', armyKey);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Army-Unit relationships created',
        count: unitKeys.length
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in army-units doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    
    switch(action) {
      case 'list':
        return getArmyUnitsList();
      default:
        return getArmyUnitsList();
    }
      
  } catch (error) {
    console.error('Error in army-units doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getArmyUnitsList() {
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
    const headers = data[0];
    const deletedTimestampIndex = headers.indexOf('deleted_timestamp');
    
    let activeRows;
    if (deletedTimestampIndex === -1) {
      activeRows = data;
    } else {
      activeRows = [headers].concat(
        data.slice(1).filter(row => !row[deletedTimestampIndex] || row[deletedTimestampIndex] === '')
      );
    }
    
    const rows = activeRows.slice(1);
    
    console.log('getArmyUnitsList - Total active rows found:', rows.length);
    console.log('getArmyUnitsList - Headers:', headers);
    
    // Convert to objects with consistent field names
    const armyUnits = rows.map((row) => {
      const obj = {};
      
      headers.forEach((header, headerIndex) => {
        obj[header] = row[headerIndex];
      });
      
      return obj;
    });
    
    console.log('getArmyUnitsList - Returning army-units:', armyUnits.map(armyUnit => ({ 
      armyKey: armyUnit['army_key'], 
      unitKey: armyUnit['unit_key']
    })));
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        count: armyUnits.length,
        totalCount: armyUnits.length,
        data: armyUnits,
        hasMore: false
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting army-units list:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
