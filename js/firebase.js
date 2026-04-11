  // ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
  const _FB_CONFIG = {
    apiKey:            "AIzaSyDMxtJKeqlSeBFEnIXm1sX-LrzXKWr_JUI",
    authDomain:        "norsk-b1-tracker-1f540.firebaseapp.com",
    projectId:         "norsk-b1-tracker-1f540",
    storageBucket:     "norsk-b1-tracker-1f540.firebasestorage.app",
    messagingSenderId: "592682952498",
    appId:             "1:592682952498:web:0a55586e643cb64f69192b"
  };

  // ─── OWNER CONFIG ─────────────────────────────────────────────────────────────
  // Replace with your Google account email. Only this email has owner / admin access.
  const OWNER_EMAIL = 'umaece1311@gmail.com';

  // ─── INIT ─────────────────────────────────────────────────────────────────────
  firebase.initializeApp(_FB_CONFIG);
  const _auth      = firebase.auth();
  const _db        = firebase.firestore();
  const _provider  = new firebase.auth.GoogleAuthProvider();
  let   _fbUser    = null;
  let   _syncTimer = null;

  // ─── SYNC DOT ─────────────────────────────────────────────────────────────────
  function _dot(s) {
    const el = document.getElementById('syncDot');
    if (!el) return;
    const c = { idle:'#94a3b8', pending:'#f59e0b', ok:'#22c55e', err:'#ef4444' };
    const t = { idle:'Not signed in', pending:'Syncing…', ok:'Synced ✓', err:'Sync error' };
    el.style.background = c[s] || c.idle;
    el.title            = t[s] || '';
  }

  // ─── AUTH BUTTON (sidebar) ────────────────────────────────────────────────────
  function _updateAuthBtn(user) {
    const btn = document.getElementById('authBtn');
    if (!btn) return;
    if (user) {
      btn.innerHTML = user.photoURL
        ? '<img src="' + user.photoURL + '" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:5px">'
          + (user.displayName || 'Account') + ' · Sign out'
        : '&#128100; ' + (user.displayName || 'Account') + ' · Sign out';
      btn.style.background = '#f0fdf4';
      btn.style.color      = '#15803d';
    } else {
      btn.innerHTML        = '&#9729; Sign in to sync';
      btn.style.background = '';
      btn.style.color      = '';
    }
  }

  function handleAuthClick() {
    if (_fbUser) {
      _auth.signOut();
    } else {
      _auth.signInWithPopup(_provider).catch(function(e) {
        _gateError('Sign-in failed: ' + e.message);
      });
    }
  }

  // ─── AUTH GATE UI ─────────────────────────────────────────────────────────────
  // States: loading | signin | checking | request | pending | denied
  function _showGate(state, user) {
    const gate = document.getElementById('authGate');
    const app  = document.querySelector('.app');

    // Sub-sections
    const $ = id => document.getElementById(id);
    const sections = ['gateLoading','gateSignin','gateChecking','gateRequest','gatePending','gateDenied'];
    sections.forEach(id => {
      const el = $(id);
      if (el) el.classList.add('hidden');
    });
    _gateError('');

    if (state === 'off') {
      if (gate) gate.classList.add('hidden');
      if (app)  app.style.display = '';
      return;
    }

    if (gate) gate.classList.remove('hidden');
    if (app)  app.style.display = 'none';

    const target = $('gate' + state.charAt(0).toUpperCase() + state.slice(1));
    if (target) target.classList.remove('hidden');

    // Populate user chip in request/pending/denied states
    if (user && ['request','pending','denied'].includes(state)) {
      const chip = $('gateUserChip');
      if (chip) {
        const nameEl  = chip.querySelector('.auth-gate-user-name');
        const emailEl = chip.querySelector('.auth-gate-user-email');
        if (nameEl)  nameEl.textContent  = user.displayName || 'Unknown';
        if (emailEl) emailEl.textContent = user.email;
        const img = chip.querySelector('img');
        if (user.photoURL) {
          img.src = user.photoURL;
          img.style.display = '';
        } else {
          img.style.display = 'none';
        }
        chip.classList.remove('hidden');
      }
    }

  }

  function _gateError(msg) {
    const el = document.getElementById('gateError');
    if (el) el.textContent = msg;
  }

  // ─── ACCESS CHECK ─────────────────────────────────────────────────────────────
  async function _checkAccess(user) {
    // Owner always gets in
    if (user.email === OWNER_EMAIL) {
      _showGate('off', user);
      _loadCloud(user.uid);
      // Show admin tab
      const adminBtn = document.getElementById('adminNavBtn');
      if (adminBtn) adminBtn.style.display = '';
      return;
    }

    _showGate('checking', user);
    try {
      // Check active access list
      const accessDoc = await _db.collection('accessList').doc(user.uid).get();
      if (accessDoc.exists && accessDoc.data().status === 'active') {
        _showGate('off', user);
        _loadCloud(user.uid);
        return;
      }

      // Check for existing request
      const reqDoc = await _db.collection('accessRequests').doc(user.uid).get();
      if (reqDoc.exists) {
        const status = reqDoc.data().status;
        if (status === 'pending')  { _showGate('pending',  user); return; }
        if (status === 'approved') { _showGate('off', user); _loadCloud(user.uid); return; }
        if (status === 'rejected') { _showGate('denied',   user); return; }
      }

      // No record — show request access screen
      _showGate('request', user);

    } catch (e) {
      _gateError('Error checking access: ' + e.message);
      _showGate('request', user);
    }
  }

  // ─── SUBMIT ACCESS REQUEST (after payment) ────────────────────────────────────
  async function submitAccessRequest() {
    if (!_fbUser) return;
    const btn = document.getElementById('gateNotifyBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    try {
      await _db.collection('accessRequests').doc(_fbUser.uid).set({
        email:       _fbUser.email,
        displayName: _fbUser.displayName || '',
        photoURL:    _fbUser.photoURL    || '',
        requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status:      'pending'
      });
      _showGate('pending', _fbUser);
    } catch (e) {
      _gateError('Failed to submit request: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = "&#128232; I've paid — notify owner"; }
    }
  }

  // ─── CLOUD LOAD ───────────────────────────────────────────────────────────────
  async function _loadCloud(uid) {
    _dot('pending');
    try {
      const doc = await _db.collection('users').doc(uid)
                            .collection('data').doc('state').get();
      if (doc.exists) {
        const remote    = doc.data();
        const keepLocal = ['activeCat','activeExamType','activeStatus',
                           'apiKey','todayDate','todayIds'];
        const merged    = Object.assign({}, remote);
        keepLocal.forEach(function(k) {
          if (state[k] !== undefined) merged[k] = state[k];
        });
        merged.apiKey = state.apiKey;
        state = Object.assign({}, state, merged);
        var ts = Object.assign({}, state); delete ts.apiKey;
        localStorage.setItem('norsk-b1-state', JSON.stringify(ts));
        renderSidebar();
        renderToday();
        showToast('&#9729; Progress loaded from cloud!', 3000);
      } else {
        await _writeCloud();
        showToast('&#9729; Local progress uploaded to cloud!', 3000);
      }
      _dot('ok');
    } catch(e) {
      _dot('err');
      showToast('&#9888; Cloud load failed — using local data.', 3000);
    }
  }

  // ─── CLOUD SAVE ───────────────────────────────────────────────────────────────
  async function _writeCloud() {
    if (!_fbUser) return;
    try {
      var toSave = Object.assign({}, state);
      ['apiKey','activeCat','activeExamType','activeStatus'].forEach(function(k) {
        delete toSave[k];
      });
      await _db.collection('users').doc(_fbUser.uid)
               .collection('data').doc('state')
               .set(toSave, { merge: true });
      _dot('ok');
    } catch(e) {
      _dot('err');
    }
  }

  function _scheduleSync() {
    if (!_fbUser) return;
    _dot('pending');
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(_writeCloud, 3000);
  }

  var _origSave = saveState;
  saveState = function() {
    _origSave();
    _scheduleSync();
  };

  // ─── AUTH STATE WATCHER ───────────────────────────────────────────────────────
  // Fallback: if Firebase hasn't resolved auth within 5s, show the sign-in screen
  var _authResolved = false;
  setTimeout(function() {
    if (!_authResolved) _showGate('signin', null);
  }, 5000);

  _auth.onAuthStateChanged(function(user) {
    _authResolved = true;
    _fbUser = user;
    _updateAuthBtn(user);
    if (user) {
      _checkAccess(user);
    } else {
      _dot('idle');
      _showGate('signin', null);
      // Hide admin tab
      const adminBtn = document.getElementById('adminNavBtn');
      if (adminBtn) adminBtn.style.display = 'none';
    }
  });
