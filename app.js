(function () {
  var C = window.CONFIG, token = null;
  var $ = function (id) { return document.getElementById(id); };

  // Tabs
  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      document.querySelectorAll('section').forEach(function (s) { s.classList.toggle('on', s.id === b.dataset.tab); });
    };
  });

  function show(id, ok, text) { var m = $(id); m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = text; }

  // Plain-text body avoids a CORS preflight, which Apps Script cannot answer.
  function api(action, payload) {
    var body = Object.assign({ action: action, idToken: token }, payload || {});
    return fetch(C.API_URL, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }

  // Google sign-in
  window.addEventListener('load', function init() {
    if (!window.google || !google.accounts) return setTimeout(init, 200);
    google.accounts.id.initialize({ client_id: C.CLIENT_ID, hd: C.DOMAIN.slice(1), callback: onSignIn });
    google.accounts.id.renderButton($('g-btn'), { theme: 'outline', size: 'medium', text: 'signin_with' });
  });

  function onSignIn(resp) { token = resp.credential; load(); }

  function load() {
    api('getContext').then(function (c) {
      if (!c.ok) { token = null; return $('who-text').textContent = c.message; }
      apply(c.data);
    }).catch(function () { $('who-text').textContent = 'Could not reach the server. Try again.'; });
  }

  function apply(c) {
    $('g-btn').style.display = 'none';
    $('r-email').value = c.email; $('v-email').value = c.email;
    var dl = $('nominees'); dl.innerHTML = '';
    c.nominees.forEach(function (n) { var o = document.createElement('option'); o.value = n.email; o.label = n.name + ' (' + n.dept + ')'; dl.appendChild(o); });
    $('count').textContent = c.nominees.length + ' nominee' + (c.nominees.length === 1 ? '' : 's') + ' so far. Start typing to see them.';

    var runOk = true, voteOk = true, note = 'Signed in as ' + c.email;
    if (c.isNominee) { runOk = voteOk = false; note += '. You are a nominee, so voting is closed to you.'; }
    else if (c.hasVoted) { runOk = voteOk = false; note += '. You have already voted.'; }
    else if (c.isExcluded) { runOk = false; note += '. Your role is not eligible to run, but you can vote.'; }
    $('who-text').textContent = note;
    $('run-go').disabled = !runOk; $('vote-go').disabled = !voteOk;
  }

  function send(btn, msgId, action, payload) {
    btn.disabled = true; show(msgId, true, 'Sending…');
    api(action, payload).then(function (r) { show(msgId, r.ok, r.message); load(); })
      .catch(function () { show(msgId, false, 'Could not reach the server. Try again.'); btn.disabled = false; });
  }

  $('run-go').onclick = function () {
    if (!$('r-dept').value.trim() || !$('r-name').value.trim()) return show('run-msg', false, 'Enter your department and name.');
    send($('run-go'), 'run-msg', 'submitNomination', { dept: $('r-dept').value, name: $('r-name').value });
  };
  $('vote-go').onclick = function () {
    var t = $('v-target').value.trim().toLowerCase();
    if (!$('v-name').value.trim()) return show('vote-msg', false, 'Enter your name.');
    if (t.slice(-C.DOMAIN.length) !== C.DOMAIN) return show('vote-msg', false, 'Enter a ' + C.DOMAIN + ' email for your nominee.');
    send($('vote-go'), 'vote-msg', 'submitVote', { name: $('v-name').value, target: t });
  };
})();
