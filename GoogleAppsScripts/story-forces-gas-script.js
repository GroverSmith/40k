// filename: story-forces-gas-script.js
// Google Apps Script for Story_Forces Junction Table
// Deploy this as a web app

const SPREADSHEET_ID = '16IHkhSjjHZoxGFS96VK4Rzpf4xOwU8620R-MNKnxy-0';
const SHEET_NAME = 'Story_Forces';

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

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      const headers = ['Story Key', 'Force Key', 'Timestamp', 'Deleted Timestamp'];
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
      case 'forces-for-story':
        return getForcesForStory(e.parameter.storyKey);
      case 'stories-for-force':
        return getStoriesForForce(e.parameter.forceKey);
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

function getForcesForStory(storyKey) {
  if (!storyKey) throw new Error('Story key required');

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
  const forceKeys = data
    .slice(1)
    .filter(row => row[0] === storyKey && !row[3])
    .map(row => row[1]);

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      forces: forceKeys
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStoriesForForce(forceKey) {
  if (!forceKey) throw new Error('Force key required');

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        stories: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const storyKeys = data
    .slice(1)
    .filter(row => row[1] === forceKey && !row[3])
    .map(row => row[0]);

  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      stories: storyKeys
    }))
    .setMimeType(ContentService.MimeType.JSON);
}