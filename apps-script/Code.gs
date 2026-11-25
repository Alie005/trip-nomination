/**
 * Trip Nomination API (Google Apps Script web app, bound to your Google Sheet).
 * Frontend lives on GitHub Pages and sends a Google ID token with every request.
 * Sheets: Nominees, Voters, Excluded (run setup() once).
 */
const CLIENT_ID = '792318753787-qi4rftddirussu4qmiji66dua66fmk5v.apps.googleusercontent.com';
const DOMAIN = 'rentokil-initial.com';

function doGet() { return json_({ ok: true, message: 'Trip nomination API is running.' }); }

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const user = verify_(req.idToken);
    if (!user) return json_({ ok: false, message: 'Sign in with your @' + DOMAIN + ' account.' });
    const email = user.email;
    if (req.action === 'getContext') return json_({ ok: true, data: state_(email, user.name) });
    if (req.action === 'submitNomination') return json_(submitNomination_(email, req));
    if (req.action === 'submitVote') return json_(submitVote_(email, req));
    return json_({ ok: false, message: 'Unknown action.' });
  } catch (err) {
    return json_({ ok: false, message: 'Request failed.' });
  }
}

function setup() {
  const ss = SpreadsheetApp.getActive();
  const defs = {
    Nominees: ['Timestamp', 'Department', 'Name', 'Email'],
    Voters: ['Timestamp', 'Name', 'Email', 'Voted For'],
    Excluded: ['Email', 'Name', 'Role']
  };
  Object.keys(defs).forEach(n => {
    const sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if (sh.getLastRow() === 0) sh.appendRow(defs[n]);
    sh.getRange(1, 1, 1, defs[n].length).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
}

/* ---------- auth ---------- */
function verify_(idToken) {
  if (!idToken) return null;
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  const p = JSON.parse(res.getContentText());
  const email = norm_(p.email);
  if (p.aud !== CLIENT_ID || String(p.email_verified) !== 'true' || p.hd !== DOMAIN) return null;
  if (!/^[a-z0-9._%+'-]+@rentokil-initial\.com$/.test(email)) return null;
  return { email: email, name: clean_(p.name || '') };
}

/* ---------- helpers ---------- */
const json_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const norm_ = s => String(s || '').trim().toLowerCase();
const clean_ = s => String(s || '').trim().replace(/^[=+\-@]+/, '').slice(0, 120); // blocks formula injection
const fail_ = m => ({ ok: false, message: m });
const rows_ = n => SpreadsheetApp.getActive().getSheetByName(n).getDataRange().getValues().slice(1).filter(r => r.join('') !== '');

function state_(email, name) {
  const nominees = rows_('Nominees').map(r => ({ dept: r[1], name: r[2], email: norm_(r[3]) }));
  return {
    email: email,
    name: name || '',
    nominees: nominees,
    isNominee: nominees.some(n => n.email === email),
    hasVoted: rows_('Voters').some(r => norm_(r[2]) === email),
    isExcluded: rows_('Excluded').some(r => norm_(r[0]) === email)
  };
}

/* ---------- actions ---------- */
function submitNomination_(email, d) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = state_(email);
    if (s.isExcluded) return fail_('Your role is not eligible to run. Only support roles can be nominated.');
    if (s.isNominee) return fail_('You are already a nominee.');
    if (s.hasVoted) return fail_('You have already voted, so you cannot run.');
    const dept = clean_(d.dept), name = clean_(d.name);
    if (!dept || !name) return fail_('Enter your department and name.');
    SpreadsheetApp.getActive().getSheetByName('Nominees').appendRow([new Date(), dept, name, email]);
    return { ok: true, message: 'You are in the running.' };
  } finally { lock.releaseLock(); }
}

function submitVote_(email, d) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = state_(email);
    if (s.isNominee) return fail_('Nominees cannot vote.');
    if (s.hasVoted) return fail_('This email has already voted.');
    const name = clean_(d.name), target = norm_(d.target);
    if (!name) return fail_('Enter your name.');
    if (target === email) return fail_('You cannot vote for yourself.');
    if (!s.nominees.some(n => n.email === target)) return fail_('That email is not on the nominee list.');
    SpreadsheetApp.getActive().getSheetByName('Voters').appendRow([new Date(), name, email, target]);
    return { ok: true, message: 'Vote recorded. Thank you.' };
  } finally { lock.releaseLock(); }
}
