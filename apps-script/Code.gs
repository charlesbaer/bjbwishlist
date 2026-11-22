/**
 * Holiday Wish List — purchase tracker backend.
 *
 * Paste this file into a Google Sheet's Apps Script editor (Extensions → Apps Script)
 * and deploy it as a web app: Execute as "Me", Who has access "Anyone".
 * Purchases are stored in a "Purchases" tab of the Sheet the script is bound to.
 *
 * GET  → { ok, purchases: { <itemId>: { date, email (masked), item } } }
 * POST (body is JSON sent as text/plain so browsers skip the CORS preflight)
 *   { action: "mark", id, date, email }   → { ok, token }   (token lets that browser undo)
 *   { action: "undo", id, token }         → { ok }
 */

// Must match the ids in index.html. Anything else is rejected, so nobody can spam the Sheet.
var ITEMS = {
  'beta-jacket': "Arc'teryx Beta Jacket — Men's",
  'airpods-max-2': 'Apple AirPods Max 2 — Starlight',
  'emblem-hoody': "Arc'teryx Emblem Fleece Full-Zip Hoody",
  'insta360-x3': 'Insta360 X3 360° Action Camera',
  'comfrt-sweatpants': 'Après Ski Straight Leg Sweatpants',
  'comfrt-hoodie': 'Après Ski Hoodie'
};

var SHEET_NAME = 'Purchases';
var HEADERS = ['Item ID', 'Item', 'Date purchased', 'Email', 'Marked at', 'Undo token'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Returns data rows (without header) as arrays, plus their 1-based sheet row numbers. */
function readRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  return values.map(function (v, i) { return { row: i + 2, v: v }; })
               .filter(function (r) { return r.v[0] !== '' && r.v[0] != null; });
}

function maskEmail_(email) {
  var parts = String(email).split('@');
  if (parts.length !== 2 || !parts[1]) return 'someone';
  return parts[0].slice(0, 2) + '•••@' + parts[1];
}

function formatDate_(d) {
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(d);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  var purchases = {};
  readRows_(getSheet_()).forEach(function (r) {
    var id = String(r.v[0]);
    if (!ITEMS[id]) return;
    purchases[id] = { date: formatDate_(r.v[2]), email: maskEmail_(r.v[3]), item: ITEMS[id] };
  });
  return json_({ ok: true, purchases: purchases });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  var id = String(body.id || '');
  if (!ITEMS[id]) return json_({ ok: false, error: 'unknown_item' });

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'busy' });
  try {
    var sheet = getSheet_();
    var existing = readRows_(sheet).filter(function (r) { return String(r.v[0]) === id; })[0];

    if (body.action === 'mark') {
      var date = String(body.date || '');
      var email = String(body.email || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json_({ ok: false, error: 'bad_date' });
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json_({ ok: false, error: 'bad_email' });
      }
      if (existing) return json_({ ok: false, error: 'already_purchased' });
      var token = Utilities.getUuid();
      // Prefix with ' so Sheets keeps the date as typed text instead of reinterpreting it.
      sheet.appendRow([id, ITEMS[id], "'" + date, email, new Date(), token]);
      return json_({ ok: true, token: token });
    }

    if (body.action === 'undo') {
      if (!existing) return json_({ ok: true });
      if (!body.token || String(body.token) !== String(existing.v[5])) {
        return json_({ ok: false, error: 'forbidden' });
      }
      sheet.deleteRow(existing.row);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'bad_action' });
  } finally {
    lock.releaseLock();
  }
}
