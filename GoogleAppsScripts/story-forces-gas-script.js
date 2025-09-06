// filename: story-forces-gas-script.js
// Google Apps Script for Story_Forces Junction Table
// Deploy this as a web app

const SPREADSHEET_ID = '16IHkhSjjHZoxGFS96VK4Rzpf4xOwU8620R-MNKnxy-0';
const SHEET_NAME = 'xref_story_forces';

// Cascade delete function - soft deletes all xref records when a parent record is deleted
function cascadeDeleteByParent(parentTable, parentKey) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    console.log('Story forces sheet not found');
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
  } else if (parentTable === 'forces') {
    parentKeyColumn = headers.indexOf('force_key');
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
      data = JSON.parse(e.postData.contents);
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

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      const headers = ['Story Key', 'Force Key', 'Timestamp', 'deleted_timestamp'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4ecdc4');
      headerRange.setFontColor('#ffffff');
    }

    // Handle multiple forces for one story
    const storyKey = data.storyKey;
    const forceKeys = data.forceKeys ? data.forceKeys.split(',') : [];
    const timestamp = new Date();

    if (forceKeys.length > 0) {
      const rows = forceKeys.map(forceKey => [
        storyKey,
        forceKey.trim(),
        timestamp,
        '' // Deleted Timestamp
      ]);

      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rows.length, 4).setValues(rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Story-Force relationships created',
        count: forceKeys.length
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
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
      default:
        return getAllRelationships();
    }
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
