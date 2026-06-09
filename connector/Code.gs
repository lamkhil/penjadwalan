/**
 * Sparks Scheduler — Google Sheets ↔ Firestore connector.
 * Entry points and the custom menu.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Sparks Sync')
    .addItem('⬇ Export dari app (Firestore → Sheet)', 'runExport')
    .addSeparator()
    .addItem('⬆ Import siswa (Sheet → Firestore)', 'runImportStudents')
    .addToUi();
}

/** Run once to verify Firestore access is wired up correctly. */
function testConnection() {
  var teachers = fsList('teachers');
  SpreadsheetApp.getActive().toast(
    'Terhubung. ' + teachers.length + ' teacher terbaca dari Firestore.', 'Sparks Sync', 6);
  Logger.log('Teachers: ' + JSON.stringify(teachers.map(function (t) { return t.code; })));
}
