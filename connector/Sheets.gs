/**
 * Export Firestore data to the bound Google Sheet, and import students back.
 * Mirrors the app's data model (see src/shared/types.ts).
 */

var DAY_GROUPS = ['MON_WED', 'TUE_THU', 'FRI', 'SAT', 'SUN'];
var DAY_LABEL = {
  MON_WED: 'Monday & Wednesday', TUE_THU: 'Tuesday & Thursday',
  FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};
var PROGRAM_COLOR = { LS: '#F4B9B9', SK: '#B9D7F4', ST: '#C9F4B9' };
var OPEN_MIN = 540, CLOSE_MIN = 1080, GRID_STEP = 30;

function minToHHMM_(m) {
  var h = Math.floor(m / 60), mm = m % 60;
  return ('0' + h).slice(-2) + ':' + ('0' + mm).slice(-2);
}

/** The target spreadsheet: SPREADSHEET_ID script property, else the active one. */
function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
}

function getOrCreateSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  return sh;
}

function writeTable_(sh, headers, rows) {
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold')
    .setBackground('#fafbfc');
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, headers.length);
}

// ---- Export: Firestore -> Sheets ----

function exportMasters_() {
  var ss = getSpreadsheet_();

  var teachers = fsList('teachers');
  writeTable_(getOrCreateSheet_(ss, 'Teachers'),
    ['code', 'name', 'isAssistant', 'active', 'worksDayGroups'],
    teachers.map(function (t) {
      return [t.code, t.name, !!t.isAssistant, t.active !== false,
        (t.worksDayGroups || []).join(', ')];
    }));

  var rooms = fsList('classrooms');
  writeTable_(getOrCreateSheet_(ss, 'Classrooms'),
    ['code', 'name', 'floor'],
    rooms.map(function (r) { return [r.code, r.name, r.floor || '']; }));

  var students = fsList('students');
  writeTable_(getOrCreateSheet_(ss, 'Students'),
    ['studentCode', 'name', 'scheduleLabel'],
    students.map(function (s) { return [s.studentCode || '', s.name, s.scheduleLabel || '']; }));

  var classes = fsList('classes');
  writeTable_(getOrCreateSheet_(ss, 'Classes'),
    ['classCode', 'classType', 'oldClassCode', 'programCode', 'level', 'dayGroup',
      'startMin', 'startTime', 'durationMin', 'teacherId', 'classroomId', 'startDate',
      'status', 'lifecycle'],
    classes.map(function (c) {
      return [c.classCode, c.classType, c.oldClassCode || '', c.programCode, c.level,
        c.dayGroup, c.startMin, minToHHMM_(c.startMin), c.durationMin,
        c.teacherId || '', c.classroomId || '', c.startDate || '', c.status,
        c.lifecycle || 'CONFIRMED'];
    }));

  return { teachers: teachers, rooms: rooms, students: students, classes: classes };
}

/** Build one grid sheet per day-group: teachers as columns, time as rows. */
function exportGrid_(teachers, rooms, classes) {
  var ss = getSpreadsheet_();
  var roomById = {};
  rooms.forEach(function (r) { roomById[r.id] = r; });

  DAY_GROUPS.forEach(function (dg) {
    var sh = getOrCreateSheet_(ss, 'Grid ' + dg);
    var cols = teachers.slice().sort(function (a, b) {
      return (a.code || '').localeCompare(b.code || '');
    });

    // Header row
    var header = ['Jam'].concat(cols.map(function (t) { return t.code; }));
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold')
      .setBackground('#fafbfc');
    sh.getRange(1, 1).setValue(DAY_LABEL[dg]);

    // Time rows
    var nRows = Math.floor((CLOSE_MIN - OPEN_MIN) / GRID_STEP) + 1;
    for (var i = 0; i < nRows; i++) {
      sh.getRange(i + 2, 1).setValue(minToHHMM_(OPEN_MIN + i * GRID_STEP)).setFontColor('#7a828e');
    }

    // Mark OFF columns + place class blocks
    cols.forEach(function (t, ci) {
      var col = ci + 2;
      var works = (t.worksDayGroups || []).indexOf(dg) >= 0;
      if (!works) {
        sh.getRange(2, col, nRows, 1).setBackground('#f3d6d4');
        sh.getRange(2, col).setValue('OFF').setFontColor('#b9342c').setFontWeight('bold');
        return;
      }
      classes.filter(function (c) { return c.dayGroup === dg && c.teacherId === t.id; })
        .forEach(function (c) {
          var rowIdx = Math.round((c.startMin - OPEN_MIN) / GRID_STEP);
          var span = Math.max(1, Math.round(c.durationMin / GRID_STEP));
          var room = c.classroomId && roomById[c.classroomId] ? roomById[c.classroomId].code : '';
          var label = c.programCode + ' ' + c.level + (room ? '\n' + room : '') +
            (c.status && c.status !== 'ACTIVE' ? '\n' + c.status : '');
          var cell = sh.getRange(rowIdx + 2, col, Math.min(span, nRows - rowIdx), 1);
          try { cell.merge(); } catch (e) { /* already merged neighbours */ }
          cell.setValue(label).setBackground(PROGRAM_COLOR[c.programCode] || '#eee')
            .setVerticalAlignment('top').setWrap(true).setFontSize(9);
        });
    });

    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
    sh.autoResizeColumns(1, header.length);
  });
}

function runExport() {
  var data = exportMasters_();
  exportGrid_(data.teachers, data.rooms, data.classes);
  SpreadsheetApp.getActive().toast(
    'Export selesai: ' + data.teachers.length + ' teacher, ' +
    data.students.length + ' siswa, ' + data.classes.length + ' kelas.', 'Sparks Sync', 6);
}

// ---- Import: Students sheet -> Firestore ----

function slugId_(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/**
 * Read the "Students" tab and upsert each row to Firestore. Doc id = studentCode
 * if present, else a slug of the name. Safe to re-run.
 */
function runImportStudents() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName('Students');
  if (!sh) throw new Error('Tab "Students" tidak ditemukan. Jalankan Export dulu.');
  var values = sh.getDataRange().getValues();
  var header = values.shift().map(function (h) { return String(h).trim(); });
  var iCode = header.indexOf('studentCode'),
    iName = header.indexOf('name'),
    iSched = header.indexOf('scheduleLabel');
  if (iName < 0) throw new Error('Kolom "name" tidak ada di tab Students.');

  var n = 0, used = {};
  values.forEach(function (row) {
    var name = String(row[iName] || '').trim();
    if (!name) return;
    var code = iCode >= 0 ? String(row[iCode] || '').trim() : '';
    var id = code || slugId_(name);
    while (used[id]) id = id + '-' + Object.keys(used).length;
    used[id] = true;
    fsSet('students', id, {
      studentCode: code,
      name: name,
      scheduleLabel: iSched >= 0 ? String(row[iSched] || '').trim() : '',
    });
    n++;
  });
  SpreadsheetApp.getActive().toast('Import selesai: ' + n + ' siswa ke Firestore.', 'Sparks Sync', 6);
}
