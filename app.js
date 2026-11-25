(function () {
  var C = window.CONFIG, token = null, nominees = [];
  var $ = function (id) { return document.getElementById(id); };

  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      document.querySelectorAll('section').forEach(function (s) { s.classList.toggle('on', s.id === b.dataset.tab); });
    };
  });

  function show(id, ok, text) { var m = $(id); m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = text; }

  function api(action, payload) {
    var body = Object.assign({ action: action, idToken: token }, payload || {});
    return fetch(C.API_URL, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }

  window.addEventListener('load', function init() {
    if (!window.google || !google.accounts) return setTimeout(init, 200);
    google.accounts.id.initialize({ client_id: C.CLIENT_ID, hd: C.DOMAIN.slice(1), callback: function (r) { token = r.credential; load(); } });
    google.accounts.id.renderButton($('g-btn'), { theme: 'filled_black', size: 'medium', text: 'signin_with', shape: 'pill' });
  });

  function load() {
    api('getContext').then(function (c) {
      if (!c.ok) { token = null; return $('who-text').textContent = c.message; }
      apply(c.data);
    }).catch(function () { $('who-text').textContent = 'Could not reach the server. Try again.'; });
  }

  function apply(c) {
    $('g-btn').style.display = 'none';
    $('r-email').value = c.email; $('v-email').value = c.email;
    nominees = c.nominees;
    $('count').textContent = nominees.length + ' nominee' + (nominees.length === 1 ? '' : 's') + ' so far. Tap the box to see them.';

    var runOk = true, voteOk = true, note = 'Signed in as ' + c.email;
    if (c.isNominee) { runOk = voteOk = false; note += '. You are a nominee, so voting is closed to you.'; }
    else if (c.hasVoted) { runOk = voteOk = false; note += '. You have already voted.'; }
    else if (c.isExcluded) { runOk = false; note += '. Your role is not eligible to run, but you can vote.'; }
    $('who-text').textContent = note;
    $('run-go').disabled = !runOk; $('vote-go').disabled = !voteOk;
  }

  /* ---- Nominee suggestions (built with textContent so names can never inject HTML) ---- */
  var box = $('sugg'), target = $('v-target');

  function note(text) { var p = document.createElement('div'); p.className = 'sugg-note'; p.textContent = text; box.appendChild(p); }

  function render() {
    var q = target.value.trim().toLowerCase();
    box.innerHTML = '';
    if (!token) note('Sign in first to see the nominees.');
    else {
      var m = nominees.filter(function (n) { return !q || (n.name + ' ' + n.email + ' ' + n.dept).toLowerCase().indexOf(q) > -1; });
      if (!m.length) note(nominees.length ? 'No nominee matches that.' : 'No nominees yet.');
      m.forEach(function (n) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'sugg-item'; b.setAttribute('role', 'option');
        [['b', n.name], ['span', n.dept], ['span', n.email]].forEach(function (p) {
          var e = document.createElement(p[0]); e.textContent = p[1]; b.appendChild(e);
        });
        b.onmousedown = function (ev) { ev.preventDefault(); pick(n); };
        b.onclick = function () { pick(n); };
        box.appendChild(b);
      });
    }
    box.hidden = false; target.setAttribute('aria-expanded', 'true');
  }
  function hide() { box.hidden = true; target.setAttribute('aria-expanded', 'false'); }
  function pick(n) { target.value = n.email; hide(); }

  target.addEventListener('focus', render);
  target.addEventListener('input', render);
  target.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
    if (e.key === 'ArrowDown') { var f = box.querySelector('.sugg-item'); if (f) { e.preventDefault(); f.focus(); } }
  });
  box.addEventListener('keydown', function (e) {
    var items = [].slice.call(box.querySelectorAll('.sugg-item')), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && items[i + 1]) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || target).focus(); }
    if (e.key === 'Escape') { hide(); target.focus(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.pick')) hide(); });
  target.addEventListener('blur', function () { setTimeout(function () { if (!box.contains(document.activeElement)) hide(); }, 150); });

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
    var t = target.value.trim().toLowerCase();
    if (!$('v-name').value.trim()) return show('vote-msg', false, 'Enter your name.');
    if (t.slice(-C.DOMAIN.length) !== C.DOMAIN) return show('vote-msg', false, 'Pick a nominee from the list or enter a ' + C.DOMAIN + ' email.');
    send($('vote-go'), 'vote-msg', 'submitVote', { name: $('v-name').value, target: t });
  };
})();
