  // ─── 1. PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────────────
  // Get this from: Firebase Console → Project Settings → Your apps → Web app
  const _FB_CONFIG = {
    apiKey:            "AIzaSyDMxtJKeqlSeBFEnIXm1sX-LrzXKWr_JUI",
    authDomain:        "norsk-b1-tracker-1f540.firebaseapp.com",
    projectId:         "norsk-b1-tracker-1f540",
    storageBucket:     "norsk-b1-tracker-1f540.firebasestorage.app",
    messagingSenderId: "592682952498",
    appId:             "1:592682952498:web:0a55586e643cb64f69192b"
  };

  // ─── 2. INITIALISE FIREBASE ───────────────────────────────────────────────
  firebase.initializeApp(_FB_CONFIG);
  const _auth     = firebase.auth();
  const _db       = firebase.firestore();
  const _provider = new firebase.auth.GoogleAuthProvider();
  let   _fbUser   = null;
  let   _syncTimer = null;

  // ─── 3. SYNC DOT (grey=idle, amber=saving, green=ok, red=error) ───────────
  function _dot(s) {
    const el = document.getElementById('syncDot');
    if (!el) return;
    const c = { idle:'#94a3b8', pending:'#f59e0b', ok:'#22c55e', err:'#ef4444' };
    const t = { idle:'Not signed in', pending:'Syncing…', ok:'Synced ✓', err:'Sync error' };
    el.style.background = c[s] || c.idle;
    el.title = t[s] || '';
  }

  // ─── 4. AUTH BUTTON UI ────────────────────────────────────────────────────
  function _updateAuthBtn(user) {
    const btn = document.getElementById('authBtn');
    if (!btn) return;
    if (user) {
      btn.innerHTML = user.photoURL
        ? '<img src="' + user.photoURL + '" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:5px">'
          + (user.displayName || 'Account') + ' · Sign out'
        : '👤 ' + (user.displayName || 'Account') + ' · Sign out';
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
      _auth.signOut().then(function() {
        showToast('Signed out. Progress is still saved locally.');
        _dot('idle');
      });
    } else {
      _auth.signInWithPopup(_provider).catch(function(e) {
        showToast('Sign-in failed: ' + e.message);
      });
    }
  }

  // ─── 5. LOAD STATE FROM FIRESTORE ────────────────────────────────────────
  async function _loadCloud(uid) {
    _dot('pending');
    try {
      const doc = await _db.collection('users').doc(uid)
                            .collection('data').doc('state').get();
      if (doc.exists) {
        const remote = doc.data();
        // Remote wins for learning data; local wins for UI / API key
        const keepLocal = ['activeCat','activeExamType','activeStatus',
                           'apiKey','todayDate','todayIds'];
        const merged = Object.assign({}, remote);
        keepLocal.forEach(function(k) {
          if (state[k] !== undefined) merged[k] = state[k];
        });
        merged.apiKey = state.apiKey; // never stored in cloud
        state = Object.assign({}, state, merged);
        // Also update localStorage
        var ts = Object.assign({}, state); delete ts.apiKey;
        localStorage.setItem('norsk-b1-state', JSON.stringify(ts));
        renderSidebar();
        renderToday();
        showToast('☁ Progress loaded from cloud!', 3000);
      } else {
        // First time on this device — push local data to cloud
        await _writeCloud();
        showToast('☁ Local progress uploaded to cloud!', 3000);
      }
      _dot('ok');
    } catch(e) {
      _dot('err');
      showToast('⚠ Cloud load failed — using local data.', 3000);
      console.warn('[Firebase] load error:', e);
    }
  }

  // ─── 6. SAVE STATE TO FIRESTORE (runs 3 sec after last saveState call) ───
  async function _writeCloud() {
    if (!_fbUser) return;
    try {
      var toSave = Object.assign({}, state);
      // Never store these in Firestore
      ['apiKey','activeCat','activeExamType','activeStatus'].forEach(function(k) {
        delete toSave[k];
      });
      await _db.collection('users').doc(_fbUser.uid)
               .collection('data').doc('state')
               .set(toSave, { merge: true });
      _dot('ok');
    } catch(e) {
      _dot('err');
      console.warn('[Firebase] write error:', e);
    }
  }

  function _scheduleSync() {
    if (!_fbUser) return;
    _dot('pending');
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(_writeCloud, 3000);
  }

  // ─── 7. WRAP saveState SO CLOUD SYNC IS AUTOMATIC ───────────────────────
  var _origSave = saveState;
  saveState = function() {
    _origSave();       // localStorage always runs first — nothing lost
    _scheduleSync();   // then queue cloud write if signed in
  };

  // ─── 8. WATCH AUTH STATE ─────────────────────────────────────────────────
  _auth.onAuthStateChanged(function(user) {
    _fbUser = user;
    _updateAuthBtn(user);
    if (user) {
      _loadCloud(user.uid);
    } else {
      _dot('idle');
    }
  });
