/**
 * Minimal Firestore REST client for Apps Script.
 *
 * Auth: uses the script runner's own OAuth token (ScriptApp.getOAuthToken)
 * carrying the `datastore` scope declared in appsscript.json. The runner must be
 * an Owner/Editor of the Firebase project, so no service-account key is needed.
 *
 * IMPORTANT: set this Apps Script's associated GCP project to "sparks-scheduler"
 * (Project Settings > Google Cloud Platform (GCP) Project > project number
 * 343861686324). Otherwise Firestore calls are attributed to a hidden default
 * project where the Firestore API is not enabled.
 */

var FS_PROJECT_ID = 'sparks-scheduler';
var FS_BASE = 'https://firestore.googleapis.com/v1/projects/' + FS_PROJECT_ID +
  '/databases/(default)/documents';

function fsHeaders_() {
  return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
}

/** Decode a single Firestore typed value into a plain JS value. */
function fsDecodeValue_(v) {
  if (v == null) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(fsDecodeValue_);
  if (v.mapValue !== undefined) {
    var out = {};
    var f = v.mapValue.fields || {};
    Object.keys(f).forEach(function (k) { out[k] = fsDecodeValue_(f[k]); });
    return out;
  }
  return null;
}

/** Encode a plain JS value into a Firestore typed value. */
function fsEncodeValue_(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') {
    return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  }
  if (Array.isArray(x)) return { arrayValue: { values: x.map(fsEncodeValue_) } };
  if (typeof x === 'object') {
    var fields = {};
    Object.keys(x).forEach(function (k) { fields[k] = fsEncodeValue_(x[k]); });
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(x) };
}

function fsDecodeDoc_(doc) {
  var fields = doc.fields || {};
  var obj = { id: doc.name.split('/').pop() };
  Object.keys(fields).forEach(function (k) { obj[k] = fsDecodeValue_(fields[k]); });
  return obj;
}

/** List every document in a collection (handles pagination). */
function fsList(collection) {
  var docs = [];
  var pageToken = '';
  do {
    var url = FS_BASE + '/' + encodeURIComponent(collection) + '?pageSize=300' +
      (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    var resp = UrlFetchApp.fetch(url, { headers: fsHeaders_(), muteHttpExceptions: true });
    if (resp.getResponseCode() >= 300) {
      throw new Error('Firestore list ' + collection + ' failed: ' + resp.getContentText());
    }
    var body = JSON.parse(resp.getContentText());
    (body.documents || []).forEach(function (d) { docs.push(fsDecodeDoc_(d)); });
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return docs;
}

/**
 * Create or overwrite a document at collection/docId with `data` (a plain
 * object; do NOT include `id`). Uses PATCH, which upserts.
 */
function fsSet(collection, docId, data) {
  var fields = {};
  Object.keys(data).forEach(function (k) {
    if (k === 'id') return;
    fields[k] = fsEncodeValue_(data[k]);
  });
  var url = FS_BASE + '/' + encodeURIComponent(collection) + '/' + encodeURIComponent(docId);
  var resp = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: fsHeaders_(),
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() >= 300) {
    throw new Error('Firestore set ' + collection + '/' + docId + ' failed: ' + resp.getContentText());
  }
}
