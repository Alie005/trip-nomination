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

  // Either shows the reason card (form hidden) or the form (reason hidden).
  function gate(prefix, reason) {
    $(prefix + '-reason').textContent = reason || '';
    $(prefix + '-reason').hidden = !reason;
    $(prefix + '-form').hidden = !!reason;
  }

  function signedOut(msg) {
    token = null;
    $('signin').hidden = false;
    $('who-text').textContent = msg || 'Sign in with your work account to run or vote.';
    gate('run', 'Sign in with your work account to enter the nomination.');
    gate('vote', 'Sign in with your work account to vote.');
  }

  function api(action, payload) {
    var body = Object.assign({ action: action, idToken: token }, payload || {});
    return fetch(C.API_URL, { method: 'POST', body: JSON.stringify(body) })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        try { return JSON.parse(t); }
        catch (e) { throw new Error('unexpected reply from the server (is the Apps Script deployment access set to Anyone?)'); }
      });
  }

  signedOut();
  window.addEventListener('load', function init() {
    if (!window.google || !google.accounts) return setTimeout(init, 200);
    google.accounts.id.initialize({ client_id: C.CLIENT_ID, hd: C.DOMAIN.slice(1), callback: function (r) { token = r.credential; load(); } });
    google.accounts.id.renderButton($('g-btn'), { theme: 'filled_black', size: 'medium', text: 'signin_with', shape: 'pill' });
  });

  function load() {
    $('who-text').textContent = 'Signing you in…';
    api('getContext').then(function (c) {
      if (!c.ok) return signedOut(c.message);
      apply(c.data);
    }).catch(function (e) {
      console.error(e);
      signedOut('Signed in, but the server could not be reached: ' + e.message + '. Check API_URL in config.js.');
    });
  }

  function apply(c) {
    $('signin').hidden = true;
    $('r-email').value = c.email; $('v-email').value = c.email;
    if (c.name) { if (!$('r-name').value) $('r-name').value = c.name; if (!$('v-name').value) $('v-name').value = c.name; }
    nominees = c.nominees;
    $('count').textContent = nominees.length + ' nominee' + (nominees.length === 1 ? '' : 's') + ' so far. Tap the box to see them.';

    var run = '', vote = '';
    if (c.isNominee) {
      run = 'You are in the running. Good luck!';
      vote = 'Nominees cannot vote. You are running, so your vote is not allowed.';
    } else if (c.hasVoted) {
      run = 'You have already voted, so you cannot run.';
      vote = 'Your vote is recorded. Each email can vote once and votes cannot be changed.';
    } else if (c.isExcluded) {
      run = 'Your role is not eligible to run. Only support roles can be nominated; sales consultants and service colleagues cannot.';
    }
    gate('run', run); gate('vote', vote);
  }

  /* ---- Nominee suggestions (textContent only, so names can never inject HTML) ---- */
  var box = $('sugg'), target = $('v-target');
  function note(text) { var p = document.createElement('div'); p.className = 'sugg-note'; p.textContent = text; box.appendChild(p); }

  function render() {
    var q = target.value.trim().toLowerCase();
    box.innerHTML = '';
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
    api(action, payload).then(function (r) {
      show(msgId, r.ok, r.message); btn.disabled = false;
      if (r.ok) load();
    }).catch(function (e) { show(msgId, false, 'Could not reach the server: ' + e.message); btn.disabled = false; });
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
