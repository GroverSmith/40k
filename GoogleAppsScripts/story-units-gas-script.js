// filename: story-units-gas-script.js
// Google Apps Script for Story_Units Junction Table
// Deploy this as a web app

const SPREADSHEET_ID = '1YbPSfXMJro_x9d1W18RyZ4MQyfhoOwjgtDR0RhSju1E';
const SHEET_NAME = 'xref_story_units';

// Cascade delete function - soft deletes all xref records when a parent record is deleted
function cascadeDeleteByParent(parentTable, parentKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    console.log('Story units sheet not found');
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
  if (parentTable === 'stories') {
    parentKeyColumn = headers.indexOf('story_key');
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
    let data;

    if (e.parameter) {
      data = e.parameter;
    } else if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonError) {
        throw new Error('Invalid data format');
      }
    } else {
      throw new Error('No data received');
    }

    // Handle cascade delete operation
    if (data.operation === 'cascade_delete') {
      const result = cascadeDeleteByParent(data.parent_table, data.parent_key);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default operation is create story-unit relationships
    const { storyKey, unitKeys } = data;
    
    if (!storyKey || !unitKeys || !Array.isArray(unitKeys)) {
      throw new Error('storyKey and unitKeys array are required');
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating story units sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      
      const headers = ['story_key', 'unit_key', 'timestamp', 'deleted_timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
    }

    const timestamp = new Date();
    
    // Create rows for each unit key
    if (unitKeys.length > 0) {
      const rows = unitKeys.map(unitKey => [
        storyKey,
        unitKey.trim(),
        timestamp,
        '' // Deleted Timestamp
      ]);

      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rows.length, 4).setValues(rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Story-Unit relationships created',
        count: unitKeys.length
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in story-units doPost:', error);
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
        return getStoryUnitsList();
      default:
        return getStoryUnitsList();
    }
      
  } catch (error) {
    console.error('Error in story-units doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getStoryUnitsList() {
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
    
    console.log('getStoryUnitsList - Total active rows found:', rows.length);
    console.log('getStoryUnitsList - Headers:', headers);
    
    // Convert to objects with consistent field names
    const storyUnits = rows.map((row) => {
      const obj = {};
      
      headers.forEach((header, headerIndex) => {
        obj[header] = row[headerIndex];
      });
      
      return obj;
    });
    
    console.log('getStoryUnitsList - Returning story-units:', storyUnits.map(storyUnit => ({ 
      storyKey: storyUnit['story_key'], 
      unitKey: storyUnit['unit_key']
    })));
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        count: storyUnits.length,
        totalCount: storyUnits.length,
        data: storyUnits,
        hasMore: false
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting story-units list:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
