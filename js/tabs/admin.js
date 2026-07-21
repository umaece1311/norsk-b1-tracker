      // ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
      // Only rendered when the signed-in user is the owner.
      // Manages: pending access requests · active users · revoked users

      async function renderAdmin() {
        const el = document.getElementById('tab-admin');
        if (!el) return;

        el.innerHTML = `
          <div class="admin-header">
            <h2 style="font-size:1.4rem">&#128274; Access Manager</h2>
            <button class="btn btn-ghost" onclick="renderAdmin()">&#8635; Refresh</button>
          </div>
          <div style="color:#94a3b8;font-size:0.85rem;padding:12px 0">Loading…</div>`;

        try {
          const [reqSnap, listSnap] = await Promise.all([
            _db.collection('accessRequests').orderBy('requestedAt', 'desc').get(),
            _db.collection('accessList').orderBy('grantedAt', 'desc').get()
          ]);

          const pending  = reqSnap.docs.filter(d => d.data().status === 'pending');
          const rejected = reqSnap.docs.filter(d => d.data().status === 'rejected');
          const active   = listSnap.docs.filter(d => d.data().status === 'active');
          const revoked  = listSnap.docs.filter(d => d.data().status === 'revoked');

          const fmtDate = ts => {
            if (!ts?.toDate) return '—';
            return ts.toDate().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
          };

          const avatar = (d) => d.photoURL
            ? `<img class="admin-user-avatar" src="${d.photoURL}" onerror="this.style.display='none'">`
            : `<div class="admin-user-avatar">&#128100;</div>`;

          const durationOptions = (selected) => Object.entries(ACCESS_DURATIONS)
            .map(([key, v]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${v.label}</option>`)
            .join('');

          const expiryMeta = (d) => {
            if (!d.expiresAt?.toDate) return '<span class="admin-badge admin-badge-active" style="margin-left:6px">No expiry</span>';
            const msLeft = d.expiresAt.toDate().getTime() - Date.now();
            if (msLeft <= 0) return '<span class="admin-badge admin-badge-revoked" style="margin-left:6px">Expired</span>';
            const days = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
            return `<span class="admin-badge admin-badge-pending" style="margin-left:6px">Expires ${fmtDate(d.expiresAt)} (${days}d left)</span>`;
          };

          const pendingHTML = pending.length
            ? pending.map(doc => {
                const d = doc.data();
                return `
                  <div class="admin-user-card" id="req-${doc.id}">
                    ${avatar(d)}
                    <div class="admin-user-info">
                      <div class="admin-user-name">${escapeHtml(d.displayName || '—')}</div>
                      <div class="admin-user-email">${escapeHtml(d.email)}</div>
                      <div class="admin-user-meta">Requested ${fmtDate(d.requestedAt)}</div>
                    </div>
                    <div class="admin-actions">
                      <select class="admin-duration-select" id="dur-${doc.id}">${durationOptions('forever')}</select>
                      <button class="btn btn-green" onclick="approveUser('${doc.id}', document.getElementById('dur-${doc.id}').value)">&#10003; Approve</button>
                      <button class="btn btn-danger" onclick="rejectUser('${doc.id}')">&#10005; Reject</button>
                      <button class="btn btn-ghost" onclick="deleteAccessRequest('${doc.id}')">Delete</button>
                    </div>
                  </div>`;
              }).join('')
            : `<div class="admin-empty">No pending requests.</div>`;

          const activeHTML = active.length
            ? active.map(doc => {
                const d = doc.data();
                return `
                  <div class="admin-user-card" id="usr-${doc.id}">
                    ${avatar(d)}
                    <div class="admin-user-info">
                      <div class="admin-user-name">${escapeHtml(d.displayName || '—')}</div>
                      <div class="admin-user-email">${escapeHtml(d.email)}</div>
                      <div class="admin-user-meta">Granted ${fmtDate(d.grantedAt)} ${expiryMeta(d)}</div>
                    </div>
                    <div class="admin-actions">
                      <select class="admin-duration-select" onchange="updateAccessDuration('${doc.id}', this.value)">${durationOptions(d.duration || 'forever')}</select>
                      <button class="btn btn-danger" onclick="revokeAccess('${doc.id}')">Revoke</button>
                    </div>
                  </div>`;
              }).join('')
            : `<div class="admin-empty">No active users yet.</div>`;

          const revokedHTML = revoked.length
            ? revoked.map(doc => {
                const d = doc.data();
                return `
                  <div class="admin-user-card" id="usr-${doc.id}" style="opacity:0.6">
                    ${avatar(d)}
                    <div class="admin-user-info">
                      <div class="admin-user-name">${escapeHtml(d.displayName || '—')}</div>
                      <div class="admin-user-email">${escapeHtml(d.email)}</div>
                      <div class="admin-user-meta">Revoked</div>
                    </div>
                    <div class="admin-actions">
                      <select class="admin-duration-select" id="dur-usr-${doc.id}">${durationOptions(d.duration || 'forever')}</select>
                      <button class="btn btn-ghost" onclick="restoreAccess('${doc.id}', document.getElementById('dur-usr-${doc.id}').value)">Restore</button>
                      <button class="btn btn-danger" onclick="deleteAccessGrant('${doc.id}')">Delete</button>
                    </div>
                  </div>`;
              }).join('')
            : '';

          const rejectedHTML = rejected.length
            ? rejected.map(doc => {
                const d = doc.data();
                return `
                  <div class="admin-user-card" id="rej-${doc.id}" style="opacity:0.6">
                    ${avatar(d)}
                    <div class="admin-user-info">
                      <div class="admin-user-name">${escapeHtml(d.displayName || '—')}</div>
                      <div class="admin-user-email">${escapeHtml(d.email)}</div>
                      <div class="admin-user-meta">Rejected</div>
                    </div>
                    <div class="admin-actions">
                      <select class="admin-duration-select" id="dur-rej-${doc.id}">${durationOptions('forever')}</select>
                      <button class="btn btn-green" onclick="approveUser('${doc.id}', document.getElementById('dur-rej-${doc.id}').value)">&#10003; Approve</button>
                      <button class="btn btn-ghost" onclick="restoreRequestToPending('${doc.id}')">Restore to pending</button>
                      <button class="btn btn-danger" onclick="deleteAccessRequest('${doc.id}')">Delete</button>
                    </div>
                  </div>`;
              }).join('')
            : '';

          el.innerHTML = `
            <div class="admin-header">
              <h2 style="font-size:1.4rem">&#128274; Access Manager</h2>
              <button class="btn btn-ghost" onclick="renderAdmin()">&#8635; Refresh</button>
            </div>

            <div class="admin-section">
              <div class="admin-section-title">
                Pending Requests
                <span class="admin-badge admin-badge-pending">${pending.length}</span>
              </div>
              ${pendingHTML}
            </div>

            <div class="admin-section">
              <div class="admin-section-title">
                Active Users
                <span class="admin-badge admin-badge-active">${active.length}</span>
              </div>
              ${activeHTML}
            </div>

            ${revoked.length ? `
            <div class="admin-section">
              <div class="admin-section-title">
                Revoked
                <span class="admin-badge admin-badge-revoked">${revoked.length}</span>
              </div>
              ${revokedHTML}
            </div>` : ''}

            ${rejected.length ? `
            <div class="admin-section">
              <div class="admin-section-title">
                Rejected
                <span class="admin-badge admin-badge-revoked">${rejected.length}</span>
              </div>
              ${rejectedHTML}
            </div>` : ''}`;

        } catch (e) {
          document.getElementById('tab-admin').innerHTML =
            `<div style="color:#dc2626;padding:12px 0">&#9888; Failed to load: ${e.message}</div>`;
        }
      }

      // ── Payment link (stored in localStorage) ────────────────────────────────────
      function _getPaymentLink() {
        return localStorage.getItem('norsk-payment-link') || '';
      }
      function _savePaymentLink(val) {
        localStorage.setItem('norsk-payment-link', val.trim());
      }

      // ── Approve a pending request ─────────────────────────────────────────────────
      async function approveUser(uid, duration) {
        const card = document.getElementById('req-' + uid) || document.getElementById('rej-' + uid);
        if (card) card.style.opacity = '0.5';
        try {
          const reqDoc = await _db.collection('accessRequests').doc(uid).get();
          const d = reqDoc.data();
          const durKey = ACCESS_DURATIONS[duration] ? duration : 'forever';
          const ms = ACCESS_DURATIONS[durKey].ms;
          await Promise.all([
            _db.collection('accessList').doc(uid).set({
              email:       d.email,
              displayName: d.displayName || '',
              photoURL:    d.photoURL    || '',
              grantedAt:   firebase.firestore.FieldValue.serverTimestamp(),
              status:      'active',
              duration:    durKey,
              expiresAt:   ms ? firebase.firestore.Timestamp.fromMillis(Date.now() + ms) : null
            }),
            _db.collection('accessRequests').doc(uid).update({ status: 'approved' })
          ]);
          showToast('&#10003; Access granted to ' + d.email);
          renderAdmin();
        } catch (e) {
          showToast('Error: ' + e.message);
          if (card) card.style.opacity = '';
        }
      }

      // ── Change an active user's access duration ────────────────────────────────────
      async function updateAccessDuration(uid, duration) {
        const durKey = ACCESS_DURATIONS[duration] ? duration : 'forever';
        const ms = ACCESS_DURATIONS[durKey].ms;
        try {
          await _db.collection('accessList').doc(uid).update({
            duration:  durKey,
            expiresAt: ms ? firebase.firestore.Timestamp.fromMillis(Date.now() + ms) : null
          });
          showToast('&#10003; Duration updated');
          renderAdmin();
        } catch (e) {
          showToast('Error: ' + e.message);
        }
      }

      // ── Reject a pending request ──────────────────────────────────────────────────
      async function rejectUser(uid) {
        const card = document.getElementById('req-' + uid);
        if (card) card.style.opacity = '0.5';
        try {
          await _db.collection('accessRequests').doc(uid).update({ status: 'rejected' });
          showToast('Request rejected.');
          renderAdmin();
        } catch (e) {
          showToast('Error: ' + e.message);
          if (card) card.style.opacity = '';
        }
      }

      // ── Revoke an active user ─────────────────────────────────────────────────────
      async function revokeAccess(uid) {
        const card = document.getElementById('usr-' + uid);
        if (card) card.style.opacity = '0.5';
        try {
          await _db.collection('accessList').doc(uid).update({ status: 'revoked' });
          showToast('Access revoked.');
          renderAdmin();
        } catch (e) {
          showToast('Error: ' + e.message);
          if (card) card.style.opacity = '';
        }
      }

      // ── Restore a revoked user ────────────────────────────────────────────────────
      async function restoreAccess(uid, duration) {
        try {
          const durKey = ACCESS_DURATIONS[duration] ? duration : 'forever';
          const ms = ACCESS_DURATIONS[durKey].ms;
          await _db.collection('accessList').doc(uid).update({
            status:    'active',
            duration:  durKey,
            expiresAt: ms ? firebase.firestore.Timestamp.fromMillis(Date.now() + ms) : null
          });
          showToast('Access restored.');
          renderAdmin();
        } catch (e) {
          showToast('Error: ' + e.message);
        }
      }

      // ── Restore a rejected request back to pending ────────────────────────────────
      async function restoreRequestToPending(uid) {
        const card = document.getElementById('rej-' + uid);
        if (card) card.style.opacity = '0.5';
        try {
          await _db.collection('accessRequests').doc(uid).update({ status: 'pending' });
          showToast('Request moved back to pending.');
          renderAdmin();
        } catch (e) {
          showToast('Error: ' + e.message);
          if (card) card.style.opacity = '';
        }
      }

      // ── Delete a request doc entirely (pending or rejected) ────────────────────────
      // Removing the doc lets the user submit a brand-new request from scratch.
      async function deleteAccessRequest(uid) {
        if (!confirm('Delete this request? The user will be able to request access again from scratch.')) return;
        const card = document.getElementById('req-' + uid) || document.getElementById('rej-' + uid);
        if (card) card.style.opacity = '0.3';
        try {
          await _db.collection('accessRequests').doc(uid).delete();
          showToast('Request deleted.');
          renderAdmin();
        } catch (e) {
          showToast('Error: ' + e.message);
          if (card) card.style.opacity = '';
        }
      }

      // ── Delete an access-list grant entirely (revoked users) ────────────────────────
      async function deleteAccessGrant(uid) {
        if (!confirm('Delete this access record? The user will be able to request access again from scratch.')) return;
        const card = document.getElementById('usr-' + uid);
        if (card) card.style.opacity = '0.3';
        try {
          await _db.collection('accessList').doc(uid).delete();
          showToast('Access record deleted.');
          renderAdmin();
        } catch (e) {
          showToast('Error: ' + e.message);
          if (card) card.style.opacity = '';
        }
      }
